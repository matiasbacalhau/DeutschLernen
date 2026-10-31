import { test } from 'node:test';
import assert from 'node:assert/strict';
import { article, present, findArticle } from '../js/core/morph.js';

const TABLE = {
  def: {
    nom: {m: ['der'], f: ['die'], n: ['das'], pl: ['die']},
    akk: {m: ['den'], f: ['die'], n: ['das'], pl: ['die']},
  },
  indef: {
    nom: {m: ['ein'], f: ['eine'], n: ['ein'], pl: []},
    akk: {m: ['einen'], f: ['eine'], n: ['ein'], pl: []},
  },
  kein: {
    nom: {m: ['kein'], f: ['keine'], n: ['kein'], pl: ['keine']},
    akk: {m: ['keinen'], f: ['keine'], n: ['kein'], pl: ['keine']},
  },
};

test('tabla completa de artículos', () => {
  for (const [det, kases] of Object.entries(TABLE))
    for (const [kase, genders] of Object.entries(kases))
      for (const [gender, forms] of Object.entries(genders))
        assert.deepEqual(article(det, kase, gender), forms, `${det} ${kase} ${gender}`);
});

test('presente regular', () => {
  assert.deepEqual(present({lemma: 'wohnen'}, 'ich'), ['wohne']);
  assert.deepEqual(present({lemma: 'wohnen'}, 'du'), ['wohnst']);
  assert.deepEqual(present({lemma: 'wohnen'}, 'er'), ['wohnt']);
  assert.deepEqual(present({lemma: 'wohnen'}, 'wir'), ['wohnen']);
  assert.deepEqual(present({lemma: 'wohnen'}, 'ihr'), ['wohnt']);
  assert.deepEqual(present({lemma: 'wohnen'}, 'sie'), ['wohnen']);
  assert.deepEqual(present({lemma: 'wandern'}, 'du'), ['wanderst']);
});

test('e epentética', () => {
  assert.deepEqual(present({lemma: 'arbeiten'}, 'er'), ['arbeitet']);
  assert.deepEqual(present({lemma: 'arbeiten'}, 'du'), ['arbeitest']);
  assert.deepEqual(present({lemma: 'arbeiten'}, 'ihr'), ['arbeitet']);
  assert.deepEqual(present({lemma: 'finden'}, 'du'), ['findest']);
  assert.deepEqual(present({lemma: 'öffnen'}, 'er'), ['öffnet']);
  assert.deepEqual(present({lemma: 'rechnen'}, 'du'), ['rechnest']);
  assert.deepEqual(present({lemma: 'lernen'}, 'er'), ['lernt']);
});

test('raíz en s/ß/z/x pierde la s en du', () => {
  assert.deepEqual(present({lemma: 'heißen'}, 'du'), ['heißt']);
  assert.deepEqual(present({lemma: 'tanzen'}, 'du'), ['tanzt']);
  assert.deepEqual(present({lemma: 'heißen'}, 'er'), ['heißt']);
});

test('irregular se devuelve tal cual', () => {
  const sein = {lemma: 'sein', irregular: {ich: 'bin', du: 'bist', er: 'ist', wir: 'sind', ihr: 'seid', sie: 'sind'}};
  const moechten = {lemma: 'möchten', irregular: {ich: 'möchte', du: 'möchtest', er: 'möchte', wir: 'möchten', ihr: 'möchtet', sie: 'möchten'}};
  assert.deepEqual(present(sein, 'du'), ['bist']);
  assert.deepEqual(present(moechten, 'er'), ['möchte']);
});

test('findArticle', () => {
  assert.ok(findArticle('den').some(c => c.det === 'def' && c.kase === 'akk' && c.gender === 'm'));
  const die = findArticle('die');
  assert.equal(die.length, 4);
  assert.deepEqual(die.map(c => `${c.kase} ${c.gender}`).sort(), ['akk f', 'akk pl', 'nom f', 'nom pl']);
  assert.deepEqual(findArticle('xyz'), []);
});
