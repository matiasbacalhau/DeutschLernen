import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchAnswer, clean, wrongWords } from '../js/core/normalize.js';

test('exacto', () => assert.deepEqual(matchAnswer('den', ['den'], {orthographic: false}), {ok: true, notice: null}));
test('variantes del teclado iOS', () => {
  assert.equal(matchAnswer('  Ich  bin  müde. ', ['ich bin müde'], {orthographic: false}).ok, true);
  assert.equal(matchAnswer('Wie geht’s?', ["Wie geht's?"], {orthographic: false}).ok, true);
});
test('clean: comillas tipográficas y puntuación final', () =>
  assert.equal(clean(' „Hallo“  Welt! '), '"Hallo" Welt'));
test('mayúscula inicial no ortográfica: ok sin aviso', () =>
  assert.deepEqual(matchAnswer('Den', ['den'], {orthographic: false}), {ok: true, notice: null}));
test('ss por ß no ortográfico: ok con aviso', () =>
  assert.deepEqual(matchAnswer('Strasse', ['Straße'], {orthographic: false}), {ok: true, notice: 'ojo: ß'}));
test('ue por ü: ok con aviso', () => assert.equal(matchAnswer('muede', ['müde'], {orthographic: false}).notice, 'ojo: ü'));
test('sin umlaut (u por ü): ok con aviso', () => assert.equal(matchAnswer('mude', ['müde'], {orthographic: false}).notice, 'ojo: ü'));
test('sustantivo en minúscula no ortográfico: ok con aviso', () =>
  assert.deepEqual(matchAnswer('ich brauche einen löffel', ['Ich brauche einen Löffel'], {orthographic: false}),
    {ok: true, notice: 'ojo: mayúscula'}));
test('tag ortográfico exige ß, umlaut y mayúscula', () => {
  assert.equal(matchAnswer('Strasse', ['Straße'], {orthographic: true}).ok, false);
  assert.equal(matchAnswer('ich brauche einen löffel', ['Ich brauche einen Löffel'], {orthographic: true}).ok, false);
});
test('nunca borra el rasgo evaluado: einen ≠ ein', () => assert.equal(matchAnswer('ein', ['einen'], {orthographic: false}).ok, false));
test('ortográfico: palabra suelta exige mayúscula inicial', () =>
  assert.equal(matchAnswer('löffel', ['Löffel'], {orthographic: true}).ok, false));
test('ortográfico: frase tolera mayúscula de inicio de oración', () =>
  assert.equal(matchAnswer('ich brauche einen Löffel', ['Ich brauche einen Löffel'], {orthographic: true}).ok, true));

const words = (text, ws) => ws.map(w => text.slice(w.offset, w.offset + w.length));
test('wrongWords: subraya las palabras que no están en la respuesta más parecida', () => {
  const t = 'Sie ist in das Zimmer 12.';
  assert.deepEqual(words(t, wrongWords(t, ['Sie sind in Zimmer 12.', 'Sie sind im Zimmer 12.', 'Im Zimmer 12 sind Sie.'], {orthographic: false})), ['ist', 'das']);
});
test('wrongWords: el orden cuenta (otra posición es otra palabra)', () => {
  const t = 'Sie in Zimmer 12 sind.';
  assert.deepEqual(words(t, wrongWords(t, ['Sie sind in Zimmer 12.'], {orthographic: false})), ['sind']);
});
test('wrongWords: tolera mayúscula, puntuación y, si el tag no es ortográfico, umlauts', () => {
  const t = 'ich brauche ein Loeffel';
  assert.deepEqual(words(t, wrongWords(t, ['Ich brauche einen Löffel.'], {orthographic: false})), ['ein']);
  assert.deepEqual(words(t, wrongWords(t, ['Ich brauche einen Löffel.'], {orthographic: true})), ['ein', 'Loeffel']);
});
test('wrongWords: una palabra suelta no se subraya', () =>
  assert.deepEqual(wrongWords('die', ['der'], {orthographic: false}), []));
