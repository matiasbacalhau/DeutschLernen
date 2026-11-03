// Proxy del corrector de gramática (proxy/): validación, prompt, adaptadores y handler, sin red ni SDK.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../proxy/validate.js';
import { nounIndex, recategorize } from '../proxy/genders.js';
import { buildPrompt } from '../proxy/prompt.js';
import { makeClaude } from '../proxy/providers/claude.js';
import { makeGemini } from '../proxy/providers/gemini.js';
import { handle } from '../proxy/worker.js';

const catalog = {
  AKK_MASK: {tag: 'a1.akk.mask', es: 'Regla del acusativo masculino.', hint: 'Accusative masculine article or ending is wrong.'},
  VERB_PERSON: {es: 'Regla de la persona del verbo.', hint: 'Verb does not agree with the subject.'},
};

// validate: de {quote, occurrence, category} a {offset, length, category}

test('validate ubica la cita según la aparición pedida', () => {
  const text = 'Ich habe ein Hund und ein Hund.';
  const {marks, dropped} = validate(text, [{quote: 'ein', occurrence: 2, category: 'AKK_MASK'}], catalog);
  assert.deepEqual(marks, [{offset: 22, length: 3, category: 'AKK_MASK'}]);
  assert.deepEqual(dropped, {});
});

test('validate descarta categorías fuera del catálogo, citas ausentes y citas dentro de otra palabra', () => {
  const text = 'Ich habe ein Hund.';
  const {marks, dropped} = validate(text, [
    {quote: 'ein', occurrence: 1, category: 'SPELLING'},
    {quote: 'eine', occurrence: 1, category: 'AKK_MASK'},
    {quote: 'ein', occurrence: 2, category: 'AKK_MASK'},
    {quote: 'in', occurrence: 1, category: 'AKK_MASK'},
    {quote: '', occurrence: 1, category: 'AKK_MASK'},
  ], catalog);
  assert.deepEqual(marks, []);
  assert.deepEqual(dropped, {category_unknown: 1, quote_not_found: 3, offset_off_word: 1});
});

test('validate acepta citas de varias palabras y descarta la misma marca repetida', () => {
  const text = 'Ich sehe der Mann.';
  const {marks, dropped} = validate(text, [
    {quote: 'der Mann', occurrence: 1, category: 'AKK_MASK'},
    {quote: 'der Mann', occurrence: 1, category: 'AKK_MASK'},
  ], catalog);
  assert.deepEqual(marks, [{offset: 9, length: 8, category: 'AKK_MASK'}]);
  assert.deepEqual(dropped, {duplicate: 1});
});

test('validate cuenta las apariciones como palabra: "ein" dentro de "einen" no cuenta', () => {
  const text = 'Ich habe einen Bruder und ein Schwester.';
  const {marks} = validate(text, [{quote: 'ein', occurrence: 1, category: 'AKK_MASK'}], catalog);
  assert.deepEqual(marks, [{offset: 26, length: 3, category: 'AKK_MASK'}]);
});

test('validate trata ä, ö, ü y ß como letras', () => {
  const {dropped} = validate('Ich möchte Kaffee.', [{quote: 'chte', occurrence: 1, category: 'VERB_PERSON'}], catalog);
  assert.deepEqual(dropped, {offset_off_word: 1});
});

// genders: el género sale del léxico cuando el sustantivo está en él

const nouns = nounIndex([
  {lemma: 'Löffel', pos: 'noun', article: 'der', plural: 'Löffel'},
  {lemma: 'Tasche', pos: 'noun', article: 'die', plural: 'Taschen'},
  {lemma: 'Bett', pos: 'noun', article: 'das', plural: 'Betten'},
  {lemma: 'See', pos: 'noun', article: 'der', plural: 'Seen'},
  {lemma: 'See', pos: 'noun', article: 'die', plural: 'Seen'},
  {lemma: 'Leute', pos: 'noun', article: null, plural: null},
  {lemma: 'gehen', pos: 'verb'},
]);
const err = (category, noun) => ({quote: 'ein', occurrence: 1, category, noun});

test('recategorize: el género del léxico manda sobre el del modelo, en Akkusativ y en Nominativ', () => {
  assert.equal(recategorize(err('AKK_NEUT', 'Löffel')).category, 'AKK_NEUT', 'sin índice no cambia nada');
  assert.equal(recategorize(err('AKK_NEUT', 'Löffel'), nouns).category, 'AKK_MASK');
  assert.equal(recategorize(err('AKK_MASK', 'Tasche'), nouns).category, 'AKK_FEM');
  assert.equal(recategorize(err('NOM_FEM', 'Bett'), nouns).category, 'NOM_NEUT');
  assert.equal(recategorize(err('AKK_MASK', 'Betten'), nouns).category, 'AKK_PLURAL');
  assert.equal(recategorize(err('NOM_MASK', 'Taschen'), nouns).category, 'NOM_PLURAL');
});

