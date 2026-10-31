import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchAnswer, clean } from '../js/core/normalize.js';

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
