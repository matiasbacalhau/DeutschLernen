// Progreso por escalón: armado del grupo, puntaje, siguiente sugerido y estado de tema. Puro: sin DOM ni azar propio.
//
// Estado `progress`: {steps: {['topic/n']: {attempts: [{at, pct, passed, pending, ok, bad}], seen: {[exerciseId]: at}}}}
//   - `ok`/`bad` son las escrituras correctas/falladas del escalón 5; `pending` lista las ids de escrituras sin corregir.
//   - passed: true | false | null (null = a la espera de una escritura pendiente).
import {countItems} from './checks/index.js';
import {instances} from './generators/articulo-caso.js';
import {pickReview, interleave} from './scheduler.js';
import {masteryOf} from './mastery.js';

const MIN_ITEMS = {1: 10, 2: 14, 3: 14, 4: 12, 5: 3};
const PASS = 0.8;
const MASTERED = 0.8;
const WEAK = 0.5;
const STEPS = [1, 2, 3, 4, 5];

export const stepKey = (topic, n) => `${topic}/${n}`;
const items = exs => exs.reduce((a, e) => a + countItems(e), 0);
const idOf = key => String(key).split('#')[0];
const findTopic = (unit, id) => unit.topics.find(t => t.topic === id);
const hasContent = t => !!t && !t.draft && (t.steps?.length ?? 0) > 0;
const last = (progress, topic, n) => progress.steps[stepKey(topic, n)]?.attempts.at(-1);

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Gaps generados de las plantillas cuyo tag_prefix es prefijo de algún tag del tema, sin repetir ni los ya vistos.
function generated(topic, templates, lexicon, rng, skip) {
  const tpls = (templates ?? []).filter(t => topic.tags.some(tag => tag.startsWith(t.tag_prefix)));
  const pool = new Map();
  for (const t of tpls) for (const e of instances(t, lexicon ?? [])) if (!skip.has(e.id)) pool.set(e.id, e);
  return shuffle([...pool.values()], rng);
}

// opts: {now, rng, templates, lexicon, otherExercises, curriculum?}
// - otherExercises: cerrados de OTROS temas (se filtran a los de un solo ítem); curriculum (opcional) aporta el gating del repaso.
export function buildGroup(unit, topicId, n, progress, mastery, {now, rng, templates, lexicon, otherExercises = [], curriculum} = {}) {
  const topic = findTopic(unit, topicId);
  const stepDef = topic.steps.find(s => s.n === n);
  const prev = progress.steps[stepKey(topicId, n)];
  const seen = prev?.seen ?? {};
  let main;
  if (!prev?.attempts.length) {
    main = stepDef.exercises.filter(e => !e.reserve);
    if (stepDef.generated) main = [...main, ...generated(topic, templates, lexicon, rng, new Set()).slice(0, stepDef.generated)];
  } else {
    const min = MIN_ITEMS[n];
    main = [];
    const add = list => { for (const e of list) { if (items(main) >= min) return; main.push(e); } };
    add(stepDef.exercises.filter(e => !(e.id in seen)));
    if (items(main) < min && stepDef.generated !== undefined) add(generated(topic, templates, lexicon, rng, new Set(Object.keys(seen))));
    const old = [...stepDef.exercises].filter(e => e.id in seen).sort((a, b) => seen[a.id] - seen[b.id]);
    add(old);
  }
  let review = [];
  if (n > 1) {
    const count = n === 5 ? 4 + Math.floor(rng() * 3) : Math.round(items(main) / 4);
    const cands = otherExercises.filter(e => countItems(e) === 1);
    review = pickReview(cands, mastery, {now, rng, count, excludeTags: topic.tags, curriculum}).map(e => ({...e, review: true}));
  }
  return {
    id: `${topicId}/${n}@${now}`,
    topic: topicId,
    step: n,
    exercises: n === 5 ? [...main, ...review] : interleave(main, review, rng),
    index: 0,
    results: [],
    committed: 0,
    startedAt: now,
  };
}

const exerciseIndex = (group, key) => group.exercises.findIndex(e => e.id === idOf(key));

// Devuelve los resultados de los ejercicios con index < group.index aún no aplicados (committed ≤ posición < index).
export function commitNext(group) {
  const toApply = group.results.filter(r => {
    const i = exerciseIndex(group, r.key);
    return i >= group.committed && i < group.index;
  });
  return {group: {...group, committed: Math.max(group.committed, group.index)}, toApply};
}

// Escritura: el texto en español de sus marcas de error (de lt-map); nunca el id ni el nombre de la regla de LanguageTool.
const reasons = r => [r.rule, ...(r.marks ?? []).filter(m => m.kind === 'error').map(m => m.text)].filter(Boolean);

