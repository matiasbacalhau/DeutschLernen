// Entradas del registro de uso (spec §8). Compactas: cada respuesta ocupa ~100 bytes.

export const answerEntry = (result, {exerciseId, type, ms, at}) => ({
  t: 'a', item: exerciseId, tag: result.tag ?? null, type, ok: !!result.ok, diag: result.rule ?? null, ms, at,
});

export const groupEntry = ({id, startedAt, endedAt, abandoned}) => ({
  t: 'g', id, start: startedAt, end: endedAt, abandoned: !!abandoned, ms: endedAt - startedAt,
});

export const ltEntry = ({rule, mapped, at}) => ({t: 'lt', rule, mapped: !!mapped, at});

export function countWords(seenCounts, words) {
  const out = {...seenCounts};
  for (const w of words) out[w] = (out[w] ?? 0) + 1;
  return out;
}
