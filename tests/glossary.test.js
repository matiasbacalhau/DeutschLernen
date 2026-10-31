import test from 'node:test';
import assert from 'node:assert/strict';
import {pickGlossary} from '../js/core/glossary.js';

function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const lexicon = [];
for (let i = 0; i < 12; i++) lexicon.push({lemma: `K${i}`, pos: 'noun', article: 'der', plural: `K${i}n`, es: `k${i}`, field: 'comida', freq: 1 + (i % 3), level: 'A1'});
for (let i = 0; i < 12; i++) lexicon.push({lemma: `H${i}`, pos: 'noun', article: 'die', plural: null, es: `h${i}`, field: 'casa', freq: 1 + (i % 3), level: 'A1'});
const opts = (extra = {}) => ({field: 'comida', level: 'A1', hide: [], rng: lcg(7), n: 10, ...extra});
const count = (g, k) => g.filter(w => w.group === k).length;

test('con 3 vistas y n = 10 → grupos 3 / 4 / 3', () => {
  const seen = {K0: 5, K1: 2, H0: 1};
  const g = pickGlossary(lexicon, seen, opts());
  assert.equal(g.length, 10);
  assert.deepEqual([count(g, 'vista'), count(g, 'cercana'), count(g, 'nivel')], [3, 4, 3]);
  assert.equal(new Set(g.map(w => w.lemma)).size, 10);
});

test('vistas ordenadas por freq y luego por apariciones', () => {
  const seen = {K1: 1, K3: 9, K0: 4, K2: 2};
  const g = pickGlossary(lexicon, seen, opts()).filter(w => w.group === 'vista');
  // freq: K0=1,K3=1,K1=2,K2=3 → K3 (9), K0 (4), K1
  assert.deepEqual(g.map(w => w.lemma), ['K3', 'K0', 'K1']);
});

test('sin vistas', () => {
  const g = pickGlossary(lexicon, {}, opts());
  assert.equal(g.length, 10);
  assert.equal(count(g, 'vista'), 0);
  assert.equal(new Set(g.map(w => w.lemma)).size, 10);
});

test('hide article → article null', () => {
  const g = pickGlossary(lexicon, {K0: 1}, opts({hide: ['article']}));
  assert.ok(g.every(w => w.article === null));
});

test('sin hide conserva artículo y plural', () => {
  const g = pickGlossary(lexicon, {}, opts());
  assert.ok(g.some(w => w.article === 'der' && w.plural));
});
