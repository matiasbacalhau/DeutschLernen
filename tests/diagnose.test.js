import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnose } from '../js/core/diagnose.js';

const item = (gender, det = 'indef', extra = {}) => ({tag: `a1.akk.${{m: 'mask', f: 'fem', n: 'neut'}[gender]}`,
  dims: {gender, kase: 'akk', det}, noun: 'Löffel', verb: 'brauchen', ...extra});

test('caso equivocado: nombra la regla de caso y no la forma esperada', () => {
  const d = diagnose(item('m'), 'ein');
  assert.match(d.rule, /brauchen.*Akkusativ \(objeto directo\)/);
  assert.doesNotMatch(d.rule, /einen/);
  assert.equal(d.prereq, null);
});

test('género equivocado: nombra el género y apunta al prerrequisito', () => {
  const d = diagnose(item('m'), 'eine');
  assert.equal(d.rule, '*Löffel* no es femenino: revisá el género.');
  assert.doesNotMatch(d.rule, /einen/);
  assert.equal(d.prereq, 'a1.nom.mask');
});

test('género y casos con def y kein sin filtrar la forma', () => {
  assert.equal(diagnose(item('m', 'def'), 'der').prereq, null);
  assert.doesNotMatch(diagnose(item('m', 'def'), 'der').rule, /\bden\b/);
  assert.equal(diagnose(item('m', 'def'), 'das').prereq, 'a1.nom.mask');
  assert.doesNotMatch(diagnose(item('m', 'kein'), 'kein').rule, /keinen/);
  assert.match(diagnose(item('f', 'indef', {noun: 'Gabel'}), 'ein').rule, /\*Gabel\* no es neutro|masculino/);
});

test('ninguna celda: la rule del tag', () => {
  const tags = {'a1.akk.mask': {rule: 'La regla del tag.'}};
  const d = diagnose(item('m'), 'xyz', tags);
  assert.deepEqual(d, {rule: 'La regla del tag.', prereq: null});
});
