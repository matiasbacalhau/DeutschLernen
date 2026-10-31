import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkExercise, countItems } from '../js/core/checks/index.js';
import { instances } from '../js/core/generators/articulo-caso.js';

const RULE = 'Regla del tag.';
const ctx = {
  topicTitle: 'Artículos',
  curriculum: {tags: {
    t: {rule: RULE, orthographic: false},
    o: {rule: RULE, orthographic: true},
    'a1.akk.mask': {rule: 'Regla akk.', orthographic: false},
  }},
};
const run = (ex, answer) => checkExercise(ex, answer, ctx);
const noLeak = (rs, accepted) => rs.forEach((r) => accepted.forEach((a) => assert.ok(!r.rule?.includes(a), `${r.key} filtra ${a}`)));

test('choice: índice correcto e incorrecto con regla propia', async () => {
  const ex = {id: 'c', type: 'choice', tag: 't', prompt: '?', options: [{text: 'a', correct: true}, {text: 'b', rule: 'Mirá el género.'}, {text: 'c'}]};
  const [ok] = await run(ex, 0);
  assert.deepEqual([ok.key, ok.ok, ok.rule, ok.review], ['c', true, null, false]);
  assert.equal((await run(ex, 1))[0].rule, 'Mirá el género.');
  assert.equal((await run(ex, 2))[0].rule, RULE);
});

test('gap: ok, error anotado, error sin anotar, aviso', async () => {
  const ex = {id: 'g', type: 'gap', tag: 't', text: '___', answers: ['der'], errors: [{answer: 'die', rule: 'No es femenino.'}]};
  assert.equal((await run(ex, 'der'))[0].ok, true);
  assert.equal((await run(ex, 'die'))[0].rule, 'No es femenino.');
  const bad = await run(ex, 'xyz');
  assert.equal(bad[0].rule, RULE);
  noLeak(bad, ex.answers);
  const orth = await run({...ex, tag: 'o', answers: ['Löffel'], errors: []}, 'Loeffel');
  assert.equal(orth[0].ok, false);
  const lax = await run({...ex, answers: ['Löffel']}, 'Loeffel');
  assert.deepEqual([lax[0].ok, lax[0].notice], [true, 'ojo: ö']);
});

test('gap generado: usa diagnose y completa prereq', async () => {
  const tpl = {id: 'tpl', tag_prefix: 'a1.akk', det: 'indef', kase: 'akk', verb: 'brauchen', context: 'x', text: 'Ich brauche ___ {noun}.', slot: {pos: 'noun', fields: ['casa'], countable: false}};
  const lex = [{lemma: 'Löffel', article: 'der', pos: 'noun', field: 'casa', plural: 'Löffel'}];
  const [g] = instances(tpl, lex);
  const [r] = await run(g, 'ein');
  assert.match(r.rule, /brauchen/);
  assert.ok(!r.rule.includes('einen'));
  const [r2] = await run(g, 'eine');
  assert.equal(r2.prereq, 'a1.nom.mask');
  assert.equal((await run(g, 'einen'))[0].ok, true);
});

test('situation con 2 gaps: dos Result con key ex#0 y ex#1', async () => {
  const ex = {id: 'ex', type: 'situation', scene: {title: 't', context: 'c'}, bubbles: [],
    gaps: [{tag: 't', answers: ['der']}, {tag: 't', answers: ['die']}]};
  const rs = await run(ex, ['der', 'das']);
  assert.deepEqual(rs.map((r) => [r.key, r.ok]), [['ex#0', true], ['ex#1', false]]);
  noLeak(rs, ['der', 'die']);
});

test('transform y translate comparan con matchAnswer', async () => {
  const tr = {id: 'tf', type: 'transform', tag: 't', source: 's', instruction: 'i', answers: ['Ich habe einen Hund']};
  assert.equal((await run(tr, 'ich habe einen hund.'))[0].ok, true);
  const tl = {id: 'tl', type: 'translate', tag: 't', from: 'es', source: 's', answers: ['Ich brauche einen Löffel']};
  assert.equal((await run(tl, 'Ich brauche einen Loeffel'))[0].ok, true);
  assert.equal((await run(tl, 'Ich brauche einen Tisch'))[0].ok, false);
});

