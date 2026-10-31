import test from 'node:test';
import assert from 'node:assert/strict';
import {applyResult} from '../js/core/mastery.js';
import {forgetting, pickReview, interleave} from '../js/core/scheduler.js';

const DAY = 86400000;
const NOW = 100 * DAY;
function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const ex = (id, tag) => ({id, tag, type: 'gap'});
const TAGS = ['a1.akk.mask', 'a1.nom', 'a1.sein', 'a1.verbs'];
const cands = TAGS.flatMap(t => [0, 1, 2].map(i => ex(`${t}#${i}`, t)));
const seeded = () => {
  let s = {tags: {}, pairs: {}};
  for (const t of TAGS) s = applyResult(s, {tag: t, type: 'gap', ok: true}, {now: NOW});
  return s;
};
const freq = (picks, tag) => picks.filter(e => e.tag === tag).length / picks.length;
function sample(state, n = 200, seed = 7, opts = {}) {
  const rng = lcg(seed);
  const out = [];
  for (let i = 0; i < n; i++) out.push(...pickReview(cands, state, {now: NOW, rng, count: 2, ...opts}));
  return out;
}

test('forgetting: 1 recién, 2 a 30 días o más', () => {
  assert.equal(forgetting(NOW, NOW), 1);
  assert.equal(forgetting(NOW - 15 * DAY, NOW), 1.5);
  assert.equal(forgetting(NOW - 90 * DAY, NOW), 2);
});

test('sin tags con datos → []', () => {
  assert.deepEqual(pickReview(cands, {tags: {}, pairs: {}}, {now: NOW, rng: lcg(1), count: 3}), []);
});

test('sin reemplazo y sin repetir ejercicio', () => {
  const picks = pickReview(cands, seeded(), {now: NOW, rng: lcg(3), count: 12});
  assert.equal(picks.length, 12);
  assert.equal(new Set(picks.map(e => e.id)).size, 12);
  assert.equal(pickReview(cands, seeded(), {now: NOW, rng: lcg(3), count: 50}).length, 12);
});

test('excludeTags y gating por requires', () => {
  const s = seeded();
  let picks = pickReview(cands, s, {now: NOW, rng: lcg(2), count: 12, excludeTags: ['a1.nom']});
  assert.ok(picks.every(e => e.tag !== 'a1.nom'));
  const curriculum = {tags: {'a1.sein': {requires: ['a1.nom']}, 'a1.nom': {requires: []}, 'a1.akk.mask': {requires: ['a1.nom']}, 'a1.verbs': {requires: ['a1.sin.datos']}}};
  picks = pickReview(cands, s, {now: NOW, rng: lcg(2), count: 12, curriculum});
  // nom tiene m = 0.3 < 0.6: bloquea a sein y akk; verbs requiere un tag sin datos
  assert.deepEqual([...new Set(picks.map(e => e.tag))], ['a1.nom']);
});

test('simulación: errores forzados suben la frecuencia del tag; acertar la baja', () => {
  let s = seeded();
  for (let i = 0; i < 6; i++) s = applyResult(s, {tag: 'a1.nom', type: 'gap', ok: true}, {now: NOW});
  const base = freq(sample(s), 'a1.akk.mask');
  let bad = s;
  for (let i = 0; i < 30; i++) bad = applyResult(bad, {tag: 'a1.akk.mask', type: 'gap', ok: false}, {now: NOW});
  // para tener contraste, el resto ya subió su m
  for (const t of TAGS.slice(1)) for (let i = 0; i < 6; i++) bad = applyResult(bad, {tag: t, type: 'gap', ok: true}, {now: NOW});
  const afterFail = freq(sample(bad), 'a1.akk.mask');
  assert.ok(afterFail > base, `${afterFail} > ${base}`);
  let good = bad;
  for (let i = 0; i < 12; i++) good = applyResult(good, {tag: 'a1.akk.mask', type: 'gap', ok: true}, {now: NOW});
  assert.ok(freq(sample(good), 'a1.akk.mask') < afterFail);
});

