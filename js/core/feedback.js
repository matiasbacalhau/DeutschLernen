// Ayudas de feedback: ejemplo que difiere en la dimensión evaluada y curiosidad ocasional.
const pick = (list, rng) => list[Math.floor(rng() * list.length)];

// Sin `dims` (o vacío) vale cualquier ejemplo; con `dims`, solo los que comparten alguna clave y difieren en todas las compartidas.
export function pickExample(tag, dims, curriculum, rng) {
  // Solo cuentan las claves compartidas: el ejemplo comparte al menos una y difiere en todas las que comparte
  // (los gaps generados traen kase y det, que los ejemplos del curriculum no tienen).
  const keys = Object.keys(dims ?? {});
  const options = (curriculum.tags[tag]?.examples ?? []).filter((e) => {
    if (!keys.length) return true;
    const shared = keys.filter((k) => k in (e.dims ?? {}));
    return shared.length > 0 && shared.every((k) => e.dims[k] !== dims[k]);
  });
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
