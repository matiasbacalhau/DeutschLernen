import test from 'node:test';
import assert from 'node:assert/strict';
import {applyResult} from '../js/core/mastery.js';
import {buildGroup, commitNext, scoreGroup, resolvePending, recordAttempt, suggestNext, topicStatus} from '../js/core/progress.js';

const DAY = 86400000;
const NOW = 100 * DAY;
function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const gap = (id, extra = {}) => ({id, type: 'gap', tag: 'a1.akk.mask', ...extra});
const writing = id => ({id, type: 'writing-guided'});
const step = (n, ids, extra = {}) => ({n, name: `E${n}`, scene: 's', exercises: ids.map(i => (typeof i === 'string' ? gap(i) : i)), ...extra});

const unit = {
  id: 'a1.u01',
  topics: [
    {topic: 'a1.u1.t1', tags: ['a1.pron.personal'], steps: [
      step(1, ['p1a', 'p1b', 'p1c', {...gap('p1r'), reserve: true}]),
      step(2, ['p2a']), step(3, ['p3a']), step(4, ['p4a']), step(5, [writing('w1'), writing('w2'), writing('w3')]),
    ]},
    {topic: 'a1.u1.t2', tags: ['a1.genus'], steps: [step(1, ['g1a']), step(2, ['g2a']), step(3, ['g3a']), step(4, ['g4a']), step(5, [writing('v1')])]},
    {topic: 'a1.u1.t3', draft: true, tags: ['a1.akk.mask'], steps: []},
  ],
};
const templates = [{id: 'tpl', tag_prefix: 'a1.akk', det: 'indef', kase: 'akk', verb: 'brauchen', context: 'c', text: 'Ich brauche ___ {noun}.', slot: {pos: 'noun', fields: ['f'], countable: false}}];
const lexicon = ['Hund', 'Katze', 'Tisch', 'Buch', 'Haus', 'Auto'].map((lemma, i) => ({lemma, pos: 'noun', article: ['der', 'die', 'das'][i % 3], plural: lemma + 'e', field: 'f'}));
const empty = {steps: {}};
const noMastery = {tags: {}, pairs: {}};
const ids = g => g.exercises.map(e => e.id);

test('primer intento: orden del YAML, sin reserva', () => {
  const g = buildGroup(unit, 'a1.u1.t1', 1, empty, noMastery, {now: NOW, rng: lcg(1), templates, lexicon, otherExercises: []});
  assert.deepEqual(ids(g), ['p1a', 'p1b', 'p1c']);
  assert.equal(g.topic, 'a1.u1.t1');
  assert.equal(g.step, 1);
  assert.equal(g.index, 0);
  assert.equal(g.committed, 0);
  assert.deepEqual(g.results, []);
  assert.equal(g.startedAt, NOW);
});

const withSteps = (u, topicIdx, n, extra) => {
  const c = structuredClone(u);
  Object.assign(c.topics[topicIdx].steps[n - 1], extra);
  return c;
};
const attempt = (passed, at = 1) => ({at, pct: 0.5, passed, pending: []});

test('reintento: no vistos primero (reserva incluida), sin duplicados', () => {
  const u = withSteps(unit, 0, 1, {});
  const prog = {steps: {'a1.u1.t1/1': {attempts: [attempt(false)], seen: {p1a: 1, p1b: 2, p1c: 3}}}};
  const small = structuredClone(u);
  // mínimo del escalón 1 = 10; alcanza solo con no vistos (1) + vistos
  const g = buildGroup(small, 'a1.u1.t1', 1, prog, noMastery, {now: NOW, rng: lcg(1), templates, lexicon, otherExercises: []});
  assert.deepEqual(ids(g), ['p1r', 'p1a', 'p1b', 'p1c']);
  assert.equal(new Set(ids(g)).size, ids(g).length);
});

test('reintento: con todo visto rellena con gap generados y después con vistos más viejos', () => {
  const u = withSteps(unit, 0, 1, {generated: 3});
  u.topics[0].tags = ['a1.akk.mask'];
  const prog = {steps: {'a1.u1.t1/1': {attempts: [attempt(false)], seen: {p1a: 30, p1b: 10, p1c: 20, p1r: 40}}}};
  const g = buildGroup(u, 'a1.u1.t1', 1, prog, noMastery, {now: NOW, rng: lcg(2), templates, lexicon, otherExercises: []});
  const gen = g.exercises.filter(e => e.generated);
  assert.equal(gen.length, 6); // 6 lemas disponibles, se piden hasta llegar a 10 ítems
  assert.equal(g.exercises.length, 10);
  assert.deepEqual(ids(g).slice(6), ['p1b', 'p1c', 'p1a', 'p1r'].slice(0, 4));
  assert.equal(new Set(ids(g)).size, 10);
});

