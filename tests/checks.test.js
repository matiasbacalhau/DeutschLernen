import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installCheck, persistCheck, dbCheck, offlineCheck, voicesCheck, speakCheck, ltCheck } from '../js/core/checks.js';

test('instalación: dice si la app está abierta desde el ícono', () => {
  assert.deepEqual(installCheck(true), { ok: true, text: 'sí' });
  assert.deepEqual(installCheck(false), { ok: false, text: 'no (abierta en el navegador)' });
});

test('almacenamiento persistente: usa persisted() y tolera que no exista', async () => {
  assert.deepEqual(await persistCheck({ persisted: async () => true }), { ok: true, text: 'sí' });
  assert.deepEqual(await persistCheck({ persisted: async () => false }), { ok: false, text: 'no' });
  assert.deepEqual(await persistCheck(undefined), { ok: false, text: 'no' });
});

test('base de datos: guarda y lee un valor de prueba', async () => {
  const data = {};
  const store = { set: async (k, v) => { data[k] = v; }, get: async k => data[k] };
  assert.deepEqual(await dbCheck(store, 42), { ok: true, text: 'funciona' });
  assert.equal(data.probe, 42);
});

test('base de datos: avisa si no devuelve lo guardado o si falla', async () => {
  const forgetful = { set: async () => {}, get: async () => undefined };
  assert.deepEqual(await dbCheck(forgetful, 42), { ok: false, text: 'no devuelve lo guardado' });
  const broken = { set: async () => { throw new Error('sin IndexedDB'); } };
  assert.deepEqual(await dbCheck(broken, 42), { ok: false, text: 'sin IndexedDB' });
});

test('modo avión: lista solo con service worker activo y la app en caché', () => {
  assert.deepEqual(offlineCheck(true, true), { ok: true, text: 'lista' });
  assert.deepEqual(offlineCheck(true, false), { ok: false, text: 'todavía no (recargá una vez)' });
  assert.deepEqual(offlineCheck(false, true), { ok: false, text: 'todavía no (recargá una vez)' });
});

test('voces: cuenta las alemanas o dice por qué no hay', () => {
  assert.deepEqual(voicesCheck(true, [{}, {}]), { ok: true, text: '2 voz/voces' });
  assert.deepEqual(voicesCheck(true, []), { ok: false, text: 'no hay voces alemanas' });
  assert.deepEqual(voicesCheck(false, []), { ok: false, text: 'este navegador no tiene síntesis de voz' });
});

test('escuchar: nombra la voz usada, también al fallar', async () => {
  const anna = { name: 'Anna' };
  assert.deepEqual(await speakCheck(async () => {}, anna), { ok: true, text: 'suena (Anna)' });
  assert.deepEqual(await speakCheck(async () => {}, undefined), { ok: true, text: 'suena (predeterminada)' });
  const fail = async () => { throw new Error('synthesis-failed'); };
  assert.deepEqual(await speakCheck(fail, anna), { ok: false, text: 'error con Anna: synthesis-failed' });
  assert.deepEqual(await speakCheck(fail, undefined), { ok: false, text: 'error con la predeterminada: synthesis-failed' });
});

test('escuchar: pide la frase de prueba con la voz elegida', async () => {
  let call;
  const anna = { name: 'Anna' };
  await speakCheck(async (text, opts) => { call = { text, opts }; }, anna);
  assert.deepEqual(call, { text: 'Guten Tag! Ich lerne Deutsch.', opts: { rate: 0.9, voice: anna } });
});

test('LanguageTool: tiene que detectar el error de la frase de prueba', async () => {
  let sent;
  const found = async text => { sent = text; return [{}]; };
  assert.deepEqual(await ltCheck(found), { ok: true, text: 'responde (1 error detectado)' });
  assert.equal(sent, 'Ich habe ein Fehler gemacht.');
  assert.deepEqual(await ltCheck(async () => []), { ok: false, text: 'responde, pero no detectó el error' });
  const offline = async () => { throw new Error('Failed to fetch'); };
  assert.deepEqual(await ltCheck(offline), { ok: false, text: 'bloqueado o sin red: Failed to fetch' });
});
