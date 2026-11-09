// Selección ponderada del repaso e intercalado. Puro: el azar entra por `rng`.
import {masteryOf} from './mastery.js';

const MONTH = 30 * 86400000;
const GATE = 0.6;

// El tag tiene datos y cada uno de sus `requires` llega a GATE (sin datos cuenta 0).
export function tagUnlocked(tag, mastery, curriculum) {
  if (masteryOf(mastery, tag) === null) return false;
  const reqs = curriculum?.tags?.[tag]?.requires ?? [];
  return reqs.every(r => (masteryOf(mastery, r) ?? 0) >= GATE);
}

export const forgetting = (last, now) => 1 + Math.min(1, (now - last) / MONTH);

// candidates: ejercicios cerrados de un solo ítem (con `tag` y `type`).
// opts: {now, rng, count, excludeTags, curriculum}
// - curriculum (data/curriculum.json) aporta tags[tag].requires para el gating (≥ 0.6; sin datos cuenta 0).
// - peso = max(0.1, 1 − m_par) × forgetting(last del tag); m_par cae a m del tag si el par no tiene datos.
export function pickReview(candidates, state, {now, rng, count, excludeTags = [], curriculum} = {}) {
  const excluded = new Set(excludeTags);
  const pool = [];
  for (const ex of candidates) {
    if (excluded.has(ex.tag)) continue;
    if (!tagUnlocked(ex.tag, state, curriculum)) continue;
    const m = masteryOf(state, ex.tag);
    const pair = state.pairs[`${ex.tag}|${ex.type}`];
    const mp = pair && pair.n > 0 ? pair.m : m;
    const w = Math.max(0.1, 1 - mp) * forgetting(state.tags[ex.tag].last, now);
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

// Reparte `review` entre `main` conservando el orden de `main`. Búsqueda con retroceso: nunca deja
// 3 seguidos del mismo tag si existe algún orden válido; `rng` solo decide qué se prueba primero.
// Si no existe ningún orden válido, reparte el repaso a intervalos parejos dentro de `main`.
export function interleave(main, review, rng) {
  const total = main.length + review.length;
  const out = [];
  const used = new Set();
  const dead = new Set();
  const go = i => {
    if (out.length === total) return true;
    const k = `${i}|${[...used].join(',')}|${out.at(-2)?.tag}|${out.at(-1)?.tag}`;
    if (dead.has(k)) return false;
    const opts = [];
    const seen = new Set();
    review.forEach((e, j) => {
      if (!used.has(j) && !seen.has(e.tag)) { seen.add(e.tag); opts.push({j, e}); }
    });
    const rest = review.length - used.size;
    const reviewFirst = rest && (i >= main.length || rng() < rest / (total - out.length));
    // Entre los de repaso el orden es al azar; main va primero o último según reviewFirst.
    for (let a = opts.length - 1; a > 0; a--) {
      const b = Math.floor(rng() * (a + 1));
      [opts[a], opts[b]] = [opts[b], opts[a]];
    }
    if (i < main.length) opts.splice(reviewFirst ? opts.length : 0, 0, {main: true, e: main[i]});
    for (const o of opts) {
      if (same3(out, o.e)) continue;
      out.push(o.e);
      if (o.main) { if (go(i + 1)) return true; }
      else { used.add(o.j); if (go(i)) return true; used.delete(o.j); }
      out.pop();
    }
    dead.add(k);
    return false;
  };
  if (go(0)) return out;
  const res = [...main];
  review.forEach((e, k) => res.splice(Math.round(((k + 1) * main.length) / (review.length + 1)) + k, 0, e));
  return res;
}
