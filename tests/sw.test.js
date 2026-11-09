// La app funciona offline solo si el service worker cachea todos sus archivos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replaceAll("'", '"').replace(/,\s*\]/, ']'));

// Recorrido a mano: readdirSync({recursive}) pide Node ≥ 18.17 y los tests corren con Node 18 o más nuevo.
function files(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true })
    .flatMap(d => (d.isDirectory() ? files(join(dir, d.name)) : d.isFile() ? [relative(root, join(root, dir, d.name))] : []));
}

test('SHELL incluye todos los archivos de la app', () => {
  const expected = ['index.html', 'manifest.webmanifest', ...files('css'), ...files('js'), ...files('icons'), ...files('data'), ...files('fonts'), ...files('images')];
  const missing = expected.filter(f => !shell.includes(f));
  assert.deepEqual(missing, []);
});

test('SHELL no lista archivos inexistentes', () => {
  const existing = new Set(['./', 'index.html', 'manifest.webmanifest', ...files('css'), ...files('js'), ...files('icons'), ...files('data'), ...files('fonts'), ...files('images')]);
  assert.deepEqual(shell.filter(f => !existing.has(f)), []);
});

test('la CI puede reemplazar la versión de la caché', () => {
  assert.match(sw, /^const CACHE = 'dev';$/m);
});

test('la CI copia a _site todos los archivos y carpetas que usa SHELL', () => {
  const ci = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
  const cpLine = ci.match(/cp -r ([^\n]+) _site\//)?.[1] ?? '';
  const copied = new Set(cpLine.trim().split(/\s+/));
  const topEntries = new Set(shell.filter(p => p !== './').map(p => p.split('/')[0]));
  const missing = [...topEntries].filter(e => !copied.has(e));
  assert.deepEqual(missing, []);
});
