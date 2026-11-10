import test from 'node:test';
import assert from 'node:assert/strict';
import {commitNext} from '../js/core/progress.js';
import {addWords} from '../js/core/srs.js';
import {correctSentence, reviewCandidates, itemInfo, exampleFor, curiosityFor, needsFicha, applyCommit, finishGroup, containsAnswer, segments, closeSaved, recordAnswer, carryResolved, stopwatch, skipExercise, applyRewrite} from '../js/core/runner.js';
import {withoutAudio} from '../js/core/cards.js';
import {scoreGroup} from '../js/core/progress.js';

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
  assert.deepEqual(out.log[1], {t: 'g', id: 't1/1@0', start: 0, end: 500, abandoned: false, ms: 500, activeMs: 8});
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

test('carryResolved: el grupo en memoria toma las escrituras que la cola resolvió en el store', () => {
  const pend = {key: 'w', tag: null, ok: false, pending: true};
  const done = {key: 'w', tag: null, ok: true, marks: [], penalties: [], applied: true};
  const mem = {id: 'g', results: [{key: 'a', ok: true}, pend, {key: 'b', ok: true}], index: 3};
  const stored = {id: 'g', results: [{key: 'a', ok: true}, done], index: 2};
  assert.deepEqual(carryResolved(mem, stored).results, [{key: 'a', ok: true}, done, {key: 'b', ok: true}]);
  assert.equal(carryResolved(mem, {...stored, id: 'otro'}), mem);
  assert.equal(carryResolved(mem, null), mem);
  assert.equal(carryResolved(mem, {id: 'g', results: [pend]}), mem);
});

test('applyCommit: una escritura ya aplicada desde la cola no se vuelve a aplicar', () => {
  const g = {id: 'g', topic: 't', step: 5, exercises: [{id: 'w', type: 'writing-guided', words: ['Hallo']}], results: []};
  const r = {key: 'w', tag: null, ok: false, penalties: [{tag: 'x'}], marks: [], applied: true, ltRules: [{rule: 'R', mapped: true}]};
  const out = applyCommit({group: g, toApply: [r], state: {mastery: {tags: {}, pairs: {}}, log: [], words: {}, progress: {steps: {}}}, quarantine: [], now: 1});
  assert.deepEqual(out.mastery.tags, {});
  assert.deepEqual(out.log, []);
  assert.deepEqual(out.words, {Hallo: 1});
});

test('stopwatch: el tiempo con la app en segundo plano no cuenta', () => {
  const w = stopwatch(1000);
  w.pause(3000);
  w.pause(4000); // una segunda pausa no reinicia nada
  w.resume(63000);
  w.resume(64000); // reanudar sin pausa no suma
  assert.equal(w.elapsed(65000), 4000); // 2 s antes de la pausa + 2 s después
  const p = stopwatch(0);
  p.pause(10);
  assert.equal(p.elapsed(500), 10); // en pausa, no avanza
});

// Grupo armado a mano con una tarjeta de nivel 1 y un hueco de nivel 3 (las tarjetas todavía no entran en buildGroup).
const word = {lemma: 'Bett', pos: 'noun', article: 'das', es: 'cama', field: 'hostel'};
const vocabGroup = {
  id: 't1/2@0', topic: 't1', step: 2, startedAt: 0, index: 2, committed: 0,
  exercises: [
    {id: 'card:Bett:1:read', type: 'card', rung: 1, mode: 'read', lemma: 'Bett', word, review: true, vocab: {lemma: 'Bett', rung: 1, mode: 'read'}},
    {id: 'card3:tpl-nom-hier:Schlüssel', type: 'gap', tag: 'a1.nom.mask', answers: ['der'], noun: 'Schlüssel', generated: true,
      review: true, vocab: {lemma: 'Schlüssel', rung: 3, mode: 'read'}},
    {id: 'x', type: 'gap', tag: 'a1.sein.praesens', answers: ['bin']},
  ],
  results: [
    {key: 'card:Bett:1:read', tag: null, ok: true, ms: 4, at: 1000},
    {key: 'card3:tpl-nom-hier:Schlüssel', tag: 'a1.nom.mask', ok: false, ms: 6, at: 2000},
  ],
};
const vocabState = () => ({...state, srs: {...addWords({}, ['Bett', 'Schlüssel'], 0), Schlüssel: {...addWords({}, ['Schlüssel'], 0).Schlüssel, rung: 3}}});

