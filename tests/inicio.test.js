import test from 'node:test';
import assert from 'node:assert/strict';
import {greeting, humorLine, applyResolved, stepStatus} from '../js/core/inicio.js';
import {recordAttempt, commitNext} from '../js/core/progress.js';
import {applyCommit} from '../js/core/runner.js';

test('saludo según la hora, con nombre opcional', () => {
  assert.equal(greeting(8), 'Guten Morgen');
  assert.equal(greeting(11), 'Guten Morgen');
  assert.equal(greeting(12), 'Guten Tag');
  assert.equal(greeting(18), 'Guten Tag');
  assert.equal(greeting(19), 'Guten Abend');
  assert.equal(greeting(3), 'Guten Morgen');
  assert.equal(greeting(9, 'Mati'), 'Guten Morgen, Mati');
  assert.equal(greeting(9, '  '), 'Guten Morgen');
});

const topics = {'a1.akk': {title: 'Akkusativ'}, 'a1.sein': {title: 'sein en presente'}};
const m = (tags) => ({tags: Object.fromEntries(Object.entries(tags).map(([k, v]) => [k, {m: v, n: 1, last: 0}])), pairs: {}});

test('línea con humor: sin datos, tag flojo, todo bien', () => {
  assert.match(humorLine({tags: {}, pairs: {}}, topics), /Primer día.*\*sein\*/);
  assert.equal(humorLine(m({'a1.akk': 0.3, 'a1.sein': 0.9}), topics), 'Lo que más te viene costando: *Akkusativ*.');
  // Sin artículo ni verbo que concuerde con el título: sirve para títulos en plural ("Pronombres personales").
  assert.equal(humorLine(m({'a1.akk': 0.3}), {'a1.akk': {title: 'Pronombres personales'}}), 'Lo que más te viene costando: *Pronombres personales*.');
  assert.equal(humorLine(m({'a1.akk': 0.7, 'a1.sein': 0.9}), topics), 'Todo en orden. Sigamos subiendo.');
});

test('humor: elige el tag más bajo', () => {
  assert.match(humorLine(m({'a1.akk': 0.4, 'a1.sein': 0.1}), topics), /sein en presente/);
});

const progress = {steps: {'t/5': {attempts: [{at: 1, pct: 0, passed: null, pending: ['w1'], ok: 0, bad: 0}], seen: {}}}};
const ltMap = {rules: {R1: {es: 'x', tag: 'a1.akk'}}, categories: {}, notice_categories: []};
const matches = [{offset: 0, length: 2, rule: {id: 'R1', category: {id: 'GRAMMAR'}}}];
const entry = {key: 'w1', topic: 't', step: 5, scene: 'Hostel', text: 'Ich habe', at: 5, type: 'writing-guided', ms: 40};
const base = () => ({progress, mastery: {tags: {}, pairs: {}}, log: []});

test('escritura corregida con errores: resuelve, penaliza y loguea', () => {
  const out = applyResolved({state: base(), entry: {...entry, matches}, ltMap, quarantine: [], now: 9});
  assert.equal(out.progress.steps['t/5'].attempts[0].pending.length, 0);
  assert.equal(out.progress.steps['t/5'].attempts[0].bad, 1);
  assert.ok(out.mastery.tags['a1.akk'].m === 0 && out.mastery.tags['a1.akk'].n === 1);
  assert.deepEqual(out.log, [
    {t: 'a', item: 'w1', tag: null, type: 'writing-guided', ok: false, diag: null, ms: 40, at: 5},
    {t: 'lt', rule: 'R1', mapped: true, at: 5},
  ]);
  assert.deepEqual(out.notice, {key: 'w1', topic: 't', step: 5, scene: 'Hostel', text: 'Ich habe', ok: false, at: 9,
    marks: [{offset: 0, length: 2, text: 'x', kind: 'error'}]});
});

