import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickCards, makeCard, cardReveal, withoutAudio } from '../js/core/cards.js';
import { addWords } from '../js/core/srs.js';

const load = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url)));
const lexicon = load('lexicon.json');
const templates = load('templates.json');
const curriculum = load('curriculum.json');

const T0 = Date.UTC(2026, 10, 5);
const seeded = (s = 7) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const known = (m) => ({m, n: 3, last: T0});
const mastery = (tags) => ({tags: Object.fromEntries(Object.entries(tags).map(([t, m]) => [t, known(m)])), pairs: {}});
const topic = {topic: 't', tags: ['a1.sein.praesens'], hides: []};

// Lemas en la SRS, cada uno agregado un minuto después del anterior (el primero es el más atrasado); `rung` opcional.
function srsOf(lemmas, extra = {}) {
  let srs = {};
  lemmas.forEach((l, i) => { srs = addWords(srs, [l], T0 + i * 60_000); });
  for (const [l, e] of Object.entries(extra)) srs[l] = {...srs[l], ...e};
  return srs;
}
const NOW = T0 + 86_400_000;
const opts = (o = {}) => ({now: NOW, rng: seeded(), lexicon, templates, topic, groupExercises: [], mastery: mastery({}), curriculum, audio: true, ...o});

test('pickCards: sin vencidas, ninguna; con 5 vencidas, las 3 más atrasadas', () => {
  assert.deepEqual(pickCards(srsOf(['Bett']), opts({now: T0 - 1})), []);
  const srs = srsOf(['Bett', 'Zimmer', 'Schlüssel', 'Dusche', 'Gast']);
  const out = pickCards(srs, opts());
  assert.deepEqual(out.map((e) => e.vocab.lemma), ['Bett', 'Zimmer', 'Schlüssel']);
  assert.ok(out.every((e) => e.type === 'card' && e.review && e.rung === 1));
});

test('pickCards: tema con hides article → ningún sustantivo; sí verbos', () => {
  const srs = srsOf(['Bett', 'wohnen', 'Zimmer']);
  const out = pickCards(srs, opts({topic: {...topic, hides: ['article']}}));
  assert.deepEqual(out.map((e) => e.vocab.lemma), ['wohnen']);
});

test('pickCards: un lema que evalúa otro ítem del grupo queda afuera (noun o respuesta)', () => {
  const srs = srsOf(['Bett', 'Zimmer', 'Dusche']);
  const groupExercises = [
    {id: 'g1', type: 'gap', tag: 'a1.nom.neut', noun: 'Bett', answers: ['das']},
    {id: 's1', type: 'situation', gaps: [{tag: 'x', answers: ['die Dusche']}]},
  ];
  const out = pickCards(srs, opts({groupExercises}));
  assert.deepEqual(out.map((e) => e.vocab.lemma), ['Zimmer']);
});

test('pickCards nivel 3 de un sustantivo: Akkusativ si está desbloqueado, si no Nominativ, si no nada', () => {
  // Löffel (kueche) entra en las plantillas de Akkusativ; Schlüssel (hostel) solo en la de Nominativ.
  const srs = srsOf(['Löffel', 'Schlüssel'], {Löffel: {rung: 3}, Schlüssel: {rung: 3}});
  const akk = pickCards(srs, opts({mastery: mastery({'a1.nom.mask': 0.7, 'a1.akk.mask': 0.3})}));
  assert.equal(akk.length, 2);
  assert.equal(akk[0].tag, 'a1.akk.mask');
  assert.equal(akk[1].tag, 'a1.nom.mask');
  for (const e of akk) {
    assert.equal(e.type, 'gap');
    assert.equal(e.review, true);
    assert.ok(e.id.startsWith('card3:'));
    assert.deepEqual(e.vocab, {lemma: e.noun, rung: 3, mode: 'read'});
  }
  assert.match(akk[1].text, /^Schau mal, hier ist ___ Schlüssel!$/);
  assert.deepEqual(akk[1].answers, ['der']);

  const nom = pickCards(srs, opts({mastery: mastery({'a1.nom.mask': 0.7})}));
  assert.deepEqual(nom.map((e) => e.tag), ['a1.nom.mask', 'a1.nom.mask']);
  assert.deepEqual(pickCards(srs, opts()), []);
});

