import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewCandidates, itemInfo, exampleFor, curiosityFor, needsFicha, applyCommit, finishGroup, containsAnswer, segments, closeSaved, recordAnswer} from '../js/core/runner.js';

const curriculum = {
  tags: {
    'a1.sein.praesens': {
      rule: 'regla sein',
      examples: [
        {de: 'Ich bin neu hier.', es: 'Soy nuevo acá.', dims: {person: 'ich'}},
        {de: 'Du bist im Hostel.', es: 'Estás en el hostel.', dims: {person: 'du'}},
        {de: 'Wir sind in der Küche.', es: 'Estamos en la cocina.', dims: {person: 'wir'}},
      ],
      curiosities: ['dato del tag'],
    },
  },
};
const lcg = seed => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };

const det = {
  id: 'd', type: 'detective', tag: 'a1.sein.praesens',
  rules: [{text: 'sujeto', correct: true}, {text: 'otra'}],
  apply: [
    {text: 'Hier ___ die Dusche.', answers: ['ist'], dims: {person: 'sie'}},
    {text: 'Oh, du ___ auch hier!', answers: ['bist'], dims: {person: 'du'}},
  ],
  words: ['Dusche'],
};
const sit = {id: 's', type: 'situation', gaps: [{tag: 'a', answers: ['Er'], dims: {p: 1}}, {tag: 'b', answers: ['bin']}]};
const read = {id: 'r', type: 'reading', questions: [{tag: 'q', prompt: 'Wie?', answers: ['Bruno']}, {tag: 'q2', prompt: 'Wann?', options: [{text: 'Um 7.', correct: true}, {text: 'Nie.'}]}]};

test('reviewCandidates: solo cerrados de un ítem de otros temas sin borrador', () => {
  const units = {u: {topics: [
    {topic: 't1', steps: [{n: 1, exercises: [{id: 'a', type: 'gap', tag: 'x'}]}]},
    {topic: 't2', steps: [{n: 1, exercises: [
      {id: 'b', type: 'gap', tag: 'y'}, {id: 'c', type: 'writing-guided'}, {id: 'e', type: 'writing-free'},
      {...sit, id: 'f'}, {id: 'g', type: 'choice', tag: 'y', options: []}, {...det, id: 'h'},
    ]}]},
    {topic: 't3', draft: true, steps: [{n: 1, exercises: [{id: 'z', type: 'gap', tag: 'w'}]}]},
  ]}};
  const out = reviewCandidates(units, 't1');
  assert.deepEqual(out.map(e => e.id), ['b', 'g']);
  assert.equal(out[0].topic, 't2');
});

test('itemInfo: tag, dims y respuestas por clave', () => {
  assert.deepEqual(itemInfo(det, 'd#0').tag, 'a1.sein.praesens');
  assert.deepEqual(itemInfo(det, 'd#2').dims, {person: 'du'});
  assert.deepEqual(itemInfo(det, 'd#2').answers, ['bist']);
  assert.equal(itemInfo(sit, 's#1').tag, 'b');
  assert.equal(itemInfo(read, 'r#0').label, 'Wie?');
  assert.deepEqual(itemInfo(read, 'r#1').answers, ['Um 7.']);
  assert.deepEqual(itemInfo({id: 'o', type: 'order', tag: 't', answers: [['Wo', 'ist', 'das Bad']]}, 'o').answers, ['Wo ist das Bad']);
  assert.deepEqual(itemInfo({id: 'x', type: 'spot-error', tag: 't', corrections: ['sind']}, 'x').answers, ['sind']);
  assert.equal(itemInfo({id: 'w', type: 'writing-free'}, 'w').tag, null);
});

test('containsAnswer: palabra entera, sin mayúsculas ni puntuación', () => {
  assert.ok(containsAnswer('Du bist im Hostel.', 'bist'));
  assert.ok(containsAnswer('Wo ist das Bad?', 'wo ist das bad'));
  assert.ok(!containsAnswer('Ich bin neu hier.', 'bi'));
  assert.ok(!containsAnswer('Ich bin neu hier.', ''));
});

