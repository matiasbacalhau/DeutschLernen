// Ayudas de feedback: ejemplo que difiere en la dimensión evaluada y curiosidad ocasional.
const pick = (list, rng) => list[Math.floor(rng() * list.length)];

// Sin `dims` (o vacío) vale cualquier ejemplo; con `dims`, solo los que tienen esas claves y difieren en todas.
export function pickExample(tag, dims, curriculum, rng) {
  const keys = Object.keys(dims ?? {});
  const options = (curriculum.tags[tag]?.examples ?? []).filter((e) =>
    keys.every((k) => k in (e.dims ?? {}) && e.dims[k] !== dims[k]));
  if (!options.length) return null;
  const {de, es} = pick(options, rng);
  return {de, es};
}

// Primero las curiosidades del ejercicio, después las del tag; solo con probabilidad 0.25.
export function pickCuriosity(exercise, tag, curriculum, rng) {
  if (!(rng() < 0.25)) return null;
  const list = exercise.curiosities?.length ? exercise.curiosities : (curriculum.tags[tag]?.curiosities ?? []);
  return list.length ? pick(list, rng) : null;
}
