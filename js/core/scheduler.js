// Selección ponderada del repaso e intercalado. Puro: el azar entra por `rng`.
import {masteryOf} from './mastery.js';

const MONTH = 30 * 86400000;
const GATE = 0.6;

export const forgetting = (last, now) => 1 + Math.min(1, (now - last) / MONTH);

// candidates: ejercicios cerrados de un solo ítem (con `tag` y `type`).
// opts: {now, rng, count, excludeTags, recentTags, curriculum}
// - curriculum (data/curriculum.json) aporta tags[tag].requires para el gating (≥ 0.6; sin datos cuenta 0).
// - recentTags: los tags vistos hace poco pesan la mitad.
// - peso = max(0.1, 1 − m_par) × forgetting(last del tag); m_par cae a m del tag si el par no tiene datos.
export function pickReview(candidates, state, {now, rng, count, excludeTags = [], recentTags = [], curriculum} = {}) {
  const excluded = new Set(excludeTags);
  const recent = new Set(recentTags);
  const pool = [];
  for (const ex of candidates) {
    if (excluded.has(ex.tag)) continue;
    const m = masteryOf(state, ex.tag);
    if (m === null) continue;
    const reqs = curriculum?.tags?.[ex.tag]?.requires ?? [];
    if (reqs.some(r => (masteryOf(state, r) ?? 0) < GATE)) continue;
    const pair = state.pairs[`${ex.tag}|${ex.type}`];
    const mp = pair && pair.n > 0 ? pair.m : m;
    let w = Math.max(0.1, 1 - mp) * forgetting(state.tags[ex.tag].last, now);
    if (recent.has(ex.tag)) w *= 0.5;
    pool.push({ex, w});
  }
  const out = [];
  while (out.length < count && pool.length) {
    let r = rng() * pool.reduce((a, p) => a + p.w, 0);
    let i = 0;
    while (i < pool.length - 1 && r >= pool[i].w) r -= pool[i++].w;
    out.push(pool.splice(i, 1)[0].ex);
  }
  return out;
}

const same3 = (out, ex) => out.length >= 2 && out.at(-1).tag === ex.tag && out.at(-2).tag === ex.tag;

// Mezcla al azar conservando el orden de `main`; evita 3 seguidos del mismo tag y reintenta
// si se acorrala (si no existe un orden válido devuelve el último intento).
export function interleave(main, review, rng) {
  let out;
  for (let attempt = 0; attempt < 30; attempt++) {
    const m = [...main], r = [...review];
    out = [];
    while (m.length || r.length) {
      const pickReviewNext = r.length && (!m.length || rng() < r.length / (m.length + r.length));
      const okR = r.map((e, i) => i).filter(i => !same3(out, r[i]));
      let take;
      if (pickReviewNext && okR.length) take = r.splice(okR[Math.floor(rng() * okR.length)], 1)[0];
      else if (m.length && !same3(out, m[0])) take = m.shift();
      else if (okR.length) take = r.splice(okR[0], 1)[0];
      else take = m.length ? m.shift() : r.shift();
      out.push(take);
    }
    if (!out.some((e, i) => i >= 2 && same3(out.slice(0, i), e))) return out;
  }
  return out;
}