test('recategorize: plural igual al singular (Löffel) respeta lo que eligió el modelo entre singular y plural', () => {
  assert.equal(recategorize(err('AKK_PLURAL', 'Löffel'), nouns).category, 'AKK_PLURAL');
  assert.equal(recategorize(err('AKK_FEM', 'Löffel'), nouns).category, 'AKK_MASK');
});

test('recategorize: no toca sustantivos desconocidos, de dos géneros o sin artículo, ni categorías de verbo', () => {
  for (const e of [err('AKK_NEUT', 'Hund'), err('AKK_MASK', 'See'), err('NOM_FEM', 'Leute'), err('AKK_MASK', ''), err('SEIN_FORM', 'Bett'), err('AKK_AFTER_SEIN', 'Löffel')]) {
    assert.deepEqual(recategorize(e, nouns), e);
  }
});

test('recategorize: toma la última palabra si el modelo manda artículo y sustantivo', () => {
  assert.equal(recategorize(err('AKK_NEUT', 'ein Löffel'), nouns).category, 'AKK_MASK');
});

// prompt

test('buildPrompt: el esquema solo admite las categorías del catálogo y el prompt no lleva los textos en español', () => {
  const p = buildPrompt('Ich habe ein Hund.', catalog);
  assert.deepEqual(p.schema.properties.errors.items.properties.category.enum, ['AKK_MASK', 'VERB_PERSON']);
  assert.deepEqual(p.schema.properties.errors.items.required, ['quote', 'occurrence', 'noun', 'category']);
  assert.match(p.system, /AKK_MASK: Accusative masculine/);
  assert.ok(!p.system.includes('Regla del'));
  assert.match(p.user, /Ich habe ein Hund\./);
});

// adaptadores

const prompt = buildPrompt('Ich habe ein Hund.', catalog);
const errors = [{quote: 'ein', occurrence: 1, category: 'AKK_MASK'}];

test('claude: Haiku 5.5 por defecto, salida JSON por esquema y sin temperature', async () => {
  let params, opts;
  const client = {messages: {create: async (p, o) => {
    params = p; opts = o;
    return {stop_reason: 'end_turn', model: 'claude-haiku-5-5', content: [{type: 'thinking', thinking: ''}, {type: 'text', text: JSON.stringify({errors})}]};
  }}};
  const out = await makeClaude(() => client).correct(prompt, {ANTHROPIC_API_KEY: 'k'});
  assert.equal(params.model, 'claude-haiku-5-5');
  assert.deepEqual(params.output_config.format, {type: 'json_schema', schema: prompt.schema});
  assert.equal('temperature' in params, false);
  assert.equal(opts.maxRetries, 0);
  assert.deepEqual(out, {model: 'claude-haiku-5-5', errors});
});

test('claude: CLAUDE_MODEL y EFFORT cambian el modelo y el esfuerzo', async () => {
  let params;
  const client = {messages: {create: async p => { params = p; return {stop_reason: 'end_turn', model: p.model, content: [{type: 'text', text: '{"errors":[]}'}]}; }}};
  await makeClaude(() => client).correct(prompt, {ANTHROPIC_API_KEY: 'k', CLAUDE_MODEL: 'claude-sonnet-5-5', EFFORT: 'low'});
  assert.equal(params.model, 'claude-sonnet-5-5');
  assert.equal(params.output_config.effort, 'low');
});

test('claude: una respuesta rechazada o cortada es un error, no una lista vacía', async () => {
  for (const stop_reason of ['refusal', 'max_tokens']) {
    const client = {messages: {create: async () => ({stop_reason, content: []})}};
    await assert.rejects(makeClaude(() => client).correct(prompt, {}), e => e.stopReason === stop_reason);
  }
});

test('gemini: generateContent con esquema y temperatura 0', async () => {
  let url, init;
  const fetch = async (u, i) => {
    url = u; init = i;
    return new Response(JSON.stringify({candidates: [{content: {parts: [{text: JSON.stringify({errors})}]}}]}));
  };
  const out = await makeGemini(fetch).correct(prompt, {GEMINI_API_KEY: 'g'});
  assert.match(url, /models\/gemini-2\.5-flash-lite:generateContent$/);
  assert.equal(init.headers['x-goog-api-key'], 'g');
  const body = JSON.parse(init.body);
  assert.equal(body.generationConfig.temperature, 0);
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(body.generationConfig.responseSchema.properties.errors.items.properties.category.enum, ['AKK_MASK', 'VERB_PERSON']);
  assert.deepEqual(out, {model: 'gemini-2.5-flash-lite', errors});
});

test('gemini: un status de error se propaga con el status', async () => {
  const fetch = async () => new Response('{}', {status: 429});
  await assert.rejects(makeGemini(fetch).correct(prompt, {GEMINI_API_KEY: 'g'}), e => e.status === 429);
});

// handler

const ORIGIN = 'https://matiasbacalhau.github.io';
const env = {ALLOWED_ORIGINS: ORIGIN, PROVIDER: 'fake', FAKE_KEY: 'x', CF_VERSION_METADATA: {id: 'v1'}};
const TEXT = 'Ich habe ein Hund.';

