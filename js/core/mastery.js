// Mastery por tag y por par tag|tipo. Funciones puras: nunca mutan el estado.
const ALPHA = 0.3;

function bump(entry, target, weight, now) {
  const m = entry?.m ?? 0;
  return {m: m + weight * ALPHA * (target - m), n: (entry?.n ?? 0) + 1, last: now};
}

// Aplica un fallo/acierto de peso `weight` a tags[tag] y pairs['tag|type'].
function touch(state, tag, type, target, weight, now) {
  const key = `${tag}|${type}`;
  return {
    tags: {...state.tags, [tag]: bump(state.tags[tag], target, weight, now)},
    pairs: {...state.pairs, [key]: bump(state.pairs[key], target, weight, now)},
  };
}

// result: {tag, type, ok, prereq, penalties, exerciseId}; ctx: {now, quarantine: Set}.
// - tag null (escritura): solo se aplican penalties, cada una un fallo completo en (tag, 'writing').
// - fallo con prereq: el prereq recibe el fallo completo en tag y en el par prereq|type;
//   el tag del ítem recibe la mitad (0.5·α) en tag y en par.
export function applyResult(state, result, {now, quarantine} = {}) {
  if (quarantine?.has(result.exerciseId)) return state;
  let s = state;
  if (result.tag == null) {
    const penalized = new Set((result.penalties ?? []).map(p => p.tag));
    for (const p of result.penalties ?? []) s = touch(s, p.tag, 'writing', 0, 1, now);
    const weight = result.score ?? (result.ok ? 1 : 0);
    if (weight > 0) {
      for (const tag of result.rewards ?? []) {
        if (!penalized.has(tag)) s = touch(s, tag, 'writing', 1, weight, now);
      }
    }
    return s;
  }
  if (result.ok) return touch(s, result.tag, result.type, 1, 1, now);
  if (result.prereq) {
    s = touch(s, result.prereq, result.type, 0, 1, now);
    return touch(s, result.tag, result.type, 0, 0.5, now);
  }
  return touch(s, result.tag, result.type, 0, 1, now);
}

export function masteryOf(state, tag) {
  const e = state.tags[tag];
  return e && e.n > 0 ? e.m : null;
}
