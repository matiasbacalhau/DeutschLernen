import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildExtras, pickListening } from '../js/core/extras.js';
import { buildGroup } from '../js/core/progress.js';
import { dictationPool } from '../js/core/dictation.js';
import { addWords } from '../js/core/srs.js';

const load = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url)));
const lexicon = load('lexicon.json');
const templates = load('templates.json');
const curriculum = load('curriculum.json');
const unit = load('levels/a1/unit-01.json');
const units = {'a1.u01': unit};

const T0 = Date.UTC(2026, 10, 5);
const NOW = T0 + 86_400_000;
// LCG con la semilla dispersada: así las primeras tiradas de semillas seguidas no quedan todas juntas.
const seeded = (seed = 7) => { let s = Math.imul(seed, 0x9e3779b1) >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const empty = {steps: {}};
const noMastery = {tags: {}, pairs: {}};

function srsOf(lemmas, extra = {}) {
  let srs = {};
  lemmas.forEach((l, i) => { srs = addWords(srs, [l], T0 + i * 60_000); });
  for (const l of Object.keys(srs)) srs[l] = {...srs[l], ...extra};
  return srs;
}
const DUE5 = ['Bett', 'Zimmer', 'Schlüssel', 'Dusche', 'Gast'];
const pool = [{text: 'Das ist gut.', lemmas: []}];
const main = [{id: 'm1', type: 'gap', tag: 'a1.sein.praesens', text: 'Ich ___ da.', answers: ['xyz']}, {id: 'm2', type: 'gap', tag: 'a1.sein.praesens', text: 'Du ___ da.', answers: ['xyz']}];
const groupAt = (step, topic = 'a1.u1.t1') => ({id: 'g', topic, step, exercises: main, index: 0, results: [], committed: 0, startedAt: NOW});
const opts = (o = {}) => ({srs: srsOf(DUE5), now: NOW, rng: seeded(), unit, units, progress: empty, lexicon, templates,
  mastery: noMastery, curriculum, pool, audio: true, ...o});
const extrasOf = (g) => g.exercises.filter((e) => !main.includes(e));

test('buildExtras: con 5 vencidas en el escalón 3, exactamente 4 extras (3 tarjetas y 1 de escucha)', () => {
  for (let s = 1; s < 15; s++) {
    const g = buildExtras(groupAt(3), opts({rng: seeded(s)}));
    const extra = extrasOf(g);
    assert.equal(extra.length, 4);
    assert.equal(extra.filter((e) => e.type === 'card').length, 3);
    assert.equal(extra.filter((e) => e.type === 'dictation').length, 1);
    assert.ok(extra.every((e) => e.review));
    // El orden del grupo se mantiene.
    assert.deepEqual(g.exercises.filter((e) => main.includes(e)), main);
  }
});

test('buildExtras: con audio false no hay escucha ni tarjetas escuchando', () => {
  const srs = srsOf(DUE5, {listenUnlocked: {1: true}});
  for (let s = 1; s < 15; s++) {
    const extra = extrasOf(buildExtras(groupAt(3), opts({srs, audio: false, rng: seeded(s)})));
    assert.equal(extra.length, 3);
    assert.ok(extra.every((e) => e.type === 'card' && e.mode === 'read'));
  }
});

test('buildExtras: el escalón 5 no suma nada; el 1 solo tarjetas', () => {
  const g5 = groupAt(5);
  assert.equal(buildExtras(g5, opts()), g5);
  const extra = extrasOf(buildExtras(groupAt(1), opts()));
  assert.equal(extra.length, 3);
  assert.ok(extra.every((e) => e.type === 'card'));
});

test('buildExtras: sin vencidas ni frases, la escucha sale de una situación vista', () => {
  const progress = {steps: {'a1.u1.t1/3': {attempts: [], seen: {'t1-3-sit-mia': 50}}}};
  const extra = extrasOf(buildExtras(groupAt(2, 'a1.u1.t2'), opts({srs: {}, pool: [], progress})));
  assert.equal(extra.length, 1);
  assert.equal(extra[0].id, 't1-3-sit-mia');
  assert.equal(extra[0].listen, true);
});

test('buildExtras: el dictado no contiene la respuesta de otro ítem ni una palabra de las tarjetas (regla 1)', () => {
  const p = [{text: 'Wir sind da.', lemmas: []}, {text: 'Das Bett ist gut.', lemmas: ['Bett']}, {text: 'Das ist gut.', lemmas: []}];
  const withAnswer = [{...main[0], answers: ['sind']}];
  for (let s = 1; s < 15; s++) {
    const g = buildExtras({...groupAt(3), exercises: withAnswer}, opts({rng: seeded(s), pool: p}));
    assert.deepEqual(g.exercises.filter((e) => e.type === 'dictation').map((e) => e.text), ['Das ist gut.']);
  }
});

test('buildExtras: el dictado suelto nunca es de una plantilla card_only', () => {
  const p = [{text: 'Schau mal, hier ist der Stuhl!', lemmas: ['Stuhl'], cardOnly: true}, {text: 'Das ist gut.', lemmas: []}];
  for (let s = 1; s < 15; s++) {
    const g = buildExtras(groupAt(3), opts({srs: {}, rng: seeded(s), pool: p}));
    assert.deepEqual(g.exercises.filter((e) => e.type === 'dictation').map((e) => e.text), ['Das ist gut.']);
  }
  assert.equal(extrasOf(buildExtras(groupAt(3), opts({srs: {}, pool: [p[0]]}))).length, 0);
  // Con el pool real y palabras en aprendizaje, ninguna frase de tpl-nom-hier.
  const real = dictationPool(units, templates, lexicon, curriculum);
  for (let s = 1; s < 40; s++) {
    const g = buildExtras(groupAt(3), opts({srs: srsOf(['Stuhl', 'Dusche', 'Kissen', 'Heizung'], {card: {...srsOf(['x']).x.card, due: NOW + 1}}), rng: seeded(s), pool: real}));
    for (const e of g.exercises.filter((x) => x.type === 'dictation')) assert.doesNotMatch(e.text, /^Schau mal, hier ist/);
  }
});

test('buildExtras: la situación de escucha no muestra lo que evalúa otro ítem ni las palabras de las tarjetas (regla 1)', () => {
  const sitOf = (g) => g.exercises.filter((e) => e.type === 'situation').map((e) => e.id);
  const seen = (a, b) => ({steps: {'a1.u1.t1/3': {attempts: [], seen: {[a]: 10, [b]: 50}}}});
  const t3 = (exercises) => ({...groupAt(2, 'a1.u1.t3'), exercises});
  // Sin conflicto, la vista hace más tiempo.
  assert.deepEqual(sitOf(buildExtras(t3(main), opts({srs: {}, pool: [], progress: seen('t1-3-sit-schnarchen', 't1-3-sit-mia')}))), ['t1-3-sit-schnarchen']);
  // Una burbuja contiene la respuesta de otro ítem del grupo (*Hast du Ohrstöpsel?*).
  const answer = [{...main[0], answers: ['Ohrstöpsel']}];
  assert.deepEqual(sitOf(buildExtras(t3(answer), opts({srs: {}, pool: [], progress: seen('t1-3-sit-schnarchen', 't1-3-sit-mia')}))), ['t1-3-sit-mia']);
  // Una burbuja muestra la palabra de una tarjeta (*Bett*).
  for (let s = 1; s < 10; s++) {
    const g = buildExtras(t3(main), opts({srs: srsOf(['Bett']), rng: seeded(s), pool: [], progress: seen('t1-3-sit-mia', 't1-3-sit-schnarchen')}));
    assert.deepEqual(sitOf(g), ['t1-3-sit-schnarchen']);
  }
  // Un hueco evalúa una forma del verbo de una tarjeta (*bin*, de *sein*).
  for (let s = 1; s < 10; s++) {
    const g = buildExtras(t3(main), opts({srs: srsOf(['sein']), rng: seeded(s), pool: [], progress: seen('t1-3-sit-schnarchen', 't1-3-sit-mia')}));
    assert.ok(g.exercises.some((e) => e.vocab?.lemma === 'sein'));
    assert.deepEqual(sitOf(g), ['t1-3-sit-mia']);
  }
});

test('pickListening: sin situaciones vistas → null', () => {
  assert.equal(pickListening(units, empty, 'a1.u1.t2'), null);
});

test('pickListening: la vista hace más tiempo, del tema o de uno anterior; review si es de otro tema', () => {
  const progress = {steps: {
    'a1.u1.t1/3': {attempts: [], seen: {'t1-3-sit-mia': 50, 't1-3-sit-tuer': 80}},
    'a1.u1.t2/3': {attempts: [], seen: {'t2-3-sit-ofen': 70}},
    'a1.u1.t3/3': {attempts: [], seen: {'t3-3-sit-wein': 10}},
  }};
  const a = pickListening(units, progress, 'a1.u1.t2');
  assert.equal(a.id, 't1-3-sit-mia');
  assert.equal(a.listen, true);
  assert.equal(a.review, true);
  assert.equal(a.topic, 'a1.u1.t1');
  const b = pickListening(units, {steps: {'a1.u1.t2/3': progress.steps['a1.u1.t2/3']}}, 'a1.u1.t2');
  assert.equal(b.id, 't2-3-sit-ofen');
  assert.equal(b.listen, true);
  assert.ok(!b.review);
  // Nunca de un tema posterior.
  assert.equal(pickListening(units, {steps: {'a1.u1.t3/3': progress.steps['a1.u1.t3/3']}}, 'a1.u1.t2'), null);
});

test('buildGroup: con preferLemmas, los huecos generados de esos lemas van primero', () => {
  const t3 = unit.topics.find((t) => t.topic === 'a1.u1.t3');
  const step = t3.steps.find((s) => s.generated);
  const prefer = new Set(['Wein']);
  const g = buildGroup(unit, t3.topic, step.n, empty, noMastery, {now: NOW, rng: seeded(), templates, lexicon, preferLemmas: prefer});
  const gen = g.exercises.filter((e) => e.generated);
  assert.ok(gen.length > 0);
  assert.ok(gen.every((e) => e.noun === 'Wein'), gen.map((e) => e.noun).join(','));
});

test('buildExtras: las palabras del glosario no salen en las tarjetas ni en el dictado de ese grupo (regla 1)', () => {
  const p = [{text: 'Das Bett ist gut.', lemmas: ['Bett']}, {text: 'Das ist gut.', lemmas: []}];
  const glossary = ['Bett', 'Zimmer', 'Schlüssel'];
  for (let s = 1; s < 15; s++) {
    const g = buildExtras(groupAt(3), opts({rng: seeded(s), pool: p, glossary}));
    const extra = extrasOf(g);
    assert.deepEqual(extra.filter((e) => e.type === 'card').map((e) => e.vocab.lemma), ['Dusche', 'Gast']);
    assert.deepEqual(extra.filter((e) => e.type === 'dictation').map((e) => e.text), ['Das ist gut.']);
  }
  // En el grupo siguiente (sin glosario) vuelven.
  const next = extrasOf(buildExtras(groupAt(2), opts({pool: p})));
  assert.deepEqual(next.filter((e) => e.type === 'card').map((e) => e.vocab.lemma), ['Bett', 'Zimmer', 'Schlüssel']);
});