function setup({correct = async () => ({model: 'fake-1', errors})} = {}) {
  const lines = [];
  const deps = {
    catalog: {...catalog, AKK_NEUT: {es: 'n', hint: 'h'}},
    nouns: nounIndex([{lemma: 'Hund', pos: 'noun', article: 'der', plural: 'Hunde'}]),
    providers: {fake: {key: 'FAKE_KEY', correct}, other: {key: 'OTHER_KEY', correct}},
    log: (level, msg, fields) => lines.push({level, msg, ...fields}),
    hits: new Map(),
  };
  const call = (body, {method = 'POST', origin = ORIGIN, ip = '1.2.3.4'} = {}) => handle(new Request('https://proxy.example/', {
    method, headers: {origin, 'cf-connecting-ip': ip, 'cf-ray': 'ray-1', 'content-type': 'application/json'},
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  }), env, deps);
  return {lines, call};
}

test('handler: corrige y devuelve proveedor, modelo, versión, traceId y marcas, con CORS', async () => {
  const {call, lines} = setup();
  const res = await call({text: TEXT});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.deepEqual(await res.json(), {provider: 'fake', model: 'fake-1', version: 'v1', traceId: 'ray-1', marks: [{offset: 9, length: 3, category: 'AKK_MASK'}]});
  const summary = lines.find(l => l.msg === 'grammar corrected');
  assert.equal(summary.level, 'info');
  assert.equal(summary.traceId, 'ray-1');
  assert.equal(summary.marks, 1);
});

test('handler: corrige el género con el léxico y lo cuenta en el resumen', async () => {
  const {call, lines} = setup({correct: async () => ({model: 'fake-1', errors: [{quote: 'ein', occurrence: 1, noun: 'Hund', category: 'AKK_NEUT'}]})});
  const res = await call({text: TEXT});
  assert.deepEqual((await res.json()).marks, [{offset: 9, length: 3, category: 'AKK_MASK'}]);
  assert.equal(lines.find(l => l.msg === 'grammar corrected').recategorized, 1);
});

test('handler: preflight del origen permitido', async () => {
  const {call} = setup();
  const res = await call(null, {method: 'OPTIONS'});
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-methods'), 'POST');
});

test('handler: rechaza otro origen, otro método, texto largo y proveedor desconocido o sin clave, y deja una línea por cada rechazo', async () => {
  const {call, lines} = setup();
  assert.equal((await call({text: TEXT}, {origin: 'https://evil.example'})).status, 403);
  assert.equal((await call(null, {method: 'GET'})).status, 405);
  assert.equal((await call({text: 'a'.repeat(2001)})).status, 413);
  assert.equal((await call({text: 42})).status, 400);
  assert.equal((await call({text: TEXT, provider: 'nope'})).status, 400);
  assert.equal((await call({text: TEXT, provider: 'other'})).status, 503);
  assert.deepEqual(lines.map(l => [l.level, l.reason]), [
    ['warn', 'origin'], ['warn', 'method'], ['warn', 'too_long'], ['warn', 'bad_body'], ['warn', 'unknown_provider'], ['warn', 'provider_not_configured'],
  ]);
});

test('handler: rate limit por IP', async () => {
  const {call} = setup();
  for (let i = 0; i < 20; i++) assert.equal((await call({text: TEXT})).status, 200);
  assert.equal((await call({text: TEXT})).status, 429);
  assert.equal((await call({text: TEXT}, {ip: '5.6.7.8'})).status, 200);
});

test('handler: error del proveedor → 502 con una línea warn', async () => {
  const {call, lines} = setup({correct: async () => { throw Object.assign(new Error('upstream'), {status: 529}); }});
  const res = await call({text: TEXT});
  assert.equal(res.status, 502);
  const l = lines.find(x => x.msg === 'provider failed');
  assert.equal(l.level, 'warn');
  assert.equal(l.status, 529);
});

test('handler: el rechazo por origen dice qué origen llegó; el fallo del proveedor, su stop_reason', async () => {
  const {call, lines} = setup({correct: async () => { throw Object.assign(new Error('stop_reason refusal'), {stopReason: 'refusal'}); }});
  await call({text: TEXT}, {origin: 'https://otro.example'});
  await call({text: TEXT});
  assert.equal(lines.find(l => l.reason === 'origin').origin, 'https://otro.example');
  assert.equal(lines.find(l => l.msg === 'provider failed').stopReason, 'refusal');
});

test('handler: las marcas descartadas se loguean con su motivo', async () => {
  const {call, lines} = setup({correct: async () => ({model: 'fake-1', errors: [{quote: 'zz', occurrence: 1, category: 'AKK_MASK'}]})});
  await call({text: TEXT});
  const l = lines.find(x => x.msg === 'marks dropped');
  assert.deepEqual(l.dropped, {quote_not_found: 1});
});

test('handler: el texto del usuario nunca llega al log', async () => {
  const {call, lines} = setup({correct: async () => { throw new Error('boom'); }});
  await call({text: 'Geheimnis eins.'});
  await call({text: 'Geheimnis zwei.'}, {origin: 'https://evil.example'});
  assert.ok(!JSON.stringify(lines).includes('Geheimnis'));
});
