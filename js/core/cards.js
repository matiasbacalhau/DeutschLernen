// Tarjetas de vocabulario (spec §4). Puro: el azar entra por `rng` (() => [0,1)).

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