test('exampleFor: nunca contiene la respuesta de un ítem fallado del ejercicio', () => {
  const results = [
    {key: 'd#0', tag: 'a1.sein.praesens', ok: true},
    {key: 'd#1', tag: 'a1.sein.praesens', ok: false},
    {key: 'd#2', tag: 'a1.sein.praesens', ok: false},
  ];
  for (let s = 1; s < 60; s++) {
    const ex = exampleFor(det, results[1], {results, answer: {rule: 0, apply: ['x', 'y']}, curriculum, rng: lcg(s)});
    assert.ok(ex, 'hay ejemplos válidos');
    assert.ok(!/\bbist\b|\bist\b/.test(ex.de), ex.de);
  }
});

test('exampleFor: null si acertó, si no hay ejemplo seguro o si tocó una palabra correcta en spot-error', () => {
  const ok = {key: 'd#1', tag: 'a1.sein.praesens', ok: true};
  assert.equal(exampleFor(det, ok, {results: [ok], answer: {}, curriculum, rng: lcg(1)}), null);
  const se = {id: 'se', type: 'spot-error', tag: 'a1.sein.praesens', tokens: ['a', 'b'], wrong: 1, corrections: ['sind']};
  const r = {key: 'se', tag: 'a1.sein.praesens', ok: false};
  assert.equal(exampleFor(se, r, {results: [r], answer: {index: 0, text: ''}, curriculum, rng: lcg(1)}), null);
  assert.ok(exampleFor(se, r, {results: [r], answer: {index: 1, text: 'x'}, curriculum, rng: lcg(1)}));
  const all = {...det, apply: [{text: '___', answers: ['bin', 'bist', 'sind'], dims: {person: 'sie'}}]};
  const r2 = {key: 'd#1', tag: 'a1.sein.praesens', ok: false};
  assert.equal(exampleFor(all, r2, {results: [r2], answer: {}, curriculum, rng: lcg(1)}), null);
});

test('curiosityFor: solo si todos los ítems están bien', () => {
  const always = () => 0;
  assert.equal(curiosityFor(det, [{key: 'd#0', tag: 'a1.sein.praesens', ok: true}, {key: 'd#1', ok: false}], curriculum, always), null);
  assert.equal(curiosityFor(det, [{key: 'd#0', tag: 'a1.sein.praesens', ok: true}], curriculum, always), 'dato del tag');
});

test('needsFicha: escalón 1, después del primer detective o al principio si es arbitrario', () => {
  const g = {step: 1, index: 0, exercises: [det, {id: 'c', type: 'choice'}]};
  assert.equal(needsFicha(g, {arbitrary: false}), false);
  assert.equal(needsFicha({...g, index: 1}, {arbitrary: false}), true);
  assert.equal(needsFicha({...g, index: 1, fichaShown: true}, {arbitrary: false}), false);
  assert.equal(needsFicha(g, {arbitrary: true}), true);
  assert.equal(needsFicha({...g, step: 2, index: 1}, {arbitrary: true}), false);
});

const group = {
  id: 't1/1@0', topic: 't1', step: 1, startedAt: 0, index: 2, committed: 0,
  exercises: [det, {id: 'g', type: 'gap', tag: 'a1.sein.praesens', words: ['Bad'], review: true}, {id: 'w', type: 'writing-free'}],
  results: [
    {key: 'd#0', tag: 'a1.sein.praesens', ok: true, ms: 5, at: 10},
    {key: 'd#1', tag: 'a1.sein.praesens', ok: false, rule: 'r', ms: 5, at: 10},
    {key: 'd#2', tag: 'a1.sein.praesens', ok: true, ms: 5, at: 10},
    {key: 'g', tag: 'a1.sein.praesens', ok: false, rule: 'r', ms: 3, at: 20},
  ],
};
const state = {mastery: {tags: {}, pairs: {}}, log: [], words: {}, progress: {steps: {}}};

test('applyCommit: mastery, log, palabras y vistos', () => {
  const toApply = group.results;
  const out = applyCommit({group, toApply, state, quarantine: [], now: 99});
  assert.equal(out.mastery.tags['a1.sein.praesens'].n, 4);
  assert.equal(out.log.length, 4);
  assert.deepEqual(out.log[3], {t: 'a', item: 'g', tag: 'a1.sein.praesens', type: 'gap', ok: false, diag: 'r', ms: 3, at: 20});
  assert.deepEqual(out.words, {Dusche: 1, Bad: 1});
  assert.deepEqual(out.progress.steps['t1/1'], {attempts: [], seen: {d: 99}});
});

