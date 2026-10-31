// Persistencia en IndexedDB: un almacén clave → valor. "meta" guarda schemaVersion, firstUseAt y lastBackupAt.
import { SCHEMA_VERSION, migrate, makeBackup, parseBackup } from './backup.js';

const DB_NAME = 'aleman';
const STORE = 'kv';
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

async function run(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    const result = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(result?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const get = key => run('readonly', s => s.get(key));
export const set = (key, value) => run('readwrite', s => { s.put(value, key); });
// Varias claves en una sola transacción: o se guardan todas o ninguna.
export const setMany = entries => run('readwrite', s => { for (const [k, v] of Object.entries(entries)) s.put(v, k); });

// Lee `keys`, calcula con fn (síncrona: {clave: valor} → {clave: valor nuevo}) y guarda lo que devuelve,
// todo en una sola transacción: ninguna otra escritura se mete entre la lectura y el guardado.
export async function update(keys, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite');
    const s = tx.objectStore(STORE);
    const vals = {};
    let left = keys.length;
    let out;
    for (const k of keys) {
      const req = s.get(k);
      req.onsuccess = () => {
        vals[k] = req.result;
        if (--left) return;
        try {
          out = fn(vals);
        } catch (e) {
          tx.abort();
          reject(e);
          return;
        }
        for (const [key, v] of Object.entries(out)) s.put(v, key);
      };
    }
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
  });
}

async function readAll() {
  const d = await db();
  return new Promise((resolve, reject) => {
    const s = d.transaction(STORE).objectStore(STORE);
    const keys = s.getAllKeys();
    const values = s.getAll();
    values.onsuccess = () => resolve(Object.fromEntries(keys.result.map((k, i) => [k, values.result[i]])));
    values.onerror = () => reject(values.error);
  });
}

function replaceAll(data) {
  return run('readwrite', s => {
    s.clear();
    for (const [k, v] of Object.entries(data)) s.put(v, k);
  });
}

// Al arrancar: crea "meta" la primera vez y migra si los datos son de una versión anterior.
export async function init(now = Date.now()) {
  const meta = await get('meta');
  if (!meta) return set('meta', { schemaVersion: SCHEMA_VERSION, firstUseAt: now });
  if (meta.schemaVersion < SCHEMA_VERSION) return replaceAll(migrate(await readAll(), meta.schemaVersion));
}

export async function exportAll(now = Date.now()) {
  return JSON.stringify(makeBackup(await readAll(), now), null, 2);
}

export async function importAll(text) {
  await replaceAll(parseBackup(text));
}

export async function markBackup(now = Date.now()) {
  await set('meta', { ...(await get('meta')), lastBackupAt: now });
}

export async function requestPersist() {
  if (!navigator.storage?.persist) return false;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}
