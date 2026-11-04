import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instances } from '../js/core/generators/sein-praesens.js';
import { instancesOf } from '../js/core/generators/index.js';
import { diagnose } from '../js/core/diagnose.js';
import { checkWritten } from '../js/core/checks/common.js';

const tpl = {id: 'tpl-sein-muede', kind: 'sein', tag_prefix: 'a1.sein.praesens', context: 'c', text: '{subject} ___ heute total müde.'};

test('sein: una instancia por sujeto, con la forma de su persona', () => {
  const all = instances(tpl);
  assert.deepEqual(all.map(e => [e.text, e.answers]), [
    ['Ich ___ heute total müde.', ['bin']],
    ['Du ___ heute total müde.', ['bist']],
    ['Tom ___ heute total müde.', ['ist']],
    ['Wir ___ heute total müde.', ['sind']],
    ['Ihr ___ heute total müde.', ['seid']],
    ['Tom und Lea ___ heute total müde.', ['sind']],
  ]);
  assert.equal(new Set(all.map(e => e.id)).size, all.length);
  assert.ok(all.every(e => e.type === 'gap' && e.tag === 'a1.sein.praesens' && e.generated && e.dims.person));
});

test('instancesOf elige el generador por `kind` (sin kind: artículos)', () => {
  assert.equal(instancesOf(tpl, []).length, 6);
  const art = {id: 't', tag_prefix: 'a1.akk', det: 'indef', kase: 'akk', verb: 'haben', context: 'c', text: 'Ich habe ___ {noun}.', slot: {pos: 'noun', fields: ['x']}};
  assert.equal(instancesOf(art, [{lemma: 'Hund', pos: 'noun', article: 'der', field: 'x'}])[0].answers[0], 'einen');
});

test('diagnóstico de sein: nombra la persona de la forma escrita, nunca la forma esperada', () => {
  const [, du, , wir] = instances(tpl);
  const tags = {'a1.sein.praesens': {rule: 'Regla sein.'}};
  const d = diagnose(du, 'bin', tags);
  assert.match(d.rule, /\*ich\*/);
  assert.ok(!d.rule.includes('bist'));
  assert.match(diagnose(wir, 'ist', tags).rule, /\*er\*/);
  assert.ok(!diagnose(wir, 'ist', tags).rule.includes('sind'));
  // Algo que no es una forma de sein: la regla del tag.
  assert.equal(diagnose(du, 'bisst', tags).rule, 'Regla sein.');
});

test('un hueco generado fallado guarda lo que se escribió', () => {
  const [, du] = instances(tpl);
  const r = checkWritten(du.id, du, 'bin', {curriculum: {tags: {}}});
  assert.deepEqual([r.ok, r.given], [false, 'bin']);
});
