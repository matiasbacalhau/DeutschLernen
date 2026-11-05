import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkExercise } from '../js/core/checks/index.js';
import { makeCard } from '../js/core/cards.js';

const lexicon = JSON.parse(readFileSync(new URL('../data/lexicon.json', import.meta.url)));
const L = [
  {lemma: 'Schlüssel', pos: 'noun', article: 'der', es: 'llave', field: 'hostel'},
  {lemma: 'See', pos: 'noun', article: 'der', es: 'lago', field: 'naturaleza'},
  {lemma: 'See', pos: 'noun', article: 'die', es: 'mar', field: 'naturaleza'},
  {lemma: 'Bett', pos: 'noun', article: 'das', es: 'cama', field: 'hostel'},
  {lemma: 'Zimmer', pos: 'noun', article: 'das', es: 'cuarto', field: 'hostel'},
  {lemma: 'Tisch', pos: 'noun', article: 'der', es: 'mesa', field: 'casa'},
  {lemma: 'gehen', pos: 'verb', es: 'ir', field: 'verbos'},
];
const ctx = {curriculum: {tags: {}}, lexicon: L};
const seeded = () => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const card = (lemma, rung, mode = 'read') => makeCard(L.find((w) => w.lemma === lemma), {rung, mode, lexicon: L, rng: seeded()});
const run = (ex, answer) => checkExercise(ex, answer, ctx).then(([r]) => r);

test('makeCard: forma del ejercicio', () => {
  const ex = card('Schlüssel', 1, 'listen');
  assert.equal(ex.id, 'card:Schlüssel:1:listen');
  assert.deepEqual([ex.type, ex.review, ex.vocab], ['card', true, {lemma: 'Schlüssel', rung: 1, mode: 'listen'}]);
  assert.equal(card('Schlüssel', 2).options, undefined);
});

test('makeCard nivel 1: 4 opciones distintas, una correcta, determinista', () => {
  const ex = card('Schlüssel', 1);
  assert.equal(new Set(ex.options.map((o) => o.text)).size, 4);
  assert.equal(ex.options.filter((o) => o.correct).length, 1);
  assert.equal(ex.options.find((o) => o.correct).text, 'llave');
  assert.deepEqual(card('Schlüssel', 1).options, ex.options);
});

test('makeCard nivel 1: el mismo campo va primero y con el léxico real hay 4 distintas', () => {
  const ex = card('Schlüssel', 1);
  assert.deepEqual(ex.options.map((o) => o.text).filter((t) => ['cama', 'cuarto'].includes(t)).sort(), ['cama', 'cuarto']);
  const real = lexicon.find((w) => w.lemma === 'Schlüssel');
  const r = makeCard(real, {rung: 1, mode: 'read', lexicon, rng: Math.random});
  assert.equal(new Set(r.options.map((o) => o.text)).size, 4);
  assert.equal(r.options.filter((o) => o.correct).length, 1);
});

test('nivel 1: índice correcto e incorrecto, sin tag', async () => {
  const ex = card('Schlüssel', 1);
  const good = ex.options.findIndex((o) => o.correct);
  const ok = await run(ex, good);
  assert.deepEqual([ok.key, ok.ok, ok.tag, ok.review], [ex.id, true, null, false]);
  const bad = await run(ex, (good + 1) % 4);
  assert.deepEqual([bad.ok, bad.tag], [false, null]);
  assert.ok(!bad.rule.includes('llave'));
});

test('nivel 2: acepta der Schlüssel y der schlüssel (con aviso), rechaza die Schlüssel', async () => {
  const ex = card('Schlüssel', 2);
  assert.deepEqual([(await run(ex, 'der Schlüssel')).ok, (await run(ex, 'der Schlüssel')).notice], [true, null]);
  const low = await run(ex, 'der schlüssel');
  assert.deepEqual([low.ok, low.notice], [true, 'ojo: mayúscula']);
  const bad = await run(ex, 'die Schlüssel');
  assert.deepEqual([bad.ok, bad.tag], [false, null]);
  assert.ok(!/Schlüssel/.test(bad.rule) && !/\bder\b/.test(bad.rule));
});

test('nivel 2: un lema con der y die acepta las dos; el verbo, el infinitivo', async () => {
  const see = card('See', 2);
  assert.ok((await run(see, 'der See')).ok && (await run(see, 'die See')).ok);
  assert.ok(!(await run(see, 'das See')).ok);
  const verb = card('gehen', 2);
  assert.ok((await run(verb, 'gehen')).ok);
  assert.ok(!(await run(verb, 'geht')).ok);
});

test('UI: sin síntesis de voz el modo listen no agrega nodos null', async () => {
  // DOM mínimo: alcanza para que h() arme elementos y registre los hijos que recibe append.
  const mk = (tag) => ({tag, children: [], append(...c) { this.children.push(...c); }, setAttribute() {}, addEventListener() {}, querySelectorAll: () => []});
  globalThis.document = {createElement: mk};
  globalThis.window = {};
  const {render} = await import('../js/exercises/card.js');
  const el = mk('div');
  render(card('Schlüssel', 1, 'listen'), el, {submit() {}});
  assert.ok(el.children.length > 0 && el.children.every((c) => c !== null && typeof c === 'object'));
  delete globalThis.document; delete globalThis.window;
});