test('order: acepta cualquier orden válido, compara por texto', async () => {
  const ex = {id: 'o', type: 'order', tag: 't', chunks: ['Die', 'Katze', 'sieht', 'die', 'Maus'],
    answers: [['Die', 'Katze', 'sieht', 'die', 'Maus']]};
  assert.equal((await run(ex, ['Die', 'Katze', 'sieht', 'die', 'Maus']))[0].ok, true);
  assert.equal((await run(ex, ['Die', 'Maus', 'sieht', 'die', 'Katze']))[0].ok, false);
  const two = {...ex, answers: [ex.answers[0], ['Die', 'Maus', 'sieht', 'die', 'Katze']]};
  assert.equal((await run(two, ['Die', 'Maus', 'sieht', 'die', 'Katze']))[0].ok, true);
});

test('chunks repetidos', async () => {
  const ex = {id: 'o', type: 'order', tag: 't', chunks: ['Die', 'Katze', 'sieht', 'die', 'Maus'],
    answers: [['Die', 'Katze', 'sieht', 'die', 'Maus']]};
  // el usuario tocó primero el chunk índice 3 ("die") y luego el índice 0 ("Die"): mismo texto en cada posición
  const byIndex = [3, 1, 2, 0, 4].map((i) => ex.chunks[i]);
  assert.deepEqual(byIndex, ['die', 'Katze', 'sieht', 'Die', 'Maus']);
  assert.equal((await run(ex, byIndex))[0].ok, false);
  const swapped = [0, 1, 2, 3, 4].map((i) => ex.chunks[i]);
  assert.equal((await run(ex, swapped))[0].ok, true);
});

test('spot-error: palabra correcta tocada, corrección mal escrita, ok', async () => {
  const ex = {id: 's', type: 'spot-error', tag: 't', tokens: ['Ich', 'habe', 'ein', 'Hund'], wrong: 2, corrections: ['einen'], rule: 'Akkusativ.'};
  const touched = await run(ex, {index: 1, text: 'x'});
  assert.equal(touched[0].ok, false);
  assert.ok(touched[0].rule.includes('Artículos'));
  assert.equal((await run(ex, {index: 2, text: 'eine'}))[0].ok, false);
  noLeak(await run(ex, {index: 2, text: 'eine'}), ex.corrections);
  assert.equal((await run(ex, {index: 2, text: 'einen'}))[0].ok, true);
});

test('reading: opciones y escritas, una Result por pregunta', async () => {
  const ex = {id: 'r', type: 'reading', title: 't', text: 'x', questions: [
    {tag: 't', prompt: '?', options: [{text: 'a'}, {text: 'b', correct: true}]},
    {tag: 't', prompt: '?', answers: ['Löffel']}]};
  const rs = await run(ex, [0, 'loeffel']);
  assert.deepEqual(rs.map((r) => [r.key, r.ok]), [['r#0', false], ['r#1', true]]);
});

test('detective: regla incorrecta lleva showFicha; apply se evalúa', async () => {
  const ex = {id: 'd', type: 'detective', tag: 't', sentences: [], rules: [{text: 'a'}, {text: 'b', correct: true}],
    apply: [{text: '___', answers: ['einen']}, {text: '___', answers: ['eine']}]};
  const rs = await run(ex, {rule: 0, apply: ['einen', 'x']});
  assert.deepEqual(rs.map((r) => r.key), ['d#0', 'd#1', 'd#2']);
  assert.deepEqual(rs.map((r) => r.ok), [false, true, false]);
  assert.equal(rs[0].showFicha, true);
  noLeak(rs, ['einen', 'eine']);
  const good = await run(ex, {rule: 1, apply: ['einen', 'eine']});
  assert.ok(good.every((r) => r.ok && !r.showFicha));
});

test('countItems coincide con count_items de Python (fixture compartido)', () => {
  const cases = JSON.parse(readFileSync(new URL('./fixtures/count-items.json', import.meta.url)));
  for (const c of cases) assert.equal(countItems(c.exercise), c.items, c.exercise.type);
});

test('tipo desconocido rechaza', async () => {
  await assert.rejects(run({id: 'x', type: 'nada'}, null));
});
