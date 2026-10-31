import test from 'node:test';
import assert from 'node:assert/strict';
import {greeting, humorLine, applyResolved, stepStatus} from '../js/core/inicio.js';

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

const topics = [
  {title: 'Akkusativ', tags: ['a1.akk']},
  {title: 'sein', tags: ['a1.sein']},
];
const m = (tags) => ({tags: Object.fromEntries(Object.entries(tags).map(([k, v]) => [k, {m: v, n: 1, last: 0}])), pairs: {}});

test('línea con humor: sin datos, tag flojo, todo bien', () => {
  assert.match(humorLine({tags: {}, pairs: {}}, topics), /Primer día.*\*sein\*/);
  assert.equal(humorLine(m({'a1.akk': 0.3, 'a1.sein': 0.9}), topics), 'El *Akkusativ* te viene esquivando.');
  assert.equal(humorLine(m({'a1.akk': 0.7, 'a1.sein': 0.9}), topics), 'Todo en orden. Sigamos subiendo.');
});

test('humor: elige el tag más bajo', () => {
  assert.match(humorLine(m({'a1.akk': 0.4, 'a1.sein': 0.1}), topics), /sein/);
});

const progress = {steps: {'t/5': {attempts: [{at: 1, pct: 0, passed: null, pending: ['w1'], ok: 0, bad: 0}], seen: {}}}};
const ltMap = {rules: {R1: {es: 'x', tag: 'a1.akk'}}, categories: {}, notice_categories: []};
const matches = [{offset: 0, length: 2, rule: {id: 'R1', category: {id: 'GRAMMAR'}}}];
const entry = {key: 'w1', topic: 't', step: 5, scene: 'Hostel', text: 'Ich habe', at: 5};
const base = () => ({progress, mastery: {tags: {}, pairs: {}}, log: []});

test('escritura corregida con errores: resuelve, penaliza y loguea', () => {
  const out = applyResolved({state: base(), entry: {...entry, matches}, ltMap, quarantine: [], now: 9});
  assert.equal(out.progress.steps['t/5'].attempts[0].pending.length, 0);
  assert.equal(out.progress.steps['t/5'].attempts[0].bad, 1);
  assert.ok(out.mastery.tags['a1.akk'].m === 0 && out.mastery.tags['a1.akk'].n === 1);
  assert.deepEqual(out.log, [{t: 'lt', rule: 'R1', mapped: true, at: 5}]);
  assert.deepEqual(out.notice, {key: 'w1', topic: 't', step: 5, scene: 'Hostel', ok: false, at: 9});
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

test('estado de escalón', () => {
  assert.equal(stepStatus(undefined), 'sin-intentar');
  assert.equal(stepStatus({passed: true}), 'superado');
  assert.equal(stepStatus({passed: false}), 'reforzar');
  assert.equal(stepStatus({passed: null}), 'pendiente');
});
