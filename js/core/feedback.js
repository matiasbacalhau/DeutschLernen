// Ayudas de feedback: ejemplo que difiere en la dimensión evaluada y curiosidad ocasional.
const pick = (list, rng) => list[Math.floor(rng() * list.length)];

// Solo ejemplos cuyos `dims` difieren en todas las claves que comparten con `dims`.
export function pickExample(tag, dims, curriculum, rng) {
  const options = (curriculum.tags[tag]?.examples ?? []).filter((e) =>
    Object.keys(dims).filter((k) => k in (e.dims ?? {})).every((k) => e.dims[k] !== dims[k]));
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
