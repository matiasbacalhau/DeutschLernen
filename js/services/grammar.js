// Cliente del corrector de gramática (proxy/, un Cloudflare Worker): marca los errores que LanguageTool deja pasar (casos, artículos, verbos).
// El texto se envía al Worker y de ahí al proveedor (Claude o Gemini). Con API vacía, la app corrige solo con LanguageTool.
// La URL se completa recién cuando el bench (tools/grammar_bench.mjs) da 0 falsos positivos.
const API = 'https://deutschlernen-grammar.matiasbacalhau.workers.dev/';

// Devuelve marcas {offset, length, llm: categoría, src: {provider, model, trace}}. Un error lleva el status HTTP, como en languagetool.js.
export async function check(text, { url = API, timeout = 15000 } = {}) {
  if (!url) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }), signal: ctrl.signal });
    if (!res.ok) throw Object.assign(new Error(`El corrector respondió ${res.status}.`), { status: res.status });
    const { provider, model, traceId, marks } = await res.json();
    return marks.map(m => ({ offset: m.offset, length: m.length, llm: m.category, src: { provider, model, trace: traceId } }));
  } finally {
    clearTimeout(timer);
  }
}

// LanguageTool más el corrector. Si cualquiera falla, falla todo: la escritura queda pendiente y no se corrige a medias.
export const withGrammar = (ltCheck, grammarCheck = check) => async text => {
  const [lt, grammar] = await Promise.all([ltCheck(text), grammarCheck(text)]);
  return [...lt, ...grammar];
};
