import { test } from 'node:test';
import assert from 'node:assert/strict';
import { germanTexts } from '../tools/german_texts.mjs';

const exercises = [
  {id: 'g1', type: 'gap', text: 'Ich habe ___ Hund.', answers: ['einen', 'den']},
  {id: 'g2', type: 'gap', text: 'Ich ___ müde.', answers: ['bin'], lt_ignore: 'fragmento'},
  {id: 's1', type: 'situation', bubbles: [
    {who: 'them', text: 'Wie heißt ___ Hotel?'}, {who: 'me', text: 'Es heißt ___.'}],
   gaps: [{answers: ['das']}, {answers: ['Sonne']}]},
  {id: 't1', type: 'transform', source: 'Ich sehe den Hund.', answers: ['Ich sehe ihn.', 'Ich sehe den Hund nicht.']},
  {id: 'tr1', type: 'translate', from: 'es', source: 'Tengo un perro.', answers: ['Ich habe einen Hund.']},
  {id: 'o1', type: 'order', chunks: ['Die', 'Katze', 'sieht'], answers: [['Die', 'Katze', 'sieht'], ['Sieht', 'die', 'Katze']]},
  {id: 'c1', type: 'choice', prompt: 'Elegí', options: [{text: 'Ich habe einen Hund.', correct: true}, {text: 'Ich habe ein Hund.'}]},
  {id: 'e1', type: 'spot-error', tokens: ['Ich', 'habe', 'ein', 'Hund'], wrong: 2, corrections: ['einen'], rule: 'x'},
  {id: 'r1', type: 'reading', title: 'T', text: 'Das ist ein Text.', questions: [{prompt: 'p', answers: ['sí'], options: ['Falsche Option']}]},
  {id: 'd1', type: 'detective', sentences: [{de: 'Ich sehe den Hund.'}], rules: [{text: 'regla'}], apply: [{text: 'Ich sehe ___ Mann.', answers: ['den']}]},
  {id: 'w1', type: 'writing-guided', prompt: 'Escribí', tips: ['t'], checklist: ['c'], model: 'Ich heiße Ana.'},
  {id: 'w2', type: 'writing-free', prompt: 'Escribí', model: 'Ich wohne hier.'},
];

const out = germanTexts({
  curriculum: {tags: {'a1.x': {examples: [{de: 'Ich bin müde.', es: 'x'}]}}},
  lexicon: [{lemma: 'Hund', pos: 'noun', article: 'der', plural: 'Hunde', field: 'x'}],
  templates: [{id: 'tpl', tag_prefix: 'a1.akk', det: 'indef', kase: 'akk', verb: 'haben', context: 'c',
    text: 'Ich habe ___ {noun}.', slot: {pos: 'noun', fields: ['x'], countable: true}}],
  units: [{topics: [{topic: 'a1.u1.t1', steps: [{exercises}]}, {topic: 'a1.u1.t2', draft: true, steps: []}]}],
});
const texts = out.map(o => o.text);
const has = (where, text) => assert.ok(out.some(o => o.where === where && o.text === text), `${where}: ${text}`);

test('gap y situation rellenan con la primera respuesta', () => {
  has('g1: text', 'Ich habe einen Hund.');
  has('s1: bubbles[0]', 'Wie heißt das Hotel?');
  has('s1: bubbles[1]', 'Es heißt Sonne.');
});
test('respuestas aceptadas y órdenes', () => {
  has('t1: answers[1]', 'Ich sehe den Hund nicht.');
  has('tr1: answers[0]', 'Ich habe einen Hund.');
  has('o1: answers[1]', 'Sieht die Katze');
  has('d1: apply[0]', 'Ich sehe den Mann.');
});
test('choice: solo correct; spot-error: solo el texto corregido', () => {
  has('c1: options[0]', 'Ich habe einen Hund.');
  assert.ok(!texts.includes('Ich habe ein Hund.'));
  has('e1: corrected', 'Ich habe einen Hund');
  assert.ok(!texts.includes('Ich habe ein Hund'));
  assert.ok(!texts.includes('Falsche Option'));
});
test('reading, escrituras, curriculum, plantillas', () => {
  has('r1: text', 'Das ist ein Text.');
  has('w1: model', 'Ich heißt Ana.'.replace('heißt', 'heiße'));
  has('w2: model', 'Ich wohne hier.');
  has('curriculum a1.x: examples[0]', 'Ich bin müde.');
  has('tpl:Hund: text', 'Ich habe einen Hund.');
});
test('lt_ignore se propaga y nada más lo lleva', () => {
  assert.equal(out.find(o => o.where === 'g2: text').ignore, 'fragmento');
  assert.ok(out.filter(o => o.where !== 'g2: text').every(o => !('ignore' in o)));
});
