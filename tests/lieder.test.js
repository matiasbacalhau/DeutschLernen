import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLoopRange, splitGapLine, checkGapLine } from '../js/core/lieder.js';
import { addWords } from '../js/core/srs.js';

test('resolveLoopRange: recorte menor a 45s usa bucle completo [0, duration]', () => {
  assert.deepEqual(resolveLoopRange(28.5, { start: 34, end: 62 }), { start: 0, end: 28.5, mode: 'clip' });
});

test('resolveLoopRange: canción entera >= 45s usa timestamps [start, end] del YAML', () => {
  assert.deepEqual(resolveLoopRange(272, { start: 34, end: 62 }), { start: 34, end: 62, mode: 'song' });
});

test('resolveLoopRange: sin loop definido en canción larga usa rango completo', () => {
  assert.deepEqual(resolveLoopRange(210, null), { start: 0, end: 210, mode: 'full' });
});

test('splitGapLine: separa texto y cantidad de huecos', () => {
  const res = splitGapLine('___, hier kommt die ___');
  assert.equal(res.gapCount, 2);
  assert.deepEqual(res.parts, ['', ', hier kommt die ', '']);
});

test('checkGapLine: acepta variantes sin distinguir mayúsculas ni espacios', () => {
  const line = { text: '___, hier kommt die ___', answers: [['Eins', 'eins'], ['Sonne', 'sonne']] };
  assert.deepEqual(checkGapLine([' eins ', 'SONNE'], line), { ok: true, results: [true, true] });
  assert.deepEqual(checkGapLine(['zwei', 'Sonne'], line), { ok: false, results: [false, true] });
});

test('addWords suma lemas de la canción al SRS en rung 1 sin pisar existentes', () => {
  const srs0 = addWords({}, ['Sonne'], 1000);
  const srs1 = addWords(srs0, ['Sonne', 'Stern'], 2000);
  assert.equal(srs1.Sonne.addedAt, 1000);
  assert.equal(srs1.Stern.rung, 1);
  assert.equal(srs1.Stern.addedAt, 2000);
});
