import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ACCEPTED_WORDS,
  normalizeAcceptedWord,
  buildAcceptedWordsSet,
  isAcceptedWord,
} from '../js/core/accepted-words.js';
import { relevant, gradeWriting, check } from '../js/core/checks/writing.js';

test('normalizeAcceptedWord: quita tildes, pasa a minúsculas y normaliza caracteres', () => {
  assert.equal(normalizeAcceptedWord('Matías'), 'matias');
  assert.equal(normalizeAcceptedWord('matias'), 'matias');
  assert.equal(normalizeAcceptedWord('MATÍAS'), 'matias');
  assert.equal(normalizeAcceptedWord('Matias'), 'matias');
  assert.equal(normalizeAcceptedWord('Madrid'), 'madrid');
  assert.equal(normalizeAcceptedWord('madrid'), 'madrid');
  assert.equal(normalizeAcceptedWord('Córdoba'), 'cordoba');
  assert.equal(normalizeAcceptedWord('cordoba'), 'cordoba');
  assert.equal(normalizeAcceptedWord('München'), 'munchen');
  assert.equal(normalizeAcceptedWord('Munchen'), 'munchen');
});

test('buildAcceptedWordsSet y isAcceptedWord: reconoce nombres y frases compuestas sin distinción de tilde ni mayúscula', () => {
  const set = buildAcceptedWordsSet(['Buenos Aires', 'Rosario'], ['Matías', 'Madrid']);
  assert.equal(isAcceptedWord('matias', set), true);
  assert.equal(isAcceptedWord('Matías', set), true);
  assert.equal(isAcceptedWord('Matias', set), true);
  assert.equal(isAcceptedWord('madrid', set), true);
  assert.equal(isAcceptedWord('Madrid', set), true);
  assert.equal(isAcceptedWord('buenos', set), true);
  assert.equal(isAcceptedWord('Buenos', set), true);
  assert.equal(isAcceptedWord('Aires', set), true);
  assert.equal(isAcceptedWord('rosario', set), true);
  assert.equal(isAcceptedWord('Rosario', set), true);
  assert.equal(isAcceptedWord('perro', set), false);
});

test('DEFAULT_ACCEPTED_WORDS incluye nombres y lugares comunes (Matias, Madrid, etc.)', () => {
  const set = buildAcceptedWordsSet([], DEFAULT_ACCEPTED_WORDS);
  assert.equal(isAcceptedWord('Matias', set), true);
  assert.equal(isAcceptedWord('Matías', set), true);
  assert.equal(isAcceptedWord('matias', set), true);
  assert.equal(isAcceptedWord('Madrid', set), true);
  assert.equal(isAcceptedWord('madrid', set), true);
  assert.equal(isAcceptedWord('Córdoba', set), true);
  assert.equal(isAcceptedWord('cordoba', set), true);
  assert.equal(isAcceptedWord('Leo', set), true);
  assert.equal(isAcceptedWord('Anna', set), true);
});

test('relevant: filtra GERMAN_SPELLER_RULE en palabras aceptadas sin importar mayúsculas o tildes', () => {
  const text = 'Ich bin Matías und wohne in madrid.';
  const matches = [
    { offset: 8, length: 6, rule: { id: 'GERMAN_SPELLER_RULE', category: { id: 'TYPOS' } } },
    { offset: 28, length: 6, rule: { id: 'GERMAN_SPELLER_RULE', category: { id: 'TYPOS' } } },
  ];
  const ltMap = { accepted_words: ['Matias', 'Madrid'] };
  const filtered = relevant(matches, ltMap, { text });
  assert.deepEqual(filtered, []);
});

test('relevant: no filtra errores que no sean de ortografía', () => {
  const text = 'Ich bin einen Matias.';
  const matches = [
    { offset: 14, length: 6, rule: { id: 'AKK_AFTER_SEIN', category: { id: 'GRAMMAR' } } },
  ];
  const ltMap = { accepted_words: ['Matias'] };
  const filtered = relevant(matches, ltMap, { text });
  assert.equal(filtered.length, 1);
});

test('relevant: no filtra palabras desconocidas que no están en la lista', () => {
  const text = 'Ich bin Xyzzq.';
  const matches = [
    { offset: 8, length: 5, rule: { id: 'GERMAN_SPELLER_RULE', category: { id: 'TYPOS' } } },
  ];
  const ltMap = { accepted_words: ['Matias'] };
  const filtered = relevant(matches, ltMap, { text });
  assert.equal(filtered.length, 1);
});

test('gradeWriting con acceptedWords: ignora errores ortográficos en palabras aceptadas', () => {
  const text = 'Ich bin matías.';
  const matches = [
    { offset: 8, length: 6, rule: { id: 'GERMAN_SPELLER_RULE', category: { id: 'TYPOS' } } },
  ];
  const ltMap = { rules: { GERMAN_SPELLER_RULE: { es: 'Ortografía' } }, categories: {}, notice_categories: [] };
  const res = gradeWriting(matches, ltMap, { text, acceptedWords: ['Matias'] });
  assert.equal(res.ok, true);
  assert.deepEqual(res.marks, []);
});

test('gradeWriting con mt.context: funciona con la lista de ltMap sin importar mayúsculas ni tildes', () => {
  const ltMap = {
    rules: { GERMAN_SPELLER_RULE: { es: 'Ortografía' } },
    categories: {},
    notice_categories: [],
    accepted_words: ['Matías', 'Córdoba'],
  };
  // Caso 1: en la lista con tilde 'Matías', el usuario escribió 'matias' (sin tilde)
  const mt1 = {
    offset: 8, length: 6,
    rule: { id: 'GERMAN_SPELLER_RULE', category: { id: 'TYPOS' } },
    context: { text: 'Ich bin matias.', offset: 8, length: 6 },
  };
  const res1 = gradeWriting([mt1], ltMap);
  assert.equal(res1.ok, true);
  assert.deepEqual(res1.marks, []);

  // Caso 2: en la lista 'Córdoba', el usuario escribió 'cordoba' (sin tilde)
  const mt2 = {
    offset: 13, length: 7,
    rule: { id: 'GERMAN_SPELLER_RULE', category: { id: 'TYPOS' } },
    context: { text: 'Ich wohne in cordoba.', offset: 13, length: 7 },
  };
  const res2 = gradeWriting([mt2], ltMap);
  assert.equal(res2.ok, true);
  assert.deepEqual(res2.marks, []);
});

test('check integra acceptedWords y filtra las reglas de ortografía en palabras aceptadas', async () => {
  const lt = {
    check: async () => [
      { offset: 8, length: 6, rule: { id: 'GERMAN_SPELLER_RULE', category: { id: 'TYPOS' } } },
    ],
  };
  const ltMap = { rules: { GERMAN_SPELLER_RULE: { es: 'Ortografía' } }, categories: {}, notice_categories: [] };
  const [res] = await check(
    { id: 'w1', type: 'writing-free' },
    { text: 'Ich bin matías.' },
    { lt, ltMap, acceptedWords: ['Matias'] }
  );
  assert.equal(res.ok, true);
  assert.deepEqual(res.marks, []);
  assert.deepEqual(res.ltRules, []);
});
