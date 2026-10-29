// Cliente de la API pública de LanguageTool. El texto se envía a sus servidores.
// Límites de la API pública: 20 requests/min, 20 KB por request.
const API = 'https://api.languagetool.org/v2/check';

export async function check(text, { language = 'de-DE' } = {}) {
  const res = await fetch(API, { method: 'POST', body: new URLSearchParams({ text, language }) });
  if (!res.ok) throw new Error(`LanguageTool respondió ${res.status}.`);
  return (await res.json()).matches;
}
