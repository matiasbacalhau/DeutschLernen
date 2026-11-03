import test from 'node:test';
import assert from 'node:assert/strict';
import {answerEntry, groupEntry, ltEntry, countWords} from '../js/core/log.js';

const result = {key: 'a1-art-0042', tag: 'ART_NOM', ok: false, rule: 'ART_ACC', notice: null, prereq: null, review: false};

test('answerEntry', () => {
  const e = answerEntry(result, {exerciseId: 'a1-art-0042', type: 'gap', ms: 4210, at: 1790000000000});
  assert.deepEqual(e, {t: 'a', item: 'a1-art-0042', tag: 'ART_NOM', type: 'gap', ok: false, diag: 'ART_ACC', ms: 4210, at: 1790000000000});
  assert.ok(JSON.stringify(e).length < 200);
});

test('dos huecos de una misma situación → items distintos', () => {
  const a = answerEntry({...result, key: 'sit-7#0'}, {type: 'situation', ms: 1, at: 2});
  const b = answerEntry({...result, key: 'sit-7#1'}, {type: 'situation', ms: 1, at: 2});
  assert.notEqual(a.item, b.item);
  assert.ok(JSON.stringify(a).length < 200);
});

test('answerEntry correcto y de escritura: diag null, tag null', () => {
  const e = answerEntry({...result, ok: true, rule: null, tag: null}, {exerciseId: 'w1', type: 'writing', ms: 1, at: 2});
  assert.equal(e.diag, null);
  assert.equal(e.tag, null);
});

test('groupEntry', () => {
  assert.deepEqual(groupEntry({id: 'g1', startedAt: 10, endedAt: 70, abandoned: false}),
    {t: 'g', id: 'g1', start: 10, end: 70, abandoned: false, ms: 60});
});

test('ltEntry', () => {
  assert.deepEqual(ltEntry({rule: 'GERMAN_WORD_REPEAT_RULE', mapped: false, at: 5}),
    {t: 'lt', rule: 'GERMAN_WORD_REPEAT_RULE', mapped: false, at: 5});
});

test('countWords suma', () => {
  const seen = {Tisch: 1};
  const out = countWords(seen, ['Tisch', 'Haus', 'Haus']);
  assert.deepEqual(out, {Tisch: 2, Haus: 2});
  assert.deepEqual(seen, {Tisch: 1}, 'no muta la entrada');
});

test('ltEntry con origen del corrector', () => {
  assert.deepEqual(ltEntry({rule: 'llm:AKK_MASK', mapped: true, at: 5, src: {provider: 'claude', model: 'm', trace: 't'}}),
    {t: 'lt', rule: 'llm:AKK_MASK', mapped: true, at: 5, src: {provider: 'claude', model: 'm', trace: 't'}});
});
