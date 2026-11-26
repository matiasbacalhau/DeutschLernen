// Base IndexedDB separada (`aleman-media`) para guardar audios locales sin inflar los backups JSON de `aleman/kv`.
const DB_NAME = 'aleman-media';
const STORE = 'tracks';
let dbPromise;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run(mode, fn) {
  return db().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  }));
}

/** Guarda el archivo de audio asociado a una canción. */
export async function saveTrack(songId, file, { duration = 0 } = {}) {
  const record = {
    blob: file,
    name: file.name ?? `${songId}.audio`,
    type: file.type ?? 'audio/mpeg',
    size: file.size ?? 0,
    duration,
    savedAt: Date.now(),
  };
  await run('readwrite', s => s.put(record, songId));
  return record;
}

/** Lee el registro de audio guardado para `songId`, o null si no existe. */
export async function getTrack(songId) {
  return (await run('readonly', s => s.get(songId))) ?? null;
}

/** Elimina el audio local de `songId`. */
export async function deleteTrack(songId) {
  return run('readwrite', s => s.delete(songId));
}

/** Devuelve el Set de `songId` que ya tienen audio cargado en el dispositivo. */
export async function listTrackIds() {
  const keys = (await run('readonly', s => s.getAllKeys())) ?? [];
  return new Set(keys);
}
