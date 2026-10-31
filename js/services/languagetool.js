// Cliente de la API pública de LanguageTool. El texto se envía a sus servidores.
// Límites de la API pública: 20 requests/min, 20 KB por request.
const API = 'https://api.languagetool.org/v2/check';

export async function check(text, { language = 'de-DE' } = {}) {
  const res = await fetch(API, { method: 'POST', body: new URLSearchParams({ text, language }) });
  if (!res.ok) throw new Error(`LanguageTool respondió ${res.status}.`);
  return (await res.json()).matches;
}

// Cola offline: las escrituras sin red quedan en el store (clave ltQueue) hasta que vuelva la conexión.
const QUEUE = 'ltQueue';

export async function enqueue(store, entry) {
  const queue = (await store.get(QUEUE)) ?? [];
  await store.set(QUEUE, [...queue, entry]);
}

// Corrige en orden; corta en el primer fallo de red y deja el resto en la cola.
// Al terminar relee la cola: lo encolado mientras se esperaba a LanguageTool no se pierde.
export async function processQueue(store, ltCheck) {
  const queue = (await store.get(QUEUE)) ?? [];
  const resolved = [];
  for (const entry of queue) {
    try {
      resolved.push({...entry, matches: await ltCheck(entry.text)});
    } catch {
      break;
    }
  }
  const done = new Set(resolved.map(e => `${e.key}\u0000${e.at}`));
  const current = (await store.get(QUEUE)) ?? [];
  await store.set(QUEUE, current.filter(e => !done.has(`${e.key}\u0000${e.at}`)));
  return resolved;
}
