// Dictado (spec §6.1): frases cortas del contenido ya controlado y elección de una para el grupo.
// Puro: el azar entra por `rng` (() => [0,1)).
import { instancesOf } from './generators/index.js';
import { countItems } from './checks/index.js';
import { itemInfo, containsAnswer } from './runner.js';
import { present } from './morph.js';

const MAX_WORDS = 8;
const PERSONS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
const words = (s) => String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

// Las formas de una palabra en las frases: lema y plural en sustantivos; presente en verbos (salvo *sein*, cuyas formas
// supletivas aparecen en casi toda frase y no muestran la raíz del infinitivo).
export const wordForms = (w) => (w.pos === 'verb' && w.lemma !== 'sein'
  ? [...new Set([w.lemma, ...PERSONS.flatMap((p) => present(w, p))])]
  : w.plural ? [w.lemma, w.plural] : [w.lemma]);

// Las frases de cada ejercicio que pueden dictarse tal cual: sin huecos.
function sentencesOf(ex) {
  switch (ex.type) {
    case 'transform': return ex.answers;
    case 'translate': return ex.from === 'de' ? [] : ex.answers; // desde el alemán, la respuesta no es alemán
    case 'detective': return ex.sentences.map((s) => s.de);
    case 'situation': return ex.bubbles.map((b) => b.text);
    default: return [];
  }
}

// Una instancia de generador con el hueco relleno con su primera respuesta.
const filled = (e) => e.text.replace('___', e.answers[0]);

// Los lemas del léxico cuya forma (lema, plural o presente verbal) aparece como palabra en `text` (sin distinguir mayúsculas).
export function lemmasIn(text, lexicon) {
  const set = new Set(words(text));
  return [...new Set(lexicon.filter((w) => wordForms(w).some((f) => set.has(f.toLowerCase()))).map((w) => w.lemma))];
}

// [{text, lemmas, cardOnly?}]: frases de hasta 8 palabras sin `___`, sin repetir: todas las respuestas aceptadas de
// `transform`/`translate`, frases del detective, burbujas, ejemplos del currículo (si se pasa) e instancias de los
// generadores rellenadas. `cardOnly`: la frase sale solo de una plantilla `card_only` (sirve para el dictado de
// nivel 3 de su palabra, no para el dictado suelto).
export function dictationPool(units, templates, lexicon, curriculum) {
  const texts = [];
  for (const unit of Object.values(units)) {
    for (const t of unit.topics) {
      if (t.draft) continue;
      for (const s of t.steps ?? []) for (const ex of s.exercises) texts.push(...sentencesOf(ex));
    }
  }
  for (const tag of Object.values(curriculum?.tags ?? {})) texts.push(...(tag.examples ?? []).map((e) => e.de));
  for (const tpl of templates.filter((t) => !t.card_only)) texts.push(...instancesOf(tpl, lexicon).map(filled));
  const cardOnly = templates.filter((t) => t.card_only).flatMap((tpl) => instancesOf(tpl, lexicon).map(filled));
  const out = [];
  const seen = new Set();
  const add = (text, extra) => {
    if (typeof text !== 'string' || text.includes('___') || seen.has(text)) return;
    const ws = words(text);
    if (!ws.length || ws.length > MAX_WORDS) return;
    seen.add(text);
    out.push({text, lemmas: lemmasIn(text, lexicon), ...extra});
  };
  for (const text of texts) add(text, {});
  for (const text of cardOnly) add(text, {cardOnly: true});
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
