import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dictationPool, pickDictation } from '../js/core/dictation.js';
import { checkExercise } from '../js/core/checks/index.js';
import { applyCommit } from '../js/core/runner.js';
import { pickCards } from '../js/core/cards.js';
import { addWords } from '../js/core/srs.js';

const load = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url)));
const lexicon = load('lexicon.json');
const templates = load('templates.json');
const curriculum = load('curriculum.json');
const units = {'a1.u01': load('levels/a1/unit-01.json')};

// LCG con la semilla dispersada: así las primeras tiradas de semillas seguidas no quedan todas juntas.
const seeded = (seed = 7) => { let s = Math.imul(seed, 0x9e3779b1) >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const words = (s) => s.match(/[\p{L}\p{N}]+/gu) ?? [];

test('dictationPool: frases de hasta 8 palabras, sin huecos, con los lemas que contienen', () => {
  const pool = dictationPool(units, templates, lexicon);
  assert.ok(pool.length > 50);
  for (const e of pool) {
    assert.ok(!e.text.includes('___'), e.text);
    assert.ok(words(e.text).length <= 8, e.text);
  }
  assert.equal(new Set(pool.map((e) => e.text)).size, pool.length, 'sin repetidas');
  // Respuesta de un transform, frase del detective, burbuja sin hueco e instancia de generador rellenada.
  const texts = pool.map((e) => e.text);
  for (const t of ['Tom ist im Etagenbett oben.', 'Ich bin Leo.', 'Hast du Ohrstöpsel?', 'Ich bin heute total müde.']) assert.ok(texts.includes(t), t);
  assert.ok(pool.find((e) => e.text === 'Ich brauche noch einen Löffel für die Küche.').lemmas.includes('Löffel'));
  // El plural también cuenta, sin distinguir mayúsculas.
  const plural = pool.find((e) => /\bStühle\b/.test(e.text));
  assert.ok(plural.lemmas.includes('Stuhl'), plural.text);
});

test('dictationPool: todas las respuestas aceptadas, ejemplos del currículo y card_only marcadas', () => {
  const pool = dictationPool(units, templates, lexicon, curriculum);
  const texts = pool.map((e) => e.text);
  for (const t of ['Tom ist im Etagenbett oben.', 'Tom ist oben im Etagenbett.', 'Oben im Etagenbett ist Tom.', 'Du bist im Hostel.']) assert.ok(texts.includes(t), t);
  assert.equal(new Set(texts).size, texts.length);
  assert.equal(pool.find((e) => e.text === 'Schau mal, hier ist der Schlüssel!').cardOnly, true);
  assert.ok(!pool.find((e) => e.text === 'Ich brauche noch einen Löffel für die Küche.').cardOnly);
  assert.ok(pool.filter((e) => /^Schau mal, hier ist/.test(e.text)).every((e) => e.cardOnly));
});

test('pickDictation: prefiere frases con lemas en nivel 1 o 2; null sin frases', () => {
  const pool = [
    {text: 'Das ist gut.', lemmas: []},
    {text: 'Wir sind im Zimmer.', lemmas: ['Zimmer']},
    {text: 'Hier ist der Schlüssel.', lemmas: ['Schlüssel']},
  ];
  const srs = {...addWords({}, ['Zimmer', 'Schlüssel'], 0)};
  srs.Schlüssel = {...srs.Schlüssel, rung: 3};
  for (let s = 1; s < 20; s++) {
    const d = pickDictation(pool, srs, {rng: seeded(s)});
    assert.deepEqual(d, {id: 'dict:1', type: 'dictation', text: 'Wir sind im Zimmer.', lemmas: ['Zimmer'], review: true});
  }
  assert.equal(pickDictation([], srs, {rng: seeded()}), null);
  assert.equal(pickDictation(pool, srs, {rng: seeded(), exclude: () => true}), null);
  // Sin lemas en aprendizaje, cualquiera.
  assert.ok(pickDictation(pool, {}, {rng: seeded()}));
});

const dict = {id: 'dict:3', type: 'dictation', text: 'Wir sind im Zimmer.', lemmas: ['Zimmer'], review: true};
const ctx = {curriculum, lexicon};

test('check dictation: Zimer subrayado → lemaOk {Zimmer: false}, tag null', async () => {
  const [r] = await checkExercise(dict, 'Wir sind im Zimer', ctx);
  assert.equal(r.key, 'dict:3');
  assert.equal(r.tag, null);
  assert.equal(r.ok, false);
  assert.equal(r.given, 'Wir sind im Zimer');
  assert.deepEqual(r.wrong, [{offset: 12, length: 5}]);
  assert.deepEqual(r.lemmaOk, {Zimmer: false});
});

test('check dictation: acierto (sin mayúsculas, con aviso) y error en otra palabra', async () => {
  const [ok] = await checkExercise(dict, 'wir sind im zimmer', ctx);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.lemmaOk, {Zimmer: true});
  const [other] = await checkExercise(dict, 'Wir sint im Zimmer', ctx);
  assert.equal(other.ok, false);
  assert.deepEqual(other.lemmaOk, {Zimmer: true});
  // Sin escribir la palabra: no está subrayada, pero tampoco está.
  const [missing] = await checkExercise(dict, 'Wir sind im', ctx);
  assert.deepEqual(missing.lemmaOk, {Zimmer: false});
  // El plural cuenta como la palabra.
  const pl = {...dict, text: 'Die Stühle sind neu.', lemmas: ['Stuhl']};
  assert.deepEqual((await checkExercise(pl, 'Die Stühle sint neu', ctx))[0].lemmaOk, {Stuhl: true});
  // Una forma conjugada de un verbo del léxico también cuenta para su lema en el dictado.
  const pool = dictationPool(units, templates, lexicon);
  assert.ok(pool.find((e) => e.text === 'Ich brauche noch einen Löffel für die Küche.').lemmas.includes('brauchen'));
  const vb = {...dict, text: 'Woher kommst du?', lemmas: ['kommen']};
  assert.deepEqual((await checkExercise(vb, 'Woher kommst du', ctx))[0].lemmaOk, {kommen: true});
  assert.deepEqual((await checkExercise(vb, 'Woher komst du', ctx))[0].lemmaOk, {kommen: false});
});