test('pickCards nivel 3: si el tag es del tema del grupo, no entra', () => {
  const srs = srsOf(['Schlüssel'], {Schlüssel: {rung: 3}});
  const m = mastery({'a1.nom.mask': 0.7});
  assert.equal(pickCards(srs, opts({mastery: m})).length, 1);
  assert.deepEqual(pickCards(srs, opts({mastery: m, topic: {...topic, tags: ['a1.nom.mask']}})), []);
});

test('pickCards nivel 3 de un verbo: hueco con present() si el presente está desbloqueado; si no, tarjeta de nivel 2', () => {
  const srs = srsOf(['wohnen'], {wohnen: {rung: 3}});
  const m = mastery({'a1.pron.personal': 0.8, 'a1.praesens.regular': 0.5});
  const [gap] = pickCards(srs, opts({mastery: m}));
  assert.equal(gap.type, 'gap');
  assert.equal(gap.generated, true);
  assert.equal(gap.tag, 'a1.praesens.regular');
  assert.match(gap.text, /^(Ich|Du|Er|Wir|Ihr|Tom und Lea) ___ \(wohnen\) …$/);
  assert.ok(['wohne', 'wohnst', 'wohnt', 'wohnen'].includes(gap.answers[0]));
  assert.deepEqual(gap.vocab, {lemma: 'wohnen', rung: 3, mode: 'read'});
  const [card] = pickCards(srs, opts());
  assert.deepEqual([card.type, card.rung, card.vocab.rung], ['card', 2, 2]);
});

test('pickCards: sin audio nunca escuchando; con audio, solo en niveles con la escucha habilitada', () => {
  const unlocked = {listenUnlocked: {1: true, 2: true}};
  const srs = srsOf(['Bett', 'Zimmer', 'Schlüssel'], {Bett: unlocked, Zimmer: {...unlocked, rung: 2}});
  const modes = (audio) => Array.from({length: 40}, (_, s) => pickCards(srs, opts({audio, rng: seeded(s * 7919 + 13)}))).flat();
  assert.ok(modes(false).every((e) => e.vocab.mode === 'read'));
  const withAudio = modes(true);
  assert.ok(withAudio.some((e) => e.vocab.mode === 'listen'));
  assert.ok(withAudio.some((e) => e.vocab.lemma === 'Bett' && e.vocab.mode === 'read'));
  assert.ok(withAudio.filter((e) => e.vocab.lemma === 'Schlüssel').every((e) => e.vocab.mode === 'read'));
});

test('pickCards nivel 3 de un verbo: nunca un "Sie" suelto (ambiguo); la tercera del plural es "Tom und Lea"', () => {
  const srs = srsOf(['wohnen'], {wohnen: {rung: 3}});
  const m = mastery({'a1.pron.personal': 0.8, 'a1.praesens.regular': 0.5});
  const gaps = Array.from({length: 60}, (_, s) => pickCards(srs, opts({mastery: m, rng: seeded(s * 7919 + 13)}))[0]);
  assert.ok(gaps.every((g) => !g.text.startsWith('Sie ')));
  const plural = gaps.find((g) => g.dims.person === 'sie');
  assert.ok(plural);
  assert.equal(plural.text, 'Tom und Lea ___ (wohnen) …');
  assert.deepEqual(plural.answers, ['wohnen']);
});

