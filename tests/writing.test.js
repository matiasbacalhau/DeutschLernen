import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gradeWriting, check } from '../js/core/checks/writing.js';
import { checkExercise } from '../js/core/checks/index.js';
import { enqueue, processQueue } from '../js/services/languagetool.js';

const realMap = JSON.parse(readFileSync(new URL('../data/lt-map.json', import.meta.url)));

// Forma de la respuesta de LanguageTool local (de-DE), recortada a lo necesario.
const m = (id, cat, offset, length, message = '', replacements = []) => ({
  message, shortMessage: '', replacements: replacements.map(value => ({value})), offset, length,
  rule: {id, description: '', category: {id: cat, name: ''}},
});
// "Ich habe zum Schule gegangen."
const SCHULE = [
  m('HILFSVERB_HABEN_SEIN', 'GRAMMAR', 4, 4, 'Bitte prüfen Sie, ob eine Form des Hilfsverbs ‚sein‘ verwendet werden muss.', ['bin']),
  m('ZUM_FEM_NOMEN', 'GRAMMAR', 9, 3, 'Meinten Sie „zur“?', ['zur']),
];
// "Ich glaube, das er morgen kommt."
const DASS = [m('RELATIVPRONOMEN_STATT_DASS', 'CONFUSED_WORDS', 12, 3, 'Meinten Sie „dass“ (Konjunktion)?', ['dass'])];
// "Ich habe einen Hund..."
const STYLE = [m('AUSLASSUNGSPUNKTE_LEERZEICHEN', 'TYPOGRAPHY', 19, 3, 'Vor Auslassungspunkten ...', [' …'])];

const ltMap = {
  rules: {
    HILFSVERB_HABEN_SEIN: {tag: 'a1.perfekt.hilfsverb', es: 'Regla del auxiliar.'},
    ZUM_FEM_NOMEN: {tag: 'a1.nom.fem', es: 'Regla de la contracción.'},
    DE_AGREEMENT: {tag: 'a1.nom.fem', es: 'Regla de la concordancia.'},
  },
  categories: {CONFUSED_WORDS: 'palabras fáciles de confundir', TYPOGRAPHY: 'tipografía'},
  notice_categories: ['TYPOGRAPHY', 'STYLE'],
};

test('Schule: dos marcas de error con los textos del lt-map y dos penalizaciones', () => {
  const g = gradeWriting(SCHULE, realMap);
  assert.equal(g.ok, false);
  assert.deepEqual(g.marks.map(x => [x.offset, x.length, x.kind]), [[4, 4, 'error'], [9, 3, 'error']]);
  assert.equal(g.marks[0].text, realMap.rules.HILFSVERB_HABEN_SEIN.es);
  assert.equal(g.marks[1].text, realMap.rules.ZUM_FEM_NOMEN.es);
  assert.deepEqual(g.penalties, [{tag: 'a1.perfekt.hilfsverb'}, {tag: 'a1.nom.fem'}]);
});

test('regla sin mapear: texto de la categoría, sin penalización y sin delatar la forma', () => {
  const g = gradeWriting(DASS, ltMap);
  assert.equal(g.ok, false);
  assert.equal(g.marks.length, 1);
  assert.equal(g.marks[0].text, 'palabras fáciles de confundir');
  assert.ok(!JSON.stringify(g.marks).includes('dass'));
  assert.deepEqual(g.penalties, []);
});

test('regla y categoría sin mapear: "otro error"', () => {
  const g = gradeWriting([m('X_RULE', 'NEW_CAT', 0, 3, 'Meinten Sie „dass“?', ['dass'])], ltMap);
  assert.equal(g.marks[0].text, 'otro error');
  assert.equal(g.ok, false);
});

test('el texto de la marca nunca sale del mensaje ni de los reemplazos, aunque la regla esté mapeada', () => {
  const g = gradeWriting(SCHULE, ltMap);
  const all = JSON.stringify(g.marks);
  for (const bad of ['bin', 'zur', 'Meinten', 'Hilfsverb']) assert.ok(!all.includes(bad), bad);
});

test('solo estilo: ok con una marca notice', () => {
  const g = gradeWriting(STYLE, ltMap);
  assert.equal(g.ok, true);
  assert.deepEqual(g.marks.map(x => [x.kind, x.text]), [['notice', 'tipografía']]);
  assert.deepEqual(g.penalties, []);
});

test('categoría de aviso desconocida: texto "estilo"', () => {
  const g = gradeWriting([m('S', 'STYLE', 0, 2, 'msg', ['x'])], ltMap);
  assert.deepEqual(g.marks.map(x => [x.kind, x.text]), [['notice', 'estilo']]);
  assert.equal(g.ok, true);
});

test('aviso más un error: no es ok', () => {
  const g = gradeWriting([...STYLE, ...SCHULE], ltMap);
  assert.equal(g.ok, false);
  assert.equal(g.marks.length, 3);
});

test('dos errores del mismo tag: una sola penalización', () => {
  const g = gradeWriting([m('ZUM_FEM_NOMEN', 'GRAMMAR', 0, 3), m('DE_AGREEMENT', 'GRAMMAR', 10, 8)], ltMap);
  assert.equal(g.marks.length, 2);
  assert.deepEqual(g.penalties, [{tag: 'a1.nom.fem'}]);
});

