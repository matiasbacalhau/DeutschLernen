// Handler del Worker: recibe {text, provider?} desde la app, pide la corrección al proveedor y devuelve marcas validadas.
// Logs: una línea por decisión y una de resumen por request, todas con traceId. Nunca el texto ni la respuesta cruda del modelo.
import { buildPrompt } from './prompt.js';
import { validate } from './validate.js';
import { recategorize } from './genders.js';

const MAX_TEXT = 2000;
const RATE = {max: 20, windowMs: 60_000};

// deps: {catalog, nouns (genders.js: nounIndex del léxico), providers: {[name]: {key, correct}}, log(level, msg, fields), hits: Map (rate limit por IP)}.
export async function handle(request, env, {catalog, nouns, providers, log, hits}) {
  const traceId = request.headers.get('cf-ray') ?? crypto.randomUUID();
  const origin = request.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const cors = allowed.includes(origin) ? {'access-control-allow-origin': origin, vary: 'origin'} : {};
  const reply = (status, body) => new Response(body == null ? null : JSON.stringify(body), {status, headers: {...cors, 'content-type': 'application/json'}});
  const reject = (status, reason, fields = {}) => {
    log('warn', 'request rejected', {traceId, reason, status, ...fields});
    return reply(status, {error: reason, traceId});
  };

  if (!cors['access-control-allow-origin']) return reject(403, 'origin', {origin}); // un origen es una URL, no un dato personal: sirve para revisar ALLOWED_ORIGINS
  if (request.method === 'OPTIONS') {
    return new Response(null, {status: 204, headers: {...cors, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400'}});
  }
  if (request.method !== 'POST') return reject(405, 'method', {method: request.method});
  if (limited(hits, request.headers.get('cf-connecting-ip') ?? 'unknown', Date.now())) return reject(429, 'rate_limited');

  let body;
  try { body = await request.json(); } catch { body = null; }
  if (typeof body?.text !== 'string') return reject(400, 'bad_body');
  if (body.text.length > MAX_TEXT) return reject(413, 'too_long', {chars: body.text.length});
  const name = body.provider ?? env.PROVIDER ?? 'claude';
  const provider = Object.hasOwn(providers, name) ? providers[name] : null;
  if (!provider) return reject(400, 'unknown_provider');
  if (!env[provider.key]) return reject(503, 'provider_not_configured', {provider: name});

  const started = Date.now();
  let out;
  try {
    out = await provider.correct(buildPrompt(body.text, catalog), env);
  } catch (e) {
    // Sin e.message: el de un JSON.parse fallido puede citar la respuesta del modelo, y con ella el texto del usuario.
    log('warn', 'provider failed', {traceId, provider: name, status: e.status ?? null, stopReason: e.stopReason ?? null, error: e.name, ms: Date.now() - started});
    return reply(502, {error: 'provider_failed', traceId});
  }
  const errors = (out.errors ?? []).map(e => recategorize(e, nouns));
  const recategorized = errors.filter((e, i) => e.category !== out.errors[i].category).length;
  const {marks, dropped} = validate(body.text, errors, catalog);
  if (Object.keys(dropped).length) log('warn', 'marks dropped', {traceId, provider: name, model: out.model, dropped});
  const version = env.CF_VERSION_METADATA?.id ?? 'dev';
  log('info', 'grammar corrected', {traceId, provider: name, model: out.model, version, chars: body.text.length, marks: marks.length, recategorized, ms: Date.now() - started});
  return reply(200, {provider: name, model: out.model, version, traceId, marks});
}

// Ventana fija por IP, en memoria del isolate: alcanza para una app de un usuario. El tope de gasto real lo pone la consola del proveedor.
function limited(hits, ip, now) {
  const h = hits.get(ip);
  if (!h || now - h.start >= RATE.windowMs) {
    if (hits.size > 1000) hits.clear();
    hits.set(ip, {start: now, n: 1});
    return false;
  }
  h.n += 1;
  return h.n > RATE.max;
}
