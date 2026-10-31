// Cliente de la API pública de LanguageTool. El texto se envía a sus servidores.
// Límites de la API pública: 20 requests/min, 20 KB por request.
const API = 'https://api.languagetool.org/v2/check';

// Con mala señal (subte, wifi cautivo) el fetch puede colgarse: a los `timeout` ms se aborta y la escritura queda pendiente.
export async function check(text, { language = 'de-DE', timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(API, { method: 'POST', body: new URLSearchParams({ text, language }), signal: ctrl.signal });
    if (!res.ok) throw new Error(`LanguageTool respondió ${res.status}.`);
    return (await res.json()).matches;
  } finally {
    clearTimeout(timer);
  }
}

// Cola offline: las escrituras sin red quedan en el store (clave ltQueue) hasta que vuelva la conexión.
const QUEUE = 'ltQueue';

export async function enqueue(store, entry) {
  const queue = (await store.get(QUEUE)) ?? [];
  await store.set(QUEUE, [...queue, entry]);
}

// Corrige en orden; corta en el primer fallo de red. NO toca la cola: el que llama aplica los resultados y guarda
// remainingQueue(...) en la misma transacción, así un corte no deja un intento pendiente sin penalización ni aviso.
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
  return resolved;
}

// La cola sin las resueltas (por key+at). Relee el store: lo encolado mientras se esperaba a LanguageTool no se pierde.
export async function remainingQueue(store, resolved) {
  const done = new Set(resolved.map(e => `${e.key}\u0000${e.at}`));
  return ((await store.get(QUEUE)) ?? []).filter(e => !done.has(`${e.key}\u0000${e.at}`));
}