test('regla mapeada sin tag: marca con su texto, sin penalización', () => {
  const g = gradeWriting([m('R', 'GRAMMAR', 0, 1)], {rules: {R: {es: 'Regla sin tag.'}}, categories: {}, notice_categories: []});
  assert.equal(g.marks[0].text, 'Regla sin tag.');
  assert.deepEqual(g.penalties, []);
});

test('sin coincidencias: ok y vacío', () => {
  assert.deepEqual(gradeWriting([], ltMap), {ok: true, marks: [], penalties: []});
});

test('check: Result con key del ejercicio, tag null y ltRules', async () => {
  const ex = {id: 'w1', type: 'writing-guided'};
  const lt = {check: async text => { assert.equal(text, 'Ich habe zum Schule gegangen.'); return [...SCHULE, ...DASS]; }};
  const res = await check(ex, {text: 'Ich habe zum Schule gegangen.'}, {lt, ltMap});
  assert.equal(res.length, 1);
  const r = res[0];
  assert.equal(r.key, 'w1');
  assert.equal(r.tag, null);
  assert.equal(r.ok, false);
  assert.equal(r.marks.length, 3);
  assert.deepEqual(r.penalties, [{tag: 'a1.perfekt.hilfsverb'}, {tag: 'a1.nom.fem'}]);
  assert.deepEqual(r.ltRules, [
    {rule: 'HILFSVERB_HABEN_SEIN', mapped: true},
    {rule: 'ZUM_FEM_NOMEN', mapped: true},
    {rule: 'RELATIVPRONOMEN_STATT_DASS', mapped: false},
  ]);
});

test('check: texto sin errores es ok', async () => {
  const [r] = await check({id: 'w2', type: 'writing-free'}, {text: 'Ich habe einen Hund.'}, {lt: {check: async () => []}, ltMap});
  assert.equal(r.ok, true);
  assert.equal(r.pending, undefined);
});

test('fallo de red → pendiente', async () => {
  const lt = {check: async () => { throw new Error('offline'); }};
  const [r] = await check({id: 'w3', type: 'writing-free'}, {text: 'Hallo.'}, {lt, ltMap});
  assert.equal(r.pending, true);
  assert.equal(r.ok, false);
  assert.equal(r.key, 'w3');
});

test('checkExercise despacha writing-guided y writing-free', async () => {
  const ctx = {lt: {check: async () => []}, ltMap};
  for (const type of ['writing-guided', 'writing-free']) {
    const res = await checkExercise({id: 'w', type}, {text: 'Hallo.'}, ctx);
    assert.equal(res[0].ok, true);
  }
});

const memStore = () => {
  const d = {};
  return {d, get: async k => d[k], set: async (k, v) => { d[k] = v; }};
};

test('enqueue agrega a ltQueue conservando el orden', async () => {
  const s = memStore();
  await enqueue(s, {key: 'a', groupId: 'g', text: 'uno', at: 1});
  await enqueue(s, {key: 'b', groupId: 'g', text: 'dos', at: 2});
  assert.deepEqual(s.d.ltQueue.map(e => e.key), ['a', 'b']);
});

test('processQueue: corta en el primer fallo y deja el resto en la cola', async () => {
  const s = memStore();
  await enqueue(s, {key: 'a', groupId: 'g', text: 'uno', at: 1});
  await enqueue(s, {key: 'b', groupId: 'g', text: 'dos', at: 2});
  const ltCheck = async text => { if (text === 'dos') throw new Error('offline'); return SCHULE; };
  const done = await processQueue(s, ltCheck);
  assert.equal(done.length, 1);
  assert.equal(done[0].key, 'a');
  assert.deepEqual(done[0].matches, SCHULE);
  assert.deepEqual(s.d.ltQueue.map(e => e.key), ['b']);
});

test('processQueue: cola vacía o inexistente devuelve []', async () => {
  assert.deepEqual(await processQueue(memStore(), async () => []), []);
});

test('STYLE real (lt-map): solo aviso, la escritura sigue ok', () => {
  const g = gradeWriting([m('ALGO_DE_ESTILO', 'STYLE', 0, 4, 'msg', ['x'])], realMap);
  assert.equal(g.ok, true);
  assert.deepEqual(g.marks.map(x => [x.kind, x.text]), [['notice', 'estilo']]);
});

test('OBJECT_AGREEMENT está mapeada sin tag y sin delatar la forma', () => {
  const g = gradeWriting([m('OBJECT_AGREEMENT', 'GRAMMAR', 11, 10, 'Prüfen Sie ...', ['einen Kaffee'])], realMap);
  assert.equal(g.ok, false);
  assert.deepEqual(g.penalties, []);
  assert.ok(!g.marks[0].text.includes('einen'));
  assert.notEqual(g.marks[0].text, 'gramática');
});

test('el es de ningún lt-map nombra signos ni formas concretas de puntuación', () => {
  for (const r of Object.values(realMap.rules)) assert.ok(!/interrogaci|mayúscula|coma\b/i.test(r.es.replace(/Regla de la coma antes de und\/oder/, '')), r.es);
});

test('processQueue: lo encolado durante la espera no se pierde', async () => {
  const s = memStore();
  await enqueue(s, {key: 'a', groupId: 'g', text: 'uno', at: 1});
  const ltCheck = async () => { await enqueue(s, {key: 'n', groupId: 'g', text: 'nuevo', at: 3}); return []; };
  const done = await processQueue(s, ltCheck);
  assert.deepEqual(done.map(e => e.key), ['a']);
  assert.deepEqual(s.d.ltQueue.map(e => e.key), ['n']);
});