test('primer intento con generated: exactamente N gaps generados al final', () => {
  const u = withSteps(unit, 0, 1, {generated: 2});
  u.topics[0].tags = ['a1.akk.mask'];
  const g = buildGroup(u, 'a1.u1.t1', 1, empty, noMastery, {now: NOW, rng: lcg(3), templates, lexicon, otherExercises: []});
  assert.equal(g.exercises.length, 5);
  assert.deepEqual(g.exercises.map(e => !!e.generated), [false, false, false, true, true]);
});

test('repaso en escalón 2: round(ítems/4), marcado y fuera del tema', () => {
  const u = structuredClone(unit);
  u.topics[0].steps[1] = step(2, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  const mastery = applyResult(noMastery, {tag: 'a1.nom', type: 'gap', ok: true}, {now: NOW});
  const other = ['x1', 'x2', 'x3'].map(id => ({id, type: 'gap', tag: 'a1.nom'}));
  const g = buildGroup(u, 'a1.u1.t1', 2, empty, mastery, {now: NOW, rng: lcg(4), templates, lexicon, otherExercises: other});
  const rev = g.exercises.filter(e => e.review);
  assert.equal(rev.length, 2);
  assert.equal(g.exercises.length, 10);
  assert.ok(rev.every(e => e.id.startsWith('x')));
});

test('repaso en escalón 5: entre 4 y 6, o 0 sin candidatos', () => {
  const mastery = applyResult(noMastery, {tag: 'a1.nom', type: 'gap', ok: true}, {now: NOW});
  const other = Array.from({length: 10}, (_, i) => ({id: `x${i}`, type: 'gap', tag: 'a1.nom'}));
  const g = buildGroup(unit, 'a1.u1.t1', 5, empty, mastery, {now: NOW, rng: lcg(5), templates, lexicon, otherExercises: other});
  const n = g.exercises.filter(e => e.review).length;
  assert.ok(n >= 4 && n <= 6);
  const g0 = buildGroup(unit, 'a1.u1.t1', 5, empty, noMastery, {now: NOW, rng: lcg(5), templates, lexicon, otherExercises: other});
  assert.equal(g0.exercises.filter(e => e.review).length, 0);
});

const ok = (key, tag = 'a1.akk.mask') => ({key, tag, ok: true, review: false});
const bad = (key, tag = 'a1.akk.mask') => ({key, tag, ok: false, rule: 'R', review: false});
const grp = (exercises, results, extra = {}) => ({id: 'g', topic: 'a1.u1.t1', step: 2, exercises, index: exercises.length, results, committed: 0, startedAt: NOW, ...extra});

test('un review fallado no cuenta: grupo passed con pct 1', () => {
  const exs = [gap('a'), gap('b'), gap('r', {review: true})];
  const s = scoreGroup(grp(exs, [ok('a'), ok('b'), bad('r')]));
  assert.equal(s.pct, 1);
  assert.equal(s.passed, true);
});

test('79 % no pasa, 80 % sí; ítems con clave id#n', () => {
  const sit = {id: 's', type: 'situation', gaps: [1, 2, 3, 4, 5]};
  const exs = [sit];
  const mk = n => Array.from({length: 5}, (_, i) => (i < n ? ok(`s#${i}`) : bad(`s#${i}`)));
  assert.equal(scoreGroup(grp(exs, mk(4))).passed, true);
  const many = Array.from({length: 100}, (_, i) => gap(`q${i}`));
  const res = n => many.map((e, i) => (i < n ? ok(e.id) : bad(e.id)));
  const s79 = scoreGroup(grp(many, res(79)));
  assert.equal(s79.pct, 0.79);
  assert.equal(s79.passed, false);
  assert.deepEqual(s79.failedRules, ['R']);
});

const w = ['w1', 'w2', 'w3'].map(writing);
const wres = (a, b, c) => [a, b, c].map((v, i) => ({key: `w${i + 1}`, tag: null, ok: v === true, ...(v === 'p' ? {pending: true} : {}), penalties: [], marks: []}));

test('escalón 5 con pendiente', () => {
  const g = grp(w, wres(true, false, 'p'), {step: 5});
  const s = scoreGroup(g);
  assert.equal(s.passed, null);
  assert.deepEqual(s.pending, ['w3']);
  assert.equal(scoreGroup(grp(w, wres(true, true, 'p'), {step: 5})).passed, true);
  assert.equal(scoreGroup(grp(w, wres(true, false, false), {step: 5})).passed, false);
  let prog = recordAttempt(empty, g, NOW);
  const at = prog.steps['a1.u1.t1/5'].attempts[0];
  assert.equal(at.passed, null);
  assert.deepEqual(at.pending, ['w3']);
  assert.equal(resolvePending(prog, 'w3', true).steps['a1.u1.t1/5'].attempts[0].passed, true);
  const no = resolvePending(prog, 'w3', false).steps['a1.u1.t1/5'].attempts[0];
  assert.equal(no.passed, false);
  assert.deepEqual(no.pending, []);
  assert.equal(prog.steps['a1.u1.t1/5'].attempts[0].passed, null); // inmutable
  assert.equal(resolvePending(prog, 'zzz', true), prog);
});

test('resume no duplica', () => {
  const exs = [gap('a'), gap('b'), gap('c'), gap('d')];
  const g = grp(exs, [ok('a'), ok('b'), ok('c')], {index: 3, committed: 2});
  const r = commitNext(g);
  assert.deepEqual(r.toApply.map(x => x.key), ['c']);
  assert.equal(r.group.committed, 3);
  assert.deepEqual(commitNext(r.group).toApply, []);
  assert.equal(g.committed, 2);
});

test('recordAttempt marca vistos solo de ejercicios del tema', () => {
  const exs = [gap('a'), gap('r', {review: true})];
  const p = recordAttempt(empty, grp(exs, [ok('a'), ok('r')]), NOW);
  assert.deepEqual(p.steps['a1.u1.t1/2'].seen, {a: NOW});
  assert.equal(p.steps['a1.u1.t1/2'].attempts[0].passed, true);
});

test('primer uso', () => {
  assert.deepEqual(suggestNext(unit, empty, NOW, noMastery), {topic: 'a1.u1.t1', step: 1});
  const g = buildGroup(unit, 'a1.u1.t1', 1, empty, noMastery, {now: NOW, rng: lcg(1), templates, lexicon, otherExercises: []});
  assert.ok(g.exercises.every(e => !e.review));
});

const prog = o => ({steps: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, {attempts: v, seen: {}}]))});

