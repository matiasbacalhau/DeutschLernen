import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addWords, reviewWord, reviewDue, dueLemmas, isKnown, seedSrs, PROMOTE_DAYS } from '../js/core/srs.js';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 5);

test('addWords agrega en nivel 1 y no pisa una existente', () => {
  let srs = addWords({}, ['Schlüssel', 'Bett'], T0);
  assert.equal(srs.Schlüssel.rung, 1);
  assert.equal(srs.Schlüssel.addedAt, T0);
  assert.deepEqual(srs.Schlüssel.listenUnlocked, {});
  srs = { ...srs, Bett: { ...srs.Bett, rung: 2 } };
  const again = addWords(srs, ['Bett', 'Zimmer'], T0 + DAY);
  assert.equal(again.Bett.rung, 2);
  assert.equal(again.Bett.addedAt, T0);
  assert.equal(again.Zimmer.rung, 1);
});

test('el nivel sube recién con estabilidad >= umbral: 1→2 con 4 días, 2→3 con 10', () => {
  assert.equal(PROMOTE_DAYS[1], 4);
  assert.equal(PROMOTE_DAYS[2], 10);
  let srs = addWords({}, ['Bett'], T0);
  let now = T0;
  const seen = [];
  for (let i = 0; i < 6; i++) {
    now = Math.max(now, srs.Bett.card.due);
    const rung = srs.Bett.rung;
    srs = reviewWord(srs, 'Bett', true, { now, rung, mode: 'read' });
    const { stability } = srs.Bett.card;
    // Sube de a un nivel, y solo si la estabilidad alcanzó el umbral del nivel que se dejó.
    assert.equal(srs.Bett.rung, stability >= (PROMOTE_DAYS[rung] ?? Infinity) ? rung + 1 : rung);
    seen.push(srs.Bett.rung);
  }
  // La primera revisión (estabilidad ~2.3 < 4) no sube; llega a 2 y después a 3.
  assert.equal(seen[0], 1);
  assert.ok(seen.includes(2) && seen.at(-1) === 3);
});

test('error en nivel 3 baja a 2; error en nivel 1 sigue en 1', () => {
  let srs = addWords({}, ['Bett'], T0);
  const bad1 = reviewWord(srs, 'Bett', false, { now: T0, rung: 1, mode: 'read' });
  assert.equal(bad1.Bett.rung, 1);
  srs = { Bett: { ...srs.Bett, rung: 3 } };
  const bad3 = reviewWord(srs, 'Bett', false, { now: T0, rung: 3, mode: 'read' });
  assert.equal(bad3.Bett.rung, 2);
});

test('un acierto leyendo habilita la escucha de ese nivel; escuchando no', () => {
  const srs = addWords({}, ['Bett'], T0);
  assert.deepEqual(reviewWord(srs, 'Bett', true, { now: T0, rung: 1, mode: 'listen' }).Bett.listenUnlocked, {});
  assert.deepEqual(reviewWord(srs, 'Bett', false, { now: T0, rung: 1, mode: 'read' }).Bett.listenUnlocked, {});
  assert.deepEqual(reviewWord(srs, 'Bett', true, { now: T0, rung: 1, mode: 'read' }).Bett.listenUnlocked, { 1: true });
});

test('reviewWord no muta la entrada', () => {
  const srs = addWords({}, ['Bett'], T0);
  const copy = JSON.stringify(srs);
  reviewWord(srs, 'Bett', true, { now: T0, rung: 1, mode: 'read' });
  assert.equal(JSON.stringify(srs), copy);
});

test('reviewDue: no vencida devuelve el mismo objeto; vencida no cambia el nivel', () => {
  let srs = addWords({}, ['Bett'], T0);
  srs = reviewWord(srs, 'Bett', true, { now: T0, rung: 1, mode: 'read' });
  const due = srs.Bett.card.due;
  assert.ok(due > T0);
  assert.equal(reviewDue(srs, 'Bett', true, { now: T0 }), srs);
  assert.equal(reviewDue(srs, 'Fehlt', true, { now: T0 }), srs);
  const after = reviewDue(srs, 'Bett', true, { now: due });
  assert.notEqual(after, srs);
  assert.equal(after.Bett.rung, 1);
  assert.ok(after.Bett.card.reps > srs.Bett.card.reps);
  assert.equal(reviewDue(srs, 'Bett', false, { now: due }).Bett.rung, 1);
});

