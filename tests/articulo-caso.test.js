import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, instances } from '../js/core/generators/articulo-caso.js';

const lexicon = [
  {lemma: 'Hostel', pos: 'noun', article: 'das', plural: 'Hostels', es: 'hostel', field: 'hostel', freq: 1, level: 'A1'},
  {lemma: 'Löffel', pos: 'noun', article: 'der', plural: 'Löffel', es: 'cuchara', field: 'kueche', freq: 1, level: 'A1'},
  {lemma: 'Gabel', pos: 'noun', article: 'die', plural: 'Gabeln', es: 'tenedor', field: 'kueche', freq: 1, level: 'A1'},
  {lemma: 'Messer', pos: 'noun', article: 'das', plural: 'Messer', es: 'cuchillo', field: 'kueche', freq: 1, level: 'A1'},
  {lemma: 'Milch', pos: 'noun', article: 'die', plural: null, es: 'leche', field: 'kueche', freq: 1, level: 'A1'},
  {lemma: 'kochen', pos: 'verb', es: 'cocinar', field: 'kueche', freq: 1, level: 'A1'},
];
const tpl = {id: 'tpl-brauchen-akk', tag_prefix: 'a1.akk', det: 'indef', kase: 'akk', verb: 'brauchen',
  context: 'En el súper.', text: 'Ich brauche ___ {noun}.', slot: {pos: 'noun', fields: ['kueche'], countable: true}};

test('instances: solo palabras de los fields, y countable excluye plural null', () => {
  assert.deepEqual(instances(tpl, lexicon).map(e => e.id),
    ['tpl-brauchen-akk:Löffel', 'tpl-brauchen-akk:Gabel', 'tpl-brauchen-akk:Messer']);
});

test('sin countable entran los de plural null', () => {
  const t = {...tpl, slot: {...tpl.slot, countable: undefined}};
  assert.ok(instances(t, lexicon).some(e => e.id.endsWith(':Milch')));
});

test('generate con rng () => 0 da la primera palabra elegible', () => {
  const ex = generate(tpl, lexicon, () => 0);
  assert.equal(ex.id, 'tpl-brauchen-akk:Löffel');
  assert.deepEqual(ex.answers, ['einen']);
  assert.equal(ex.tag, 'a1.akk.mask');
  assert.equal(ex.type, 'gap');
  assert.equal(ex.generated, true);
  assert.equal(ex.dims.gender, 'm');
  assert.equal(ex.text, 'Ich brauche ___ Löffel.');
});

test('generate respeta la rng y el género de cada palabra', () => {
  assert.equal(generate(tpl, lexicon, () => 0.4).tag, 'a1.akk.fem');
  const n = generate(tpl, lexicon, () => 0.99);
  assert.equal(n.tag, 'a1.akk.neut');
  assert.deepEqual(n.answers, ['ein']);
});

test('una palabra fuera de los fields nunca aparece', () => {
  for (const r of [0, 0.3, 0.6, 0.99]) assert.notEqual(generate(tpl, lexicon, () => r).id, 'tpl-brauchen-akk:Hostel');
});

test('kein y def', () => {
  const kein = generate({...tpl, det: 'kein'}, lexicon, () => 0);
  assert.deepEqual(kein.answers, ['keinen']);
  const def = generate({...tpl, det: 'def'}, lexicon, () => 0.4);
  assert.deepEqual(def.answers, ['die']);
});