test('suggestNext: el reforzar más viejo', () => {
  const p = prog({'a1.u1.t1/1': [attempt(true, 5)], 'a1.u1.t1/2': [attempt(false, 50)], 'a1.u1.t2/1': [attempt(false, 20)]});
  assert.deepEqual(suggestNext(unit, p, NOW, noMastery), {topic: 'a1.u1.t2', step: 1});
});

test('suggestNext: reforzar usa el último intento', () => {
  const p = prog({'a1.u1.t1/1': [attempt(false, 1), attempt(true, 2)]});
  assert.deepEqual(suggestNext(unit, p, NOW, noMastery), {topic: 'a1.u1.t1', step: 2});
});

test('suggestNext: siguiente escalón, tema siguiente y todo superado', () => {
  const t1 = Object.fromEntries([1, 2, 3, 4, 5].map(n => [`a1.u1.t1/${n}`, [attempt(true, n)]]));
  assert.deepEqual(suggestNext(unit, prog({'a1.u1.t1/1': [attempt(true, 1)], 'a1.u1.t1/2': [attempt(true, 2)]}), NOW, noMastery), {topic: 'a1.u1.t1', step: 3});
  assert.deepEqual(suggestNext(unit, prog(t1), NOW, noMastery), {topic: 'a1.u1.t2', step: 1});
  const t2 = Object.fromEntries([1, 2, 3, 4, 5].map(n => [`a1.u1.t2/${n}`, [attempt(true, 10 + n)]]));
  let m = applyResult(noMastery, {tag: 'a1.pron.personal', type: 'gap', ok: true}, {now: NOW});
  m = applyResult(m, {tag: 'a1.genus', type: 'gap', ok: false}, {now: NOW});
  assert.deepEqual(suggestNext(unit, prog({...t1, ...t2}), NOW, m), {topic: 'a1.u1.t2', step: 1});
});

const curriculum = {topics: [{id: 'a1.u1.t1', unit: 'a1.u01'}, {id: 'a1.u1.t3', unit: 'a1.u01'}, {id: 'a2.u1.t1'}, {id: 'b1.t1', unit: 'b1.u01'}]};
function mastered(v) {
  return {tags: {'a1.pron.personal': {m: v, n: 3, last: NOW}}, pairs: {}};
}
const all5 = Object.fromEntries([1, 2, 3, 4, 5].map(n => [`a1.u1.t1/${n}`, [attempt(true, n)]]));

test('topicStatus', () => {
  const t = {id: 'a1.u1.t1', unit: 'a1.u01'};
  const st = (p, m, tp = t) => topicStatus(tp, p, m, curriculum, [unit]);
  assert.equal(st(empty, noMastery), 'nuevo');
  assert.equal(st(prog({'a1.u1.t1/1': [attempt(true)]}), mastered(0.7)), 'en-curso');
  assert.equal(st(prog(all5), mastered(0.85)), 'dominado');
  assert.equal(st(prog(all5), mastered(0.4)), 'reforzar');
  assert.equal(st(prog({'a1.u1.t1/1': [attempt(false)]}), mastered(0.7)), 'reforzar');
  assert.equal(st(prog({'a1.u1.t1/5': [attempt(null)]}), mastered(0.7)), 'en-curso');
  assert.equal(st(empty, noMastery, {id: 'a1.u1.t3', unit: 'a1.u01'}), 'proximamente'); // draft
  assert.equal(st(empty, noMastery, {id: 'a2.u1.t1'}), 'proximamente'); // sin unidad
  assert.equal(st(empty, noMastery, {id: 'b1.t1', unit: 'b1.u01'}), 'proximamente'); // unidad no cargada
});