test('applyCommit: una tarjeta mueve la SRS y no el mastery; el hueco de nivel 3 mueve las dos', () => {
  const s = vocabState();
  const {group: g, toApply} = commitNext(vocabGroup);
  const out = applyCommit({group: g, toApply, state: s, quarantine: [], now: 3000});
  assert.equal(out.srs.Bett.card.reps, 1);
  assert.equal(out.srs.Bett.listenUnlocked[1], true);
  assert.equal(out.srs.Schlüssel.card.reps, 1);
  assert.equal(out.srs.Schlüssel.rung, 2);
  assert.deepEqual(Object.keys(out.mastery.tags), ['a1.nom.mask']);
  assert.deepEqual(out.log.filter(e => e.t === 'v'), [
    {t: 'v', lemma: 'Bett', rung: 1, mode: 'read', ok: true, ms: 4, at: 1000},
    {t: 'v', lemma: 'Schlüssel', rung: 3, mode: 'read', ok: false, ms: 6, at: 2000},
  ]);
  assert.deepEqual(out.progress.steps['t1/2'].seen, {});
});

test('applyCommit: el mismo grupo otra vez (committed ya avanzado) no vuelve a repasar la palabra', () => {
  const first = commitNext(vocabGroup);
  const out = applyCommit({group: first.group, toApply: first.toApply, state: vocabState(), quarantine: [], now: 3000});
  const again = commitNext(first.group);
  assert.deepEqual(again.toApply, []);
  const out2 = applyCommit({group: again.group, toApply: again.toApply, state: out, quarantine: [], now: 4000});
  assert.equal(out2.srs.Bett.card.reps, 1);
  // Cerrar el grupo guardado tampoco la vuelve a aplicar.
  const closed = closeSaved({saved: first.group, state: out, quarantine: [], now: 5000});
  assert.equal(closed.srs.Bett.card.reps, 1);
  assert.equal(closed.log.filter(e => e.t === 'v').length, 2);
});

test('closeSaved: aplica a la SRS lo respondido sin commit', () => {
  const out = closeSaved({saved: vocabGroup, state: vocabState(), quarantine: [], now: 5000});
  assert.equal(out.srs.Bett.card.reps, 1);
});

test('skipExercise: avanza sin resultado, sin cambiar puntaje, mastery ni SRS', () => {
  const g = {
    id: 'g', topic: 't1', step: 2, index: 1, committed: 0,
    exercises: [{id: 'a', type: 'gap', tag: 'a1.sein.praesens', answers: ['bin']}, {id: 'dict:1', type: 'dictation', text: 'Ich bin hier.'}],
    results: [{key: 'a', tag: 'a1.sein.praesens', ok: true}],
  };
  const before = scoreGroup(g);
  const {group, entry} = skipExercise(g, {now: 9});
  assert.equal(group.index, 2);
  assert.deepEqual(group.results, g.results);
  assert.deepEqual(entry, {t: 'skip-audio', item: 'dict:1', at: 9});
  assert.equal(scoreGroup(group).pct, before.pct);
  const {group: c, toApply} = commitNext(group);
  const st = {...state, srs: addWords({}, ['Bett'], 0)};
  const out = applyCommit({group: c, toApply, state: st, quarantine: [], now: 10});
  assert.deepEqual(out.srs, st.srs);
  assert.deepEqual(out.log.filter(e => e.t === 'v'), []);
});

test('withoutAudio: tarjeta a lectura; situación de escucha y dictado se saltean', () => {
  const w = {lemma: 'Bett', pos: 'noun', article: 'das', es: 'cama'};
  const lexicon = [w, {lemma: 'Tisch', pos: 'noun', article: 'der', es: 'mesa'}, {lemma: 'Haus', pos: 'noun', article: 'das', es: 'casa'}, {lemma: 'Buch', pos: 'noun', article: 'das', es: 'libro'}];
  const card = {id: 'card:Bett:1:listen', type: 'card', rung: 1, mode: 'listen', word: w, vocab: {lemma: 'Bett', rung: 1, mode: 'listen'}};
  const r = withoutAudio(card, {lexicon, rng: lcg(1)});
  assert.equal(r.mode, 'read');
  assert.equal(r.id, 'card:Bett:1:read');
  assert.deepEqual(r.vocab, {lemma: 'Bett', rung: 1, mode: 'read'});
  assert.equal(withoutAudio({id: 's', type: 'situation', listen: true}, {lexicon}), null);
  assert.equal(withoutAudio({id: 'd', type: 'dictation'}, {lexicon}), null);
  const plain = {id: 'x', type: 'gap'};
  assert.equal(withoutAudio(plain, {lexicon}), plain);
});

