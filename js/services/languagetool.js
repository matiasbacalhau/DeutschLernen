// Cliente de la API pública de LanguageTool. El texto se envía a sus servidores.
// Límites de la API pública: 20 requests/min, 20 KB por request.
const API = 'https://api.languagetool.org/v2/check';

// Con mala señal (subte, wifi cautivo) el fetch puede colgarse: a los `timeout` ms se aborta y la escritura queda pendiente.
export async function check(text, { language = 'de-DE', timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(API, { method: 'POST', body: new URLSearchParams({ text, language }), signal: ctrl.signal });
    if (!res.ok) throw Object.assign(new Error(`LanguageTool respondió ${res.status}.`), { status: res.status });
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

// Corrige en orden; corta en el primer fallo de red (o 429/5xx). Un 4xx que no es 429 no se va a arreglar
// reintentando: esa escritura se saltea (queda en la cola) para no trabar a las demás. NO toca la cola: el que llama aplica los resultados y guarda
// withoutResolved(...) en la misma transacción, así un corte no deja un intento pendiente sin penalización ni aviso.
export async function processQueue(store, ltCheck) {
  const queue = (await store.get(QUEUE)) ?? [];
  const resolved = [];
  for (const entry of queue) {
    try {
      resolved.push({...entry, matches: await ltCheck(entry.text)});
    } catch (e) {
      if (e.status >= 400 && e.status < 500 && e.status !== 429) continue;
      break;
    }
  }
  return resolved;
}

// La cola sin las resueltas (por key+at). Se le pasa la cola releída en la transacción que guarda los resultados:
// lo encolado mientras se esperaba a LanguageTool no se pierde.
export function withoutResolved(queue, resolved) {
  const done = new Set(resolved.map(e => `${e.key}\u0000${e.at}`));
  return (queue ?? []).filter(e => !done.has(`${e.key}\u0000${e.at}`));
}
