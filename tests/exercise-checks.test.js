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

test('transform y translate: una frase mal escrita lleva las palabras que difieren, sin la forma correcta', async () => {
  const tl = {id: 'tl', type: 'translate', tag: 't', from: 'es', source: 's', answers: ['Sie sind in Zimmer 12.', 'Sie sind im Zimmer 12.']};
  const [r] = await run(tl, 'Sie ist in das Zimmer 12.');
  assert.deepEqual(r.wrong, [{offset: 4, length: 3}, {offset: 11, length: 3}]);
  assert.equal(r.rule, RULE);
  assert.equal((await run(tl, 'Sie sind im Zimmer 12.'))[0].wrong, undefined);  assert.equal(r.given, 'Sie ist in das Zimmer 12.');
  assert.equal((await run(tl, 'Sie sind im Zimmer 12.'))[0].given, undefined);
});

test('order: acepta cualquier orden válido, compara por texto', async () => {
  const ex = {id: 'o', type: 'order', tag: 't', chunks: ['Die', 'Katze', 'sieht', 'die', 'Maus'],
    answers: [['Die', 'Katze', 'sieht', 'die', 'Maus']]};
  assert.equal((await run(ex, ['Die', 'Katze', 'sieht', 'die', 'Maus']))[0].ok, true);
  assert.equal((await run(ex, ['Die', 'Maus', 'sieht', 'die', 'Katze']))[0].ok, false);
  const two = {...ex, answers: [ex.answers[0], ['Die', 'Maus', 'sieht', 'die', 'Katze']]};
  assert.equal((await run(two, ['Die', 'Maus', 'sieht', 'die', 'Katze']))[0].ok, true);
});

test('order: la mayúscula de la primera letra se pliega; la del resto de la frase no', async () => {
  const ex = {id: 'o', type: 'order', tag: 't', chunks: ['im Karton', 'sind', 'der', 'Toaster', 'und', 'die', 'Lampe'],
    answers: [['im Karton', 'sind', 'der', 'Toaster', 'und', 'die', 'Lampe'], ['der', 'Toaster', 'und', 'die', 'Lampe', 'sind', 'im Karton']]};
  // Un chunk escrito en minúscula puede abrir la frase.
  assert.equal((await run(ex, ['im Karton', 'sind', 'der', 'Toaster', 'und', 'die', 'Lampe']))[0].ok, true);
  assert.equal((await run(ex, ['der', 'Toaster', 'und', 'die', 'Lampe', 'sind', 'im Karton']))[0].ok, true);
  // Se pliega de los dos lados: una respuesta aceptada escrita con mayúscula inicial coincide con el chunk en minúscula.
  const cap = {...ex, answers: [['Im Karton', 'sind', 'der', 'Toaster', 'und', 'die', 'Lampe']]};
  assert.equal((await run(cap, ['im Karton', 'sind', 'der', 'Toaster', 'und', 'die', 'Lampe']))[0].ok, true);
  // En medio de la frase la mayúscula sigue contando.
  const mid = {...ex, chunks: ['Im Karton', 'sind', 'der', 'Toaster', 'und', 'die', 'Lampe']};
  assert.equal((await run(mid, ['der', 'Toaster', 'und', 'die', 'Lampe', 'sind', 'Im Karton']))[0].ok, false);
  assert.equal((await run(ex, ['im Karton', 'sind', 'der', 'toaster', 'und', 'die', 'Lampe']))[0].ok, false);
});