test('un par dominado (m = 1) sigue apareciendo (piso 0.1)', () => {
  const s = {tags: {}, pairs: {}};
  for (const t of TAGS) {
    s.tags[t] = {m: t === 'a1.sein' ? 1 : 0, n: 5, last: NOW};
    s.pairs[`${t}|gap`] = {m: t === 'a1.sein' ? 1 : 0, n: 5, last: NOW};
  }
  const f = freq(sample(s, 300), 'a1.sein');
  assert.ok(f > 0, 'aparece');
  assert.ok(f < 0.15, `poco frecuente: ${f}`);
});

test('interleave: nunca 3 seguidos del mismo tag y conserva todos', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rng = lcg(seed);
    const main = ['x', 'x', 'y', 'x', 'x', 'y', 'x'].map((t, i) => ex(`m${i}`, t));
    const review = ['x', 'x', 'x', 'y'].map((t, i) => ex(`r${i}`, t));
    const out = interleave(main, review, rng);
    assert.equal(out.length, 11);
    assert.equal(new Set(out.map(e => e.id)).size, 11);
    for (let i = 2; i < out.length; i++) {
      assert.ok(!(out[i].tag === out[i - 1].tag && out[i].tag === out[i - 2].tag), `seed ${seed} pos ${i}`);
    }
  }
});

const mk = (str, p) => [...str].map((tag, i) => ex(`${p}${i}`, tag));
const triple3 = a => a.some((e, i) => i >= 2 && e.tag === a[i - 1].tag && e.tag === a[i - 2].tag);

test('interleave: caso ajustado yxxxx + xxy', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const out = interleave(mk('yxxxx', 'm'), mk('xxy', 'r'), lcg(seed));
    assert.equal(out.length, 8);
    assert.ok(!triple3(out), out.map(e => e.tag).join(''));
    assert.deepEqual(out.filter(e => e.id.startsWith('m')).map(e => e.id), ['m0', 'm1', 'm2', 'm3', 'm4']);
  }
});

// Fuerza bruta: ¿existe algún orden válido que conserve main?
function solvable(main, review) {
  const go = (i, rest, out) => {
    if (i === main.length && !rest.length) return true;
    const t = o => out.length >= 2 && out.at(-1) === o && out.at(-2) === o;
    if (i < main.length && !t(main[i]) && go(i + 1, rest, [...out, main[i]])) return true;
    return rest.some((r, j) => !t(r) && go(i, rest.filter((_, k) => k !== j), [...out, r]));
  };
  return go(0, [...review], []);
}
function allStrings(max) {
  const res = [''];
  for (let n = 1; n <= max; n++) for (let v = 0; v < 2 ** n; v++) res.push([...Array(n)].map((_, b) => 'xy'[(v >> b) & 1]).join(''));
  return res;
}

test('interleave: exhaustivo, sin 3 seguidos siempre que exista orden válido', () => {
  let solvables = 0;
  for (const m of allStrings(5)) for (const r of allStrings(3)) {
    const out = interleave(mk(m, 'm'), mk(r, 'r'), lcg(m.length * 7 + r.length + 1));
    assert.equal(out.length, m.length + r.length);
    assert.equal(new Set(out.map(e => e.id)).size, out.length);
    if (solvable([...m], [...r])) { solvables++; assert.ok(!triple3(out), `${m} + ${r}`); }
  }
  assert.ok(solvables > 100);
});

test('pickReview: par sin datos usa el mastery del tag', () => {
  const s = {tags: {'a1.nom': {m: 1, n: 5, last: NOW}, 'a1.sein': {m: 0, n: 5, last: NOW}}, pairs: {}};
  const c = [ex('n', 'a1.nom'), ex('s', 'a1.sein')];
  const rng = lcg(5);
  let sein = 0;
  for (let i = 0; i < 300; i++) if (pickReview(c, s, {now: NOW, rng, count: 1})[0].tag === 'a1.sein') sein++;
  assert.ok(sein > 240, `sein ${sein}/300`); // pesos 1 vs 0.1
});
