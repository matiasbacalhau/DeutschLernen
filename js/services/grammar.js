// Cliente del corrector de gramática (proxy/, un Cloudflare Worker): marca los errores que LanguageTool deja pasar (casos, artículos, verbos).
// El texto se envía al Worker y de ahí al proveedor (Claude o Gemini). Con API vacía, la app corrige solo con LanguageTool.
// La URL se completa recién cuando el bench (tools/grammar_bench.mjs) da 0 falsos positivos.
const API = 'https://deutschlernen-grammar.matiasbacalhau.workers.dev/';

// Devuelve marcas {offset, length, llm: categoría, src: {provider, model, trace}}. Un error lleva el status HTTP, como en languagetool.js.
// Sin token contra la API por defecto (o ante 401/403 del proxy), degrada a [] para que la app siga con LanguageTool gratis.
export async function check(text, { url = API, token = '', timeout = 15000 } = {}) {
  if (!url || (url === API && !token)) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const payload = token ? { text, token } : { text };
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    if (res.status === 401 || res.status === 403) return [];
    if (!res.ok) throw Object.assign(new Error(`El corrector respondió ${res.status}.`), { status: res.status });
    const { provider, model, traceId, marks } = await res.json();
    return marks.map(m => ({ offset: m.offset, length: m.length, llm: m.category, src: { provider, model, trace: traceId } }));
  } finally {
    clearTimeout(timer);
  }
}

// LanguageTool más el corrector. Si cualquiera falla, falla todo: la escritura queda pendiente y no se corrige a medias.
export const withGrammar = (ltCheck, grammarCheck = check, opts = {}) => async text => {
  const [lt, grammar] = await Promise.all([ltCheck(text), grammarCheck(text, opts)]);
  return [...lt, ...grammar];
};