test('applyCommit: la cuarentena no toca el mastery pero sí el log', () => {
  const out = applyCommit({group, toApply: group.results.slice(3), state, quarantine: ['g'], now: 99});
  assert.deepEqual(out.mastery, state.mastery);
  assert.equal(out.log.length, 1);
});

test('applyCommit: escritura pendiente sin entrada de respuesta; ltRules al log', () => {
  const g = {...group, index: 3, committed: 2};
  const pend = {key: 'w', tag: null, ok: false, pending: true, ms: 1, at: 30};
  assert.deepEqual(applyCommit({group: g, toApply: [pend], state, quarantine: [], now: 99}).log, []);
  const done = {key: 'w', tag: null, ok: false, penalties: [{tag: 'a1.sein.praesens'}], ltRules: [{rule: 'X', mapped: true}, {rule: 'Y', mapped: false}], ms: 1, at: 30};
  const out = applyCommit({group: g, toApply: [done], state, quarantine: [], now: 99});
  assert.deepEqual(out.log.map(e => e.t), ['a', 'lt', 'lt']);
  assert.deepEqual(out.log[2], {t: 'lt', rule: 'Y', mapped: false, at: 30});
  assert.equal(out.mastery.tags['a1.sein.praesens'].n, 1);
});

test('finishGroup: intento en progress, groupEntry y puntaje', () => {
  const g = {...group, exercises: group.exercises.slice(0, 2), index: 2, committed: 2, results: group.results};
  const out = finishGroup(g, {progress: {steps: {}}, log: [{t: 'a'}]}, 500);
  assert.equal(out.log.length, 2);
  assert.deepEqual(out.log[1], {t: 'g', id: 't1/1@0', start: 0, end: 500, abandoned: false, ms: 500});
  assert.equal(out.progress.steps['t1/1'].attempts.length, 1);
  assert.equal(out.score.ok, 2);
  assert.equal(out.score.bad, 1);
});

test('segments: corta el texto en tramos con y sin marca; ignora solapadas', () => {
  const marks = [{offset: 4, length: 4, kind: 'error'}, {offset: 0, length: 3, kind: 'notice'}, {offset: 5, length: 2, kind: 'error'}];
  assert.deepEqual(segments('Ich habe zum', marks), [
    {text: 'Ich', mark: 1}, {text: ' ', mark: null}, {text: 'habe', mark: 0}, {text: ' zum', mark: null},
  ]);
  assert.deepEqual(segments('abc', []), [{text: 'abc', mark: null}]);
});

test('closeSaved: grupo a medias con respuesta sin commit → la aplica y lo registra abandonado', () => {
  const saved = {...group, index: 2, committed: 0};
  const out = closeSaved({saved, state, quarantine: [], now: 700});
  assert.equal(out.mastery.tags['a1.sein.praesens'].n, 4);
  assert.deepEqual(out.log.map(e => e.t), ['a', 'a', 'a', 'a', 'g']);
  assert.equal(out.log.at(-1).abandoned, true);
  assert.equal(out.progress.steps['t1/1'].attempts.length, 0);
  assert.ok('d' in out.progress.steps['t1/1'].seen);
});

test('closeSaved: grupo con todo respondido pero sin pasar por el fin → intento y groupEntry no abandonado', () => {
  const saved = {...group, exercises: group.exercises.slice(0, 2), index: 2, committed: 1};
  const out = closeSaved({saved, state, quarantine: [], now: 700});
  assert.equal(out.log.at(-1).abandoned, false);
  assert.equal(out.progress.steps['t1/1'].attempts.length, 1);
  assert.equal(out.log.filter(e => e.t === 'a').length, 1);
});

test('recordAnswer: agrega resultados, avanza y borra el borrador', () => {
  const g = {...group, index: 0, results: [], draft: {id: 'd', text: 'x', at: 1}};
  const out = recordAnswer(g, [{key: 'd#0', ok: true}]);
  assert.equal(out.index, 1);
  assert.equal(out.results.length, 1);
  assert.equal('draft' in out, false);
});