const state = (srs) => ({mastery: {tags: {}, pairs: {}}, log: [], words: {}, progress: {steps: {}}, srs});
const res = (key, ok, lemmaOk) => ({key, tag: null, ok, lemmaOk, ms: 1000, at: 5000});

test('applyCommit: el dictado suelto repasa las vencidas sin cambiar el nivel ni el mastery', () => {
  let srs = addWords({}, ['Zimmer', 'Bett'], 0);
  srs.Zimmer = {...srs.Zimmer, rung: 2};
  srs.Bett = {...srs.Bett, card: {...srs.Bett.card, due: 10_000}}; // no vencida
  const ex = {...dict, lemmas: ['Zimmer', 'Bett']};
  const group = {topic: 't', step: 2, exercises: [ex], results: []};
  const out = applyCommit({group, toApply: [res(ex.id, false, {Zimmer: false, Bett: true})], state: state(srs), quarantine: [], now: 5000});
  assert.equal(out.srs.Zimmer.rung, 2);
  assert.equal(out.srs.Zimmer.card.reps, 1);
  assert.equal(out.srs.Bett.card.reps, 0);
  assert.deepEqual(out.mastery, {tags: {}, pairs: {}});
});

test('applyCommit: el dictado de nivel 3 se juzga por su palabra', () => {
  let srs = addWords({}, ['Zimmer'], 0);
  srs.Zimmer = {...srs.Zimmer, rung: 3};
  const ex = {...dict, vocab: {lemma: 'Zimmer', rung: 3, mode: 'listen'}};
  const group = {topic: 't', step: 2, exercises: [ex], results: []};
  // La frase falló en otra palabra, pero Zimmer está bien: no baja.
  const ok = applyCommit({group, toApply: [res(ex.id, false, {Zimmer: true})], state: state(srs), quarantine: [], now: 5000});
  assert.equal(ok.srs.Zimmer.rung, 3);
  assert.equal(ok.log.at(-1).ok, true);
  const bad = applyCommit({group, toApply: [res(ex.id, false, {Zimmer: false})], state: state(srs), quarantine: [], now: 5000});
  assert.equal(bad.srs.Zimmer.rung, 2);
});

test('pickCards nivel 3 escuchando: dictado con la palabra; sin frase, sale leyendo', () => {
  const T0 = Date.UTC(2026, 10, 5);
  let srs = addWords({}, ['Löffel'], T0);
  srs.Löffel = {...srs.Löffel, rung: 3, listenUnlocked: {3: true}};
  const known = {m: 0.7, n: 3, last: T0};
  const opts = {now: T0 + 86_400_000, lexicon, templates, topic: {topic: 't', tags: ['a1.sein.praesens'], hides: []},
    mastery: {tags: {'a1.akk.mask': known, 'a1.nom.mask': known}, pairs: {}}, curriculum, audio: true};
  const pool = dictationPool(units, templates, lexicon);
  const modes = new Set();
  for (let s = 1; s < 30; s++) {
    const [c] = pickCards(srs, {...opts, rng: seeded(s), pool});
    modes.add(c.vocab.mode);
    if (c.vocab.mode === 'listen') {
      assert.equal(c.type, 'dictation');
      assert.ok(c.lemmas.includes('Löffel'));
      assert.deepEqual(c.vocab, {lemma: 'Löffel', rung: 3, mode: 'listen'});
      assert.equal(c.review, true);
    }
  }
  assert.deepEqual([...modes].sort(), ['listen', 'read']);
  for (let s = 1; s < 10; s++) assert.equal(pickCards(srs, {...opts, rng: seeded(s), pool: []})[0].vocab.mode, 'read');
  for (let s = 1; s < 10; s++) assert.equal(pickCards(srs, {...opts, rng: seeded(s), pool, audio: false})[0].vocab.mode, 'read');
});

test('check dictation: una sola pista; con palabras subrayadas, sin la regla (la da el subrayado)', async () => {
  const [marked] = await checkExercise(dict, 'Wir sind im Zimer', ctx);
  assert.equal(marked.rule, null);
  const [missing] = await checkExercise(dict, 'Wir sind', ctx);
  assert.equal(missing.wrong, undefined);
  assert.equal(missing.rule, 'Compará tu frase con la original.');
});
