import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../js/core/router.js';

test('hash vacío o raíz → home', () => {
  assert.deepEqual(parseHash(''), { view: 'home', params: [] });
  assert.deepEqual(parseHash('#/'), { view: 'home', params: [] });
});

test('vista y parámetros', () => {
  assert.deepEqual(parseHash('#/ajustes'), { view: 'ajustes', params: [] });
  assert.deepEqual(parseHash('#/unidad/a1/01'), { view: 'unidad', params: ['a1', '01'] });
  assert.deepEqual(parseHash('#/ficha/Wechselpr%C3%A4p'), { view: 'ficha', params: ['Wechselpräp'] });
});