test('pickCards nivel 3 de sein: tag a1.sein.praesens, que queda afuera en los grupos de ese tema', () => {
  const srs = srsOf(['sein'], {sein: {rung: 3}});
  const m = mastery({'a1.pron.personal': 0.8, 'a1.praesens.regular': 0.5, 'a1.sein.praesens': 0.5});
  const [gap] = pickCards(srs, opts({mastery: m, topic: {...topic, tags: []}}));
  assert.equal(gap.tag, 'a1.sein.praesens');
  assert.deepEqual(pickCards(srs, opts({mastery: m, topic: {...topic, tags: ['a1.sein.praesens']}})), []);
});

test('pickCards: un verbo cuya forma conjugada evalúa otro ítem del grupo queda afuera', () => {
  const srs = srsOf(['sein', 'wohnen']);
  const groupExercises = [{id: 'g1', type: 'gap', tag: 'a1.sein.praesens', answers: ['bin']}];
  assert.deepEqual(pickCards(srs, opts({groupExercises})).map((e) => e.vocab.lemma), ['wohnen']);
  const wohnt = [{id: 's1', type: 'situation', gaps: [{tag: 'x', answers: ['wohnt']}]}];
  assert.deepEqual(pickCards(srs, opts({groupExercises: wohnt})).map((e) => e.vocab.lemma), ['sein']);
});

test('pickCards: una palabra del glosario no sale, ni en el dictado de nivel 3 de otra palabra', () => {
  const srs = srsOf(['Bett', 'Zimmer', 'Dusche']);
  assert.deepEqual(pickCards(srs, opts({glossary: ['Bett']})).map((e) => e.vocab.lemma), ['Zimmer', 'Dusche']);
  const s3 = srsOf(['Dusche'], {Dusche: {rung: 3, listenUnlocked: {3: true}}});
  const pool = [{text: 'Das Bett und die Dusche.', lemmas: ['Bett', 'Dusche']}];
  for (let s = 1; s < 20; s++) {
    const [ex] = pickCards(s3, opts({glossary: ['Bett'], pool, rng: seeded(s)}));
    assert.notEqual(ex?.type, 'dictation');
  }
});

test('makeCard nivel 1: un sustantivo nunca lleva distractores de verbos si hay sustantivos de sobra', () => {
  const posOf = new Map();
  for (const w of lexicon) posOf.set(w.es, [...(posOf.get(w.es) ?? []), w.pos]);
  const nouns = lexicon.filter((w) => w.pos === 'noun');
  for (const word of nouns) {
    for (let s = 1; s < 6; s++) {
      const ex = makeCard(word, {rung: 1, mode: 'read', lexicon, rng: seeded(s)});
      for (const o of ex.options.filter((x) => !x.correct)) assert.ok(posOf.get(o.text).includes('noun'), `${word.lemma}: ${o.text}`);
    }
  }
});

test('cardReveal: imagen y etiqueta solo tras acertar, en los dos niveles', () => {
  const noun = {lemma: 'Schlüssel', article: 'der', es: 'llave', pos: 'noun', image: '1F511'};
  const verb = {lemma: 'wohnen', es: 'vivir', pos: 'verb'};
  const ok = [{ok: true}];
  const bad = [{ok: false}];
  assert.deepEqual(cardReveal({type: 'card', rung: 1, word: noun}, ok), {picture: true, de: 'der Schlüssel', label: 'der Schlüssel · llave'});
  assert.deepEqual(cardReveal({type: 'card', rung: 2, word: noun}, ok), {picture: true, de: 'der Schlüssel', label: 'der Schlüssel · llave'});
  assert.deepEqual(cardReveal({type: 'card', rung: 1, word: verb}, ok), {picture: true, de: 'wohnen', label: 'wohnen · vivir'});
  for (const rung of [1, 2]) assert.deepEqual(cardReveal({type: 'card', rung, word: noun}, bad), {picture: false, de: null, label: null});
});

test('withoutAudio: la situación de escucha se saltea (null), como el dictado', () => {
  assert.equal(withoutAudio({id: 's', type: 'situation', listen: true}, {lexicon}), null);
  const seen = {id: 's', type: 'situation'};
  assert.equal(withoutAudio(seen, {lexicon}), seen);
});