test('escritura corregida sin errores: sin penalización', () => {
  const out = applyResolved({state: base(), entry: {...entry, matches: []}, ltMap, quarantine: [], now: 9});
  assert.equal(out.progress.steps['t/5'].attempts[0].ok, 1);
  assert.deepEqual(out.mastery.tags, {});
  assert.equal(out.notice.ok, true);
});

test('escritura en cuarentena no toca mastery', () => {
  const out = applyResolved({state: base(), entry: {...entry, matches}, ltMap, quarantine: ['w1'], now: 9});
  assert.deepEqual(out.mastery.tags, {});
  assert.equal(out.progress.steps['t/5'].attempts[0].bad, 1);
});

// C1: la escritura se corrige con el grupo todavía abierto (red de vuelta en la escritura 2 o 3, o app reabierta).
const W = ['w1', 'w2', 'w3'].map(id => ({id, type: 'writing-guided'}));
const openGroup = (extra = {}) => ({
  id: 't/5@1', topic: 't', step: 5, exercises: W, index: 3, committed: 3, startedAt: 1,
  results: [
    {key: 'w1', tag: null, ok: false, pending: true, at: 2},
    {key: 'w2', tag: null, ok: true, penalties: [], marks: [], at: 3},
    {key: 'w3', tag: null, ok: false, penalties: [], marks: [{offset: 0, length: 1, text: 'y', kind: 'error'}], at: 4},
  ],
  ...extra,
});
const empty = () => ({progress: {steps: {}}, mastery: {tags: {}, pairs: {}}, log: []});

test('C1: resuelta con el grupo abierto → el intento del fin de grupo la cuenta (sin pendiente)', () => {
  const group = openGroup();
  const out = applyResolved({state: {...empty(), group}, entry: {...entry, group: group.id, matches: []}, ltMap, quarantine: [], now: 9});
  const r = out.group.results[0];
  assert.equal(r.pending, undefined);
  assert.equal(r.ok, true);
  assert.deepEqual(out.progress, {steps: {}}, 'no hay intento que resolver todavía');
  const a = recordAttempt(out.progress, out.group, 10).steps['t/5'].attempts[0];
  assert.deepEqual([a.pending, a.passed, a.ok, a.bad], [[], true, 2, 1]);
  assert.equal(group.results[0].pending, true, 'inmutable');
});

test('C1: con errores y resuelta antes del commit → penalización y log una sola vez', () => {
  const group = openGroup({committed: 0});
  const out = applyResolved({state: {...empty(), group}, entry: {...entry, group: group.id, matches}, ltMap, quarantine: [], now: 9});
  assert.equal(out.group.results[0].ok, false);
  assert.deepEqual(out.group.results[0].marks.map(x => x.text), ['x']);
  assert.equal(out.mastery.tags['a1.akk'].n, 1);
  const {toApply} = commitNext(out.group);
  const c = applyCommit({group: out.group, toApply, state: {...out, words: {}}, quarantine: [], now: 11});
  assert.equal(c.mastery.tags['a1.akk'].n, 1, 'el commit no vuelve a penalizar');
  assert.equal(c.log.filter(e => e.t === 'a' && e.item === 'w1').length, 1);
  assert.equal(c.log.filter(e => e.t === 'lt').length, 1);
  const a = recordAttempt(c.progress, out.group, 12).steps['t/5'].attempts[0];
  assert.deepEqual([a.pending, a.passed], [[], false]);
});

test('C1: la entrada de otro grupo no toca el grupo abierto', () => {
  const group = openGroup();
  const out = applyResolved({state: {...base(), group}, entry: {...entry, group: 'otro', matches: []}, ltMap, quarantine: [], now: 9});
  assert.equal(out.group, group);
  assert.equal(out.progress.steps['t/5'].attempts[0].ok, 1);
});

test('estado de escalón', () => {
  assert.equal(stepStatus(undefined), 'sin-intentar');
  assert.equal(stepStatus({passed: true}), 'superado');
  assert.equal(stepStatus({passed: false}), 'reforzar');
  assert.equal(stepStatus({passed: null}), 'pendiente');
});
