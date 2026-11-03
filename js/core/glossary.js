// Glosario 30/40/30 (spec §5.4). Puro: el azar entra por `rng` (() => [0,1)).

function shuffled(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Devuelve [{lemma, article|null, plural, es, group: 'vista'|'cercana'|'nivel'}].
// Si falta en un grupo, se completa con no vistas (primero del campo, después del nivel, después cualquiera).
export function pickGlossary(lexicon, seenCounts, {field, level, hide = [], rng, n = 10} = {}) {
  const seen = w => (seenCounts[w.lemma] ?? 0) > 0;
  const used = new Set();
  const out = [];
  const take = (words, k, group) => {
    for (const w of words) {
      if (k <= 0) break;
      if (used.has(w.lemma)) continue;
      used.add(w.lemma);
      out.push({...w, group});
      k--;
    }
  };
  const nv = Math.round(0.3 * n);
  const nc = Math.round(0.4 * n);
  const nn = n - nv - nc;
  const unseen = lexicon.filter(w => !seen(w));
  const vistas = lexicon
    .filter(seen)
    .sort((a, b) => a.freq - b.freq || seenCounts[b.lemma] - seenCounts[a.lemma]);

  take(vistas, nv, 'vista');
  take(shuffled(unseen.filter(w => w.field === field), rng), nc, 'cercana');
  take(shuffled(unseen.filter(w => w.level === level && w.freq === 1), rng), nn, 'nivel');
  take(shuffled(unseen.filter(w => w.field === field), rng), n - out.length, 'cercana');
  take(shuffled(unseen.filter(w => w.level === level), rng), n - out.length, 'nivel');
  take(shuffled(unseen, rng), n - out.length, 'nivel');

  const hideArticle = hide.includes('article');
  return out.map(w => ({
    lemma: w.lemma,
    article: hideArticle ? null : (w.article ?? null),
    plural: w.plural ?? null,
    es: w.es,
    group: w.group,
  }));
}
