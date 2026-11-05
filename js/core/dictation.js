// Dictado (spec §6.1): frases cortas del contenido ya controlado y elección de una para el grupo.
// Puro: el azar entra por `rng` (() => [0,1)).
import { instancesOf } from './generators/index.js';
import { countItems } from './checks/index.js';
import { itemInfo, containsAnswer } from './runner.js';

const MAX_WORDS = 8;
const words = (s) => String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

// Las frases de cada ejercicio que pueden dictarse tal cual: sin huecos.
function sentencesOf(ex) {
  switch (ex.type) {
    case 'transform': return ex.answers.slice(0, 1);
    case 'translate': return ex.from === 'de' ? [] : ex.answers.slice(0, 1); // desde el alemán, la respuesta no es alemán
    case 'detective': return ex.sentences.map((s) => s.de);
    case 'situation': return ex.bubbles.map((b) => b.text);
    default: return [];
  }
}

// Una instancia de generador con el hueco relleno con su primera respuesta.
const filled = (e) => e.text.replace('___', e.answers[0]);

// [{text, lemmas}]: frases de hasta 8 palabras sin `___`, sin repetir. `lemmas`: los del léxico cuyo lema o plural
// aparece como palabra (sin distinguir mayúsculas).
export function dictationPool(units, templates, lexicon) {
  const texts = [];
  for (const unit of Object.values(units)) {
    for (const t of unit.topics) {
      if (t.draft) continue;
      for (const s of t.steps ?? []) for (const ex of s.exercises) texts.push(...sentencesOf(ex));
    }
  }
  for (const tpl of templates) texts.push(...instancesOf(tpl, lexicon).map(filled));
  const out = [];
  const seen = new Set();
  for (const text of texts) {
    const ws = words(text);
    if (text.includes('___') || !ws.length || ws.length > MAX_WORDS || seen.has(text)) continue;
    seen.add(text);
    const set = new Set(ws);
    const lemmas = [...new Set(lexicon.filter((w) => set.has(w.lemma.toLowerCase()) || (w.plural && set.has(w.plural.toLowerCase()))).map((w) => w.lemma))];
    out.push({text, lemmas});
  }
  return out;
}

const learning = (srs, lemma) => [1, 2].includes(srs[lemma]?.rung);

// Una frase del pool para dictar; primero las que tienen palabras en aprendizaje (nivel 1–2). `exclude(entry)`
// descarta frases (regla 1). El id es la posición en el pool.
export function pickDictation(pool, srs, {rng, exclude = () => false}) {
  const cands = pool.map((e, n) => ({e, n})).filter(({e}) => !exclude(e));
  const preferred = cands.filter(({e}) => e.lemmas.some((l) => learning(srs, l)));
  const from = preferred.length ? preferred : cands;
  if (!from.length) return null;
  const {e, n} = from[Math.floor(rng() * from.length)];
  return {id: `dict:${n}`, type: 'dictation', text: e.text, lemmas: e.lemmas, review: true};
}

// Regla 1: descarta las frases que contienen la respuesta de algún ítem de `exercises` o una palabra que repasa
// una tarjeta de ellos (`vocab`): el audio y el texto original la mostrarían.
export function revealing(exercises) {
  const answers = [];
  const lemmas = new Set();
  for (const ex of exercises) {
    if (ex.vocab) lemmas.add(ex.vocab.lemma);
    for (let n = 0; n < countItems(ex); n++) answers.push(...(itemInfo(ex, `${ex.id}#${n}`).answers ?? []).filter((a) => typeof a === 'string'));
  }
  return (entry) => entry.lemmas.some((l) => lemmas.has(l)) || answers.some((a) => containsAnswer(entry.text, a));
}
