// Tarjetas de vocabulario (spec §4). Puro: el azar entra por `rng` (() => [0,1)).
import { dueLemmas } from './srs.js';
import { tagUnlocked } from './scheduler.js';
import { instancesOf } from './generators/index.js';
import { present } from './morph.js';
import { countItems } from './checks/index.js';
import { itemInfo, containsAnswer } from './runner.js';
import { pickDictation, revealing } from './dictation.js';

function shuffled(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 3 traducciones distintas de otras palabras: primero del mismo campo, luego de la misma clase, luego cualquiera.
function distractors(word, lexicon, rng) {
  const others = lexicon.filter((w) => w.lemma !== word.lemma);
  const seen = new Set([word.es]);
  const out = [];
  for (const pool of [others.filter((w) => w.field === word.field), others.filter((w) => w.pos === word.pos), others]) {
    for (const w of shuffled(pool, rng)) {
      if (out.length === 3) return out;
      if (!seen.has(w.es)) { seen.add(w.es); out.push(w.es); }
    }
  }
  return out;
}

// Ejercicio de tarjeta: nivel 1 elige la traducción entre 4; nivel 2 no tiene opciones (se escribe).
export function makeCard(word, {rung, mode, lexicon, rng}) {
  const ex = {
    id: `card:${word.lemma}:${rung}:${mode}`, type: 'card', rung, mode, lemma: word.lemma, word,
    review: true, vocab: {lemma: word.lemma, rung, mode},
  };
  if (rung === 1) {
    ex.options = shuffled([{text: word.es, correct: true}, ...distractors(word, lexicon, rng).map((text) => ({text}))], rng);
  }
  return ex;
}

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

// Hueco de nivel 3: un gap generado de siempre (cuenta para el mastery de su tag) que además repasa la palabra.
const asLevel3 = (ex, lemma) => ({...ex, id: `card3:${ex.id}`, review: true, vocab: {lemma, rung: 3, mode: 'read'}});

// Sustantivo: una plantilla de artículos con lugar para el lema; si ninguna sirve, la genérica de Nominativ (`card_only`).
function nounGap(word, templates, usable, rng) {
  const from = (tpls) => tpls.flatMap((t) => instancesOf(t, [word])).filter((e) => usable(e.tag));
  const articles = templates.filter((t) => !t.kind);
  const regular = from(articles.filter((t) => !t.card_only));
  const pool = regular.length ? regular : from(articles.filter((t) => t.card_only));
  return pool.length ? asLevel3(pick(pool, rng), word.lemma) : null;
}

// Sin *sie*/*Sie* sueltos: serían ambiguos (ella, ellos o usted), como en sein-praesens.js.
const SUBJECTS = {ich: 'Ich', du: 'Du', er: 'Er', wir: 'Wir', ihr: 'Ihr', sie: 'Tom und Lea'};
const PERSONS = Object.keys(SUBJECTS);

// Verbo: forma conjugada en contexto (spec §4). *sein* cuenta para a1.sein.praesens; en los demás, la persona con
// forma irregular cuenta para a1.praesens.irregular.
function verbGap(word, usable, rng) {
  const tagOf = (p) => (word.lemma === 'sein' ? 'a1.sein.praesens'
    : word.irregular?.[p] !== undefined ? 'a1.praesens.irregular' : 'a1.praesens.regular');
  const persons = PERSONS.filter((p) => usable(tagOf(p)));
  if (!persons.length) return null;
  const person = pick(persons, rng);
  return asLevel3({
    id: `verb:${word.lemma}`, type: 'gap', tag: tagOf(person), context: 'Conjugá el verbo entre paréntesis.',
    text: `${SUBJECTS[person]} ___ (${word.lemma}) …`, answers: present(word, person), dims: {person}, verb: word.lemma,
  }, word.lemma);
}

// ¿Algún ítem de `exercises` evalúa el artículo o la forma de `word`? (regla 1) Un verbo, también por sus formas conjugadas.
export function evaluatedBy(exercises) {
  const nouns = new Set();
  const answers = [];
  for (const ex of exercises) {
    for (const x of [ex, ...(ex.gaps ?? [])]) if (x.noun) nouns.add(x.noun);
    for (let n = 0; n < countItems(ex); n++) answers.push(...(itemInfo(ex, `${ex.id}#${n}`).answers ?? []));
  }
  const forms = (word) => (word.pos === 'verb' ? [word.lemma, ...PERSONS.flatMap((p) => present(word, p))] : [word.lemma]);
  return (word) => nouns.has(word.lemma)
    || forms(word).some((f) => answers.some((a) => typeof a === 'string' && containsAnswer(a, f)));
}

// Tarjetas para un grupo (spec §5.2): las vencidas, la más atrasada primero, hasta `max`.
// - Nivel 1–2: `card`. Nivel 3: hueco generado con `vocab`; un verbo sin el presente desbloqueado sigue en nivel 2.
// - Ningún sustantivo si el tema esconde el artículo; ningún lema que evalúe otro ítem del grupo; ningún nivel 3
//   con tag bloqueado o del tema del grupo.
// - Escuchando solo con `audio` y la escucha habilitada en ese nivel, alternando al azar con leyendo. Nivel 3
//   escuchando es un dictado de `pool` con la palabra (sin ninguno que sirva, sale leyendo); ninguna tarjeta
//   posterior repasa otra palabra de esa frase (regla 1).
export function pickCards(srs, {now, rng, lexicon, templates, topic, groupExercises = [], mastery, curriculum, audio, pool = [], max = 3}) {
  const hidesArticle = (topic.hides ?? []).includes('article');
  const evaluated = evaluatedBy(groupExercises);
  const usable = (tag) => !topic.tags.includes(tag) && tagUnlocked(tag, mastery, curriculum);
  const out = [];
  for (const lemma of dueLemmas(srs, now)) {
    if (out.length >= max) break;
    const word = lexicon.find((w) => w.lemma === lemma);
    if (!word || (word.pos === 'noun' && hidesArticle) || evaluated(word)) continue;
    if (out.some((c) => c.type === 'dictation' && c.lemmas.includes(lemma))) continue;
    const entry = srs[lemma];
    let rung = entry.rung;
    if (rung === 3 && word.pos === 'verb' && !tagUnlocked('a1.praesens.regular', mastery, curriculum)) rung = 2;
    let ex = null;
    if (rung === 3 && audio && entry.listenUnlocked?.[3] && rng() < 0.5) {
      const reveals = revealing([...groupExercises, ...out]);
      const d = pickDictation(pool, srs, {rng, exclude: (e) => !e.lemmas.includes(lemma) || reveals(e)});
      if (d) ex = {...d, vocab: {lemma, rung: 3, mode: 'listen'}};
    }
    if (!ex && rung === 3) ex = word.pos === 'verb' ? verbGap(word, usable, rng) : nounGap(word, templates, usable, rng);
    else if (!ex) {
      const mode = audio && entry.listenUnlocked?.[rung] && rng() < 0.5 ? 'listen' : 'read';
      ex = makeCard(word, {rung, mode, lexicon, rng});
    }
    if (ex) out.push(ex);
  }
  return out;
}

// Un ejercicio con audio sin audio (spec §6.3): la tarjeta de escucha pasa a su variante de lectura, la situación se ve
// con texto; el dictado (suelto o de nivel 3) no tiene variante barata: null = saltearlo. Sin audio, el mismo ejercicio.
export function withoutAudio(ex, {lexicon, rng}) {
  if (ex.type === 'card' && ex.mode === 'listen') return makeCard(ex.word, {rung: ex.rung, mode: 'read', lexicon, rng});
  if (ex.type === 'situation' && ex.listen) return {...ex, listen: false};
  if (ex.type === 'dictation') return null;
  return ex;
}