test('chunks repetidos', async () => {
  const ex = {id: 'o', type: 'order', tag: 't', chunks: ['Die', 'Katze', 'sieht', 'die', 'Maus'],
    answers: [['Die', 'Katze', 'sieht', 'die', 'Maus']]};
  // Orden por índice con los dos chunks "die" intercambiados en la bandeja: el texto resultante es el aceptado.
  const swapped = [3, 1, 2, 0, 4].map((i) => ex.chunks[i]);
  assert.deepEqual(swapped, ['die', 'Katze', 'sieht', 'Die', 'Maus']);
  assert.equal((await run(ex, ['Die', 'Katze', 'sieht', 'die', 'Maus']))[0].ok, true);
  // Chunks idénticos intercambiados por índice: mismo texto, ok.
  const twin = {...ex, chunks: ['die', 'Katze', 'sieht', 'die', 'Maus'], answers: [['die', 'Katze', 'sieht', 'die', 'Maus']]};
  const twinSwapped = [3, 1, 2, 0, 4].map((i) => twin.chunks[i]);
  assert.equal((await run(twin, twinSwapped))[0].ok, true);
  // Negativos: orden equivocado y mayúsculas intercambiadas (se evalúa el orden, no se pliega).
  assert.equal((await run(ex, ['Die', 'Maus', 'sieht', 'die', 'Katze']))[0].ok, false);
  assert.equal((await run(twin, ['Maus', 'sieht', 'die', 'Katze', 'die']))[0].ok, false);
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

test('multi-ítem siempre usa id#n, aun con un ítem; los de un ítem usan id', async () => {
  const sit = {id: 's1', type: 'situation', scene: {}, bubbles: [], gaps: [{tag: 't', answers: ['der']}]};
  assert.deepEqual((await run(sit, ['der'])).map((r) => r.key), ['s1#0']);
  const rd = {id: 'r1', type: 'reading', title: 't', text: 'x', questions: [{tag: 't', prompt: '?', answers: ['der']}]};
  assert.deepEqual((await run(rd, ['der'])).map((r) => r.key), ['r1#0']);
  const gp = {id: 'g1', type: 'gap', tag: 't', text: '___', answers: ['der']};
  assert.deepEqual((await run(gp, 'der')).map((r) => r.key), ['g1']);
});

const tpl = {id: 'tpl', tag_prefix: 'a1.akk', det: 'indef', kase: 'akk', verb: 'brauchen', context: 'x', text: 'Ich brauche ___ {noun}.', slot: {pos: 'noun', fields: ['casa'], countable: false}};
const generated = instances(tpl, [{lemma: 'Löffel', article: 'der', pos: 'noun', field: 'casa', plural: 'Löffel'}])[0];
const SWEEP = [
  [{id: 'c', type: 'choice', tag: 't', prompt: '?', options: [{text: 'der', correct: true}, {text: 'die'}]}, 1, ['der']],
  [{id: 'g', type: 'gap', tag: 't', text: '___', answers: ['der'], errors: [{answer: 'die', rule: 'No es femenino.'}]}, 'die', ['der']],
  [{id: 'g2', type: 'gap', tag: 't', text: '___', answers: ['der']}, 'xyz', ['der']],
  [generated, 'eine', ['einen']],
  [generated, 'ein', ['einen']],
  [{id: 's', type: 'situation', scene: {}, bubbles: [], gaps: [{tag: 't', answers: ['der']}, {tag: 't', answers: ['die']}]}, ['x', 'y'], ['der', 'die']],
  [{id: 'tf', type: 'transform', tag: 't', source: 's', instruction: 'i', answers: ['Ich habe einen Hund']}, 'x', ['Ich habe einen Hund']],
  [{id: 'tl', type: 'translate', tag: 't', from: 'es', source: 's', answers: ['Ich brauche einen Löffel']}, 'x', ['Ich brauche einen Löffel']],
  [{id: 'o', type: 'order', tag: 't', chunks: ['Die', 'Katze'], answers: [['Die', 'Katze']]}, ['Katze', 'Die'], ['Die Katze']],
  [{id: 'se', type: 'spot-error', tag: 't', tokens: ['a', 'b'], wrong: 1, corrections: ['einen'], rule: 'Akkusativ.'}, {index: 1, text: 'x'}, ['einen']],
  [{id: 'se2', type: 'spot-error', tag: 't', tokens: ['a', 'b'], wrong: 1, corrections: ['einen'], rule: 'Akkusativ.'}, {index: 0, text: 'x'}, ['einen']],
  [{id: 'r', type: 'reading', title: 't', text: 'x', questions: [{tag: 't', prompt: '?', options: [{text: 'a', correct: true}, {text: 'b'}]}, {tag: 't', prompt: '?', answers: ['Löffel']}]}, [1, 'x'], ['Löffel']],
  [{id: 'd', type: 'detective', tag: 't', sentences: [], rules: [{text: 'a'}, {text: 'b', correct: true}], apply: [{text: '___', answers: ['einen']}]}, {rule: 0, apply: ['x']}, ['einen']],
];

test('ninguna regla contiene una respuesta aceptada (todos los tipos)', async () => {
  for (const [ex, wrong, accepted] of SWEEP) {
    const rs = await run(ex, wrong);
    assert.ok(rs.some((r) => !r.ok), `${ex.id}: la respuesta mala debe fallar`);
    for (const r of rs) for (const a of accepted) assert.ok(!r.rule?.includes(a), `${ex.id}/${r.key} filtra "${a}": ${r.rule}`);
  }
});

test('tipo desconocido rechaza', async () => {
  await assert.rejects(run({id: 'x', type: 'nada'}, null));
});
