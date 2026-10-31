// Morfología mínima: artículos Nom/Akk y presente.

const ARTICLES = {
  def: {
    nom: {m: ['der'], f: ['die'], n: ['das'], pl: ['die']},
    akk: {m: ['den'], f: ['die'], n: ['das'], pl: ['die']},
  },
  indef: {
    nom: {m: ['ein'], f: ['eine'], n: ['ein'], pl: []},
    akk: {m: ['einen'], f: ['eine'], n: ['ein'], pl: []},
  },
  kein: {
    nom: {m: ['kein'], f: ['keine'], n: ['kein'], pl: ['keine']},
    akk: {m: ['keinen'], f: ['keine'], n: ['kein'], pl: ['keine']},
  },
};

// Conjunto de formas válidas; [] si no hay (indefinido en plural).
export function article(det, kase, gender) {
  return [...(ARTICLES[det]?.[kase]?.[gender] ?? [])];
}

// Todas las celdas que producen `form`.
export function findArticle(form) {
  const cells = [];
  for (const [det, kases] of Object.entries(ARTICLES))
    for (const [kase, genders] of Object.entries(kases))
      for (const [gender, forms] of Object.entries(genders))
        if (forms.includes(form)) cells.push({det, kase, gender});
  return cells;
}

const ENDINGS = {ich: 'e', du: 'st', er: 't', wir: 'en', ihr: 't', sie: 'en'};
// Raíz en -t/-d o consonante + m/n (öffnen, rechnen; no lernen ni wohnen).
const EPENTHESIS = /(?:[td]|(?:[^aeiouäöüylrmnh]|ch)[mn])$/;

export function present(verb, person) {
  const irr = verb.irregular?.[person];
  if (irr !== undefined) return Array.isArray(irr) ? [...irr] : [irr];
  const {lemma} = verb;
  if (person === 'wir' || person === 'sie') return [lemma];
  const stem = lemma.replace(/e?n$/, '');
  if (person === 'ich') return [stem + 'e'];
  if (person === 'du' && /[sßzx]$/.test(stem)) return [stem + 't'];
  return [stem + (EPENTHESIS.test(stem) ? 'e' : '') + ENDINGS[person]];
}
