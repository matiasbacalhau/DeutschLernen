// Entradas del registro de uso (spec §8). Compactas: cada respuesta ocupa ~100 bytes.

// Las respuestas escritas falladas guardan además lo que se escribió (`text`), solo en el registro local.
export const answerEntry = (result, {exerciseId, type, ms, at}) => ({
  t: 'a', item: result.key, tag: result.tag ?? null, type, ok: !!result.ok, diag: result.rule ?? null, ms, at,
  ...(result.given != null ? {text: result.given} : {}),
});

export const groupEntry = ({id, startedAt, endedAt, abandoned}) => ({
  t: 'g', id, start: startedAt, end: endedAt, abandoned: !!abandoned, ms: endedAt - startedAt,
});

// src: {provider, model, trace} en las marcas del corrector de gramática (para comparar proveedores y encontrar la línea del Worker).
export const ltEntry = ({rule, mapped, at, src}) => ({t: 'lt', rule, mapped: !!mapped, at, ...(src ? {src} : {})});

// Repaso de una palabra en la escalera (tarjeta o hueco de nivel 3): lo que movió la SRS.
export const vocabEntry = ({lemma, rung, mode, ok, ms, at}) => ({t: 'v', lemma, rung, mode, ok: !!ok, ms, at});

export function countWords(seenCounts, words) {
  const out = {...seenCounts};
  for (const w of words) out[w] = (out[w] ?? 0) + 1;
  return out;
}
