import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_ID, SCHEMA_VERSION, makeBackup, parseBackup, migrate, needsBackupReminder } from '../js/core/backup.js';

const DAY = 86_400_000;

test('export → import devuelve los mismos datos', () => {
  const data = { meta: { schemaVersion: SCHEMA_VERSION, firstUseAt: 1 }, settings: { minutes: 15 } };
  const text = JSON.stringify(makeBackup(data, Date.UTC(2026, 9, 29)));
  assert.deepEqual(parseBackup(text), data);
});

test('el backup lleva app, versión y fecha', () => {
  const b = makeBackup({}, Date.UTC(2026, 9, 29));
  assert.equal(b.app, APP_ID);
  assert.equal(b.schemaVersion, SCHEMA_VERSION);
  assert.equal(b.exportedAt, '2026-10-29T00:00:00.000Z');
});

test('rechaza archivos que no son backups válidos', () => {
  assert.throws(() => parseBackup('no es json'), /JSON válido/);
  assert.throws(() => parseBackup('{"app":"otra"}'), /no es un backup/);
  assert.throws(() => parseBackup(JSON.stringify({ app: APP_ID, schemaVersion: 0, data: {} })), /versión válida/);
  assert.throws(() => parseBackup(JSON.stringify({ app: APP_ID, schemaVersion: 1, data: [] })), /no tiene datos/);
});

test('rechaza un backup de una versión más nueva', () => {
  assert.throws(() => migrate({}, SCHEMA_VERSION + 1), /más nueva/);
});

test('migrate deja meta.schemaVersion en la versión actual', () => {
  assert.equal(migrate({ meta: { firstUseAt: 1 } }, SCHEMA_VERSION).meta.schemaVersion, SCHEMA_VERSION);
});

test('recordatorio de backup a los 7 días', () => {
  const now = 100 * DAY;
  assert.equal(needsBackupReminder(undefined, now), false);
  assert.equal(needsBackupReminder({ firstUseAt: now - 6 * DAY }, now), false);
  assert.equal(needsBackupReminder({ firstUseAt: now - 7 * DAY }, now), true);
  assert.equal(needsBackupReminder({ firstUseAt: 0, lastBackupAt: now - DAY }, now), false);
  assert.equal(needsBackupReminder({ firstUseAt: 0, lastBackupAt: now - 8 * DAY }, now), true);
});