// {pct, passed, pending, failedRules, ok, bad}. Solo cuentan los ejercicios sin `review`.
export function scoreGroup(group) {
  const byId = new Map(group.exercises.map(e => [e.id, e]));
  const counted = group.results.filter(r => byId.has(idOf(r.key)) && !byId.get(idOf(r.key)).review);
  const pending = counted.filter(r => r.pending).map(r => r.key);
  const done = counted.filter(r => !r.pending);
  const ok = done.filter(r => r.ok).length;
  const bad = done.length - ok;
  const failedRules = [...new Set(done.filter(r => !r.ok).flatMap(reasons))];
  if (group.step === 5) {
    const total = group.exercises.filter(e => !e.review).length;
    const passed = ok >= 2 ? true : ok + (total - ok - bad) >= 2 ? null : false;
    return {pct: total ? ok / total : 0, passed, pending, failedRules, ok, bad};
  }
  const pct = done.length ? ok / done.length : 0;
  return {pct, passed: pct >= PASS, pending, failedRules, ok, bad};
}

// Guarda el intento del grupo y marca como vistos sus ejercicios del tema (no el repaso).
export function recordAttempt(progress, group, now) {
  const s = scoreGroup(group);
  const key = stepKey(group.topic, group.step);
  const prev = progress.steps[key] ?? {attempts: [], seen: {}};
  const seen = {...prev.seen};
  for (const e of group.exercises) if (!e.review) seen[e.id] = now;
  const at = {at: now, pct: s.pct, passed: s.passed, pending: s.pending, ok: s.ok, bad: s.bad};
  return {...progress, steps: {...progress.steps, [key]: {attempts: [...prev.attempts, at], seen}}};
}

// Resuelve la escritura `key` (id del ejercicio) en el intento que la tenía pendiente y recalcula su `passed`.
export function resolvePending(progress, key, ok) {
  for (const [sk, st] of Object.entries(progress.steps)) {
    const i = st.attempts.findLastIndex(a => a.pending?.includes(key));
    if (i < 0) continue;
    const a = st.attempts[i];
    const pending = a.pending.filter(k => k !== key);
    const good = a.ok + (ok ? 1 : 0);
    const bad = a.bad + (ok ? 0 : 1);
    const total = good + bad + pending.length;
    const passed = good >= 2 ? true : good + pending.length >= 2 ? null : false;
    const attempts = st.attempts.map((x, j) => (j === i ? {...a, pending, ok: good, bad, pct: total ? good / total : 0, passed} : x));
    return {...progress, steps: {...progress.steps, [sk]: {...st, attempts}}};
  }
  return progress;
}

// mastery: se usa solo cuando todo está superado (el tema con menor mastery mínimo). Devuelve null si la unidad no tiene contenido.
export function suggestNext(unit, progress, now, mastery) {
  const topics = unit.topics.filter(hasContent);
  if (!topics.length) return null;
  const all = topics.flatMap(t => t.steps.map(s => ({topic: t.topic, n: s.n, a: last(progress, t.topic, s.n)})));
  const weak = all.filter(x => x.a && x.a.passed === false).sort((x, y) => x.a.at - y.a.at)[0];
  if (weak) return {topic: weak.topic, step: weak.n};
  const nextStep = t => t.steps.find(s => !last(progress, t.topic, s.n))?.n;
  const latest = all.filter(x => x.a).sort((x, y) => y.a.at - x.a.at)[0];
  const from = latest ? topics.findIndex(t => t.topic === latest.topic) : 0;
  for (let k = 0; k < topics.length; k++) {
    const t = topics[(from + k) % topics.length];
    const n = nextStep(t);
    if (n !== undefined) return {topic: t.topic, step: n};
  }
  const min = t => Math.min(...t.tags.map(tag => masteryOf(mastery, tag)).filter(m => m !== null), 1);
  const t = topics.reduce((a, b) => (min(b) < min(a) ? b : a));
  return {topic: t.topic, step: 1};
}

// topic: entrada de curriculum.topics ({id, unit}) o su id; units: unidades cargadas (con sus tags y pasos).
export function topicStatus(topic, progress, mastery, curriculum, units = []) {
  const id = typeof topic === 'string' ? topic : topic.id ?? topic.topic;
  const entry = curriculum?.topics?.find(t => t.id === id);
  const def = units.flatMap(u => u.topics).find(t => t.topic === id);
  if (!entry?.unit || !hasContent(def)) return 'proximamente';
  const lasts = STEPS.map(n => last(progress, id, n));
  if (!lasts.some(Boolean)) return 'nuevo';
  const ms = def.tags.map(tag => masteryOf(mastery, tag)).filter(m => m !== null);
  const min = ms.length ? Math.min(...ms) : null;
  if (lasts.some(a => a?.passed === false) || (min !== null && min < WEAK)) return 'reforzar';
  if (lasts.every(a => a?.passed === true) && min !== null && min >= MASTERED) return 'dominado';
  return 'en-curso';
}