test('dueLemmas: solo vencidas, la más atrasada primero', () => {
  let srs = addWords({}, ['A', 'B', 'C'], T0);
  srs = {
    A: { ...srs.A, card: { ...srs.A.card, due: T0 - DAY } },
    B: { ...srs.B, card: { ...srs.B.card, due: T0 - 3 * DAY } },
    C: { ...srs.C, card: { ...srs.C.card, due: T0 + DAY } },
  };
  assert.deepEqual(dueLemmas(srs, T0), ['B', 'A']);
});

test('isKnown: nivel 3, o verbo en nivel 2 con estabilidad >= 10', () => {
  const e = (rung, stability) => ({ rung, card: { stability } });
  assert.equal(isKnown(e(3, 1), { pos: 'noun' }), true);
  assert.equal(isKnown(e(2, 20), { pos: 'noun' }), false);
  assert.equal(isKnown(e(2, 10), { pos: 'verb' }), true);
  assert.equal(isKnown(e(2, 9.9), { pos: 'verb' }), false);
  assert.equal(isKnown(e(1, 30), { pos: 'verb' }), false);
});

test('seedSrs: lemas del campo del escalón 3 con intento; idempotente', () => {
  const units = { 'a1.u1': { topics: [{ topic: 'a1.u1.t1', steps: [{ n: 2, field: 'x' }, { n: 3, field: 'hostel' }] }] } };
  const lexicon = [
    { lemma: 'Zimmer', field: 'hostel' }, { lemma: 'Bett', field: 'hostel' }, { lemma: 'Apfel', field: 'food' },
  ];
  const progress = { steps: { 'a1.u1.t1/3': { attempts: [{ at: 1 }], seen: {} } } };
  const once = seedSrs({}, { progress, units, lexicon, now: T0 });
  assert.deepEqual(Object.keys(once).sort(), ['Bett', 'Zimmer']);
  assert.deepEqual(seedSrs(once, { progress, units, lexicon, now: T0 + DAY }), once);
  const none = seedSrs({}, { progress: { steps: { 'a1.u1.t1/3': { attempts: [], seen: {} } } }, units, lexicon, now: T0 });
  assert.deepEqual(none, {});
  assert.deepEqual(seedSrs({}, { progress: { steps: {} }, units, lexicon, now: T0 }), {});
});

test('seedSrs con el contenido real: el campo hostel del tema 1', async () => {
  const { readFile } = await import('node:fs/promises');
  const units = { 'a1.u1': JSON.parse(await readFile('data/levels/a1/unit-01.json', 'utf8')) };
  const lexicon = JSON.parse(await readFile('data/lexicon.json', 'utf8'));
  const srs = seedSrs({}, { progress: { steps: { 'a1.u1.t1/3': { attempts: [{ at: 1 }], seen: {} } } }, units, lexicon, now: T0 });
  const expected = lexicon.filter(w => w.field === 'hostel').map(w => w.lemma);
  assert.ok(expected.length > 0);
  assert.deepEqual(Object.keys(srs).sort(), expected.sort());
});

test('el estado sobrevive a JSON y se puede seguir revisando', () => {
  let srs = addWords({}, ['Bett'], T0);
  srs = reviewWord(srs, 'Bett', true, { now: T0, rung: 1, mode: 'read' });
  const back = JSON.parse(JSON.stringify(srs));
  assert.deepEqual(back, srs);
  const next = reviewWord(back, 'Bett', true, { now: back.Bett.card.due, rung: 1, mode: 'read' });
  assert.equal(next.Bett.card.reps, 2);
  assert.equal(typeof next.Bett.card.due, 'number');
  assert.deepEqual(dueLemmas(back, back.Bett.card.due), ['Bett']);
});