test('correctSentence: la frase correcta solo tras acertar', () => {
  const ok = [{key: 'g', ok: true}];
  const gap = {type: 'gap', text: 'Hier ___ die Dusche.'};
  assert.equal(correctSentence(gap, 'ist', ok), 'Hier ist die Dusche.');
  assert.equal(correctSentence(gap, 'ist', [{key: 'g', ok: false}]), null);
  assert.equal(correctSentence({type: 'order'}, ['Ich', 'bin', 'neu'], ok), 'Ich bin neu');
  assert.equal(correctSentence({type: 'translate'}, 'Ich bin neu.', ok), 'Ich bin neu.');
  const choice = {type: 'choice', options: [{text: 'Ich bin neu.'}, {text: 'bin'}]};
  assert.equal(correctSentence(choice, 0, ok), 'Ich bin neu.');
  assert.equal(correctSentence(choice, 1, ok), null);
  assert.equal(correctSentence({type: 'dictation'}, 'x y', ok), null);
});

test('correctSentence: el hueco de verbo de nivel 3 no da frase (su texto es "Ich ___ (wohnen) …")', () => {
  const ok = [{key: 'card3:verb:wohnen', ok: true}];
  const verb = {id: 'card3:verb:wohnen', type: 'gap', text: 'Ich ___ (wohnen) …'};
  assert.equal(correctSentence(verb, 'wohne', ok), null);
  const noun = {id: 'card3:tpl-nom-hier:Schlüssel', type: 'gap', text: 'Schau mal, hier ist ___ Schlüssel!'};
  assert.equal(correctSentence(noun, 'der', ok), 'Schau mal, hier ist der Schlüssel!');
});

test('applyCommit: el dictado suelto deja una entrada v por cada palabra cuyo repaso cambió la SRS', () => {
  const dict = {id: 'dict:3', type: 'dictation', text: 'Das Bett und der Schlüssel.', lemmas: ['Bett', 'Schlüssel', 'Zimmer'], review: true};
  const g = {id: 'g', topic: 't1', step: 2, index: 1, committed: 0, exercises: [dict],
    results: [{key: 'dict:3', tag: null, ok: false, lemmaOk: {Bett: true, Schlüssel: false, Zimmer: true}, ms: 7, at: 2000}]};
  // Bett vencida (nivel 2), Schlüssel no vencida, Zimmer fuera de la SRS.
  const srs = addWords({}, ['Bett', 'Schlüssel'], 0);
  srs.Bett = {...srs.Bett, rung: 2};
  srs.Schlüssel = {...srs.Schlüssel, card: {...srs.Schlüssel.card, due: 5000}};
  const {group: c, toApply} = commitNext(g);
  const out = applyCommit({group: c, toApply, state: {...state, srs}, quarantine: [], now: 3000});
  assert.equal(out.srs.Bett.card.reps, 1);
  assert.equal(out.srs.Bett.rung, 2);
  assert.deepEqual(out.srs.Schlüssel, srs.Schlüssel);
  assert.deepEqual(out.log.filter(e => e.t === 'v'), [{t: 'v', lemma: 'Bett', rung: 2, mode: 'listen', ok: true, ms: 7, at: 2000}]);
});

test('applyRewrite: recuperar puntaje y limpiar marcas al corregir una escritura en Reescribir', () => {
  const g = {
    id: 'g', topic: 't1', step: 5, index: 1, committed: 0,
    exercises: [{id: 'w1', type: 'writing-free'}],
    results: [{
      key: 'w1', tag: null, ok: false, score: 0.5,
      marks: [{offset: 0, length: 3, text: 'Error', kind: 'error'}],
      penalties: [{tag: 'a1.sein.praesens'}],
    }],
  };
  const updated = applyRewrite(g, 'w1', {ok: true, score: 1, marks: [], penalties: []});
  const r = updated.results[0];
  assert.equal(r.ok, true);
  assert.equal(r.score, 0.75);
  assert.deepEqual(r.marks, []);
  assert.deepEqual(r.penalties, []);
});
