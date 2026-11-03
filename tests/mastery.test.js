import test from 'node:test';
import assert from 'node:assert/strict';
import {applyResult, masteryOf} from '../js/core/mastery.js';

const NOW = 1_000_000;
const empty = () => ({tags: {}, pairs: {}});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('acierto desde cero: m = 0.3, n = 1, last = now', () => {
  const s = applyResult(empty(), {tag: 't', type: 'gap', ok: true}, {now: NOW});
  close(s.tags.t.m, 0.3);
  assert.equal(s.tags.t.n, 1);
  assert.equal(s.tags.t.last, NOW);
  close(s.pairs['t|gap'].m, 0.3);
});

test('fallo: m += α(0 − m); no muta el estado de entrada', () => {
  const s0 = {tags: {t: {m: 0.5, n: 2, last: 1}}, pairs: {'t|gap': {m: 0.5, n: 2, last: 1}}};
  const copy = structuredClone(s0);
  const s = applyResult(s0, {tag: 't', type: 'gap', ok: false}, {now: NOW});
  close(s.tags.t.m, 0.35);
  assert.equal(s.tags.t.n, 3);
  assert.deepEqual(s0, copy);
});

test('con prereq: fallo completo al prereq y mitad al tag del ítem', () => {
  const s0 = {tags: {a: {m: 0.5, n: 1, last: 1}, b: {m: 0.5, n: 1, last: 1}}, pairs: {}};
  const s = applyResult(s0, {tag: 'b', type: 'gap', ok: false, prereq: 'a'}, {now: NOW});
  close(s.tags.a.m, 0.35);
  close(s.pairs['a|gap'].m, 0); // el par arranca en 0 y un fallo lo deja en 0
  close(s.tags.b.m, 0.5 - 0.5 * 0.3 * 0.5);
  assert.equal(s.pairs['b|gap'].n, 1);
});

test('prereq: el par del prereq recibe el fallo completo sobre su propio m', () => {
  const s0 = {tags: {}, pairs: {'a|gap': {m: 0.8, n: 3, last: 1}}};
  const s = applyResult(s0, {tag: 'b', type: 'gap', ok: false, prereq: 'a'}, {now: NOW});
  close(s.pairs['a|gap'].m, 0.56);
});

test('cuarentena: el estado no cambia', () => {
  const s0 = empty();
  const s = applyResult(s0, {tag: 't', type: 'gap', ok: true, exerciseId: 'x'}, {now: NOW, quarantine: new Set(['x'])});
  assert.deepEqual(s, s0);
});

test('tag null: solo aplica penalties como fallos completos en (tag, writing)', () => {
  const s0 = {tags: {p: {m: 0.5, n: 1, last: 1}}, pairs: {'p|writing': {m: 0.5, n: 1, last: 1}}};
  const s = applyResult(s0, {tag: null, type: 'writing-free', ok: false, penalties: [{tag: 'p'}, {tag: 'q'}]}, {now: NOW});
  close(s.tags.p.m, 0.35);
  close(s.pairs['p|writing'].m, 0.35);
  close(s.tags.q.m, 0);
  assert.equal(s.tags.q.n, 1);
  assert.equal(Object.keys(s.tags).length, 2);
});

test('masteryOf sin datos → null; con datos → m', () => {
  assert.equal(masteryOf(empty(), 't'), null);
  const s = applyResult(empty(), {tag: 't', type: 'gap', ok: true}, {now: NOW});
  close(masteryOf(s, 't'), 0.3);
});
