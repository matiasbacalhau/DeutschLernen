// El género de un sustantivo conocido sale del léxico de la app, no del modelo (que a veces lo confunde: "ein Hund" como neutro).
// El modelo dice dónde está el error y de qué tipo (artículo en Akkusativ o en Nominativ); el léxico decide el género.
const GENDER = {der: 'MASK', die: 'FEM', das: 'NEUT'};
const KINDS = ['AKK', 'NOM'];

// lexicon: data/lexicon.json. Devuelve {singular: Map lema → MASK|FEM|NEUT, plural: Set de formas plurales}.
// Un lema con dos géneros (der/die See) queda fuera: ahí no hay una respuesta única.
export function nounIndex(lexicon) {
  const seen = new Map();
  const plural = new Set();
  for (const w of lexicon) {
    if (w.pos !== 'noun' || !GENDER[w.article]) continue;
    seen.set(w.lemma, seen.has(w.lemma) && seen.get(w.lemma) !== GENDER[w.article] ? null : GENDER[w.article]);
    if (w.plural) plural.add(w.plural);
  }
  return {singular: new Map([...seen].filter(([, g]) => g)), plural};
}

// error: {quote, occurrence, category, noun}. Solo cambia categorías AKK_/NOM_ de género o plural.
export function recategorize(error, nouns) {
  const [kind, gender] = String(error.category).split('_');
  if (!nouns || !KINDS.includes(kind) || !['MASK', 'FEM', 'NEUT', 'PLURAL'].includes(gender)) return error;
  const noun = String(error.noun ?? '').trim().split(/\s+/).pop();
  const sing = nouns.singular.get(noun);
  const plural = nouns.plural.has(noun);
  let next;
  if (sing && plural) next = gender === 'PLURAL' ? 'PLURAL' : sing; // Löffel/Zimmer: igual en singular y plural
  else if (sing) next = sing;
  else if (plural) next = 'PLURAL';
  else return error;
  return {...error, category: `${kind}_${next}`};
}
