// La app funciona offline solo si el service worker cachea todos sus archivos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replaceAll("'", '"').replace(/,\s*\]/, ']'));

function files(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true, recursive: true })
    .filter(d => d.isFile())
    .map(d => relative(root, join(d.parentPath ?? d.path, d.name)));
}

test('SHELL incluye todos los archivos de la app', () => {
  const expected = ['index.html', 'manifest.webmanifest', ...files('css'), ...files('js'), ...files('icons')];
  const missing = expected.filter(f => !shell.includes(f));
  assert.deepEqual(missing, []);
});

test('SHELL no lista archivos inexistentes', () => {
  const existing = new Set(['./', 'index.html', 'manifest.webmanifest', ...files('css'), ...files('js'), ...files('icons')]);
  assert.deepEqual(shell.filter(f => !existing.has(f)), []);
});

test('la CI puede reemplazar la versión de la caché', () => {
  assert.match(sw, /^const CACHE = 'dev';$/m);
});
