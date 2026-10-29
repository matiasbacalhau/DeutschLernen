// Formato del backup, migraciones y recordatorio. Lógica pura: no toca IndexedDB ni el DOM.
export const APP_ID = 'deutschlernen';
export const SCHEMA_VERSION = 1;

// migrations[n] convierte los datos de la versión n − 1 a la n.
const migrations = {};

const DAY = 86_400_000;

export function migrate(data, from) {
  if (from > SCHEMA_VERSION) {
    throw new Error(`El backup es de una versión más nueva de la app (${from}). Actualizá la app primero.`);
  }
  let out = data;
  for (let v = from + 1; v <= SCHEMA_VERSION; v++) out = migrations[v](out);
  return { ...out, meta: { ...out.meta, schemaVersion: SCHEMA_VERSION } };
}

export function makeBackup(data, now) {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date(now).toISOString(), data };
}

export function parseBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (backup?.app !== APP_ID) throw new Error('El archivo no es un backup de esta app.');
  if (!Number.isInteger(backup.schemaVersion) || backup.schemaVersion < 1) {
    throw new Error('El backup no tiene una versión válida.');
  }
  if (typeof backup.data !== 'object' || backup.data === null || Array.isArray(backup.data)) {
    throw new Error('El backup no tiene datos.');
  }
  return migrate(backup.data, backup.schemaVersion);
}

// Recordatorio cada `days` días, contando desde el último backup o, si nunca hubo, desde el primer uso.
export function needsBackupReminder(meta, now, days = 7) {
  const since = meta?.lastBackupAt ?? meta?.firstUseAt;
  return since != null && now - since >= days * DAY;
}
