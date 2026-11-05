// Lógica del runner de grupos que no toca el DOM: candidatos de repaso, datos por ítem, ejemplo seguro,
// cuándo va la ficha y los efectos de confirmar resultados (mastery, log, palabras, vistos) y de cerrar el grupo.
import {countItems} from './checks/index.js';
import {applyResult} from './mastery.js';
import {pickExample, pickCuriosity} from './feedback.js';
import {answerEntry, groupEntry, ltEntry, vocabEntry, skipEntry, countWords} from './log.js';
import {reviewWord, reviewDue} from './srs.js';
import {stepKey, recordAttempt, scoreGroup, commitNext} from './progress.js';

const WRITING = new Set(['writing-guided', 'writing-free']);
const idOf = key => String(key).split('#')[0];
const nOf = key => Number(String(key).split('#')[1] ?? 0);
const correctTexts = options => (options ?? []).filter(o => o.correct).map(o => o.text);

// Ejercicios cerrados de un solo ítem de los OTROS temas con contenido; cada copia lleva su `topic`.
export function reviewCandidates(units, topicId) {
  const out = [];
  for (const unit of Object.values(units)) {
    for (const t of unit.topics) {
      if (t.draft || t.topic === topicId) continue;
      for (const s of t.steps ?? []) {
        for (const e of s.exercises) if (!WRITING.has(e.type) && countItems(e) === 1) out.push({...e, topic: t.topic});
      }
    }
  }
  return out;
}

// {tag, dims, answers, label} del ítem `key` de `ex`. `answers` son las formas aceptadas (texto).
export function itemInfo(ex, key) {
  const n = nOf(key);
  switch (ex.type) {
    case 'situation': {
      const g = ex.gaps[n];
      return {tag: g.tag, dims: g.dims, answers: g.answers, label: `Hueco ${n + 1}`};
    }
    case 'reading': {
      const q = ex.questions[n];
      return {tag: q.tag, dims: q.dims, answers: q.options ? correctTexts(q.options) : q.answers, label: q.prompt};
    }
    case 'detective': {
      if (n === 0) return {tag: ex.tag, dims: undefined, answers: correctTexts(ex.rules), label: 'La regla'};
      const a = ex.apply[n - 1];
      return {tag: ex.tag, dims: a.dims, answers: a.answers, label: a.text};
    }
    case 'choice': return {tag: ex.tag, dims: ex.dims, answers: correctTexts(ex.options), label: null};
    case 'order': return {tag: ex.tag, dims: ex.dims, answers: ex.answers.map(a => a.join(' ')), label: null};
    case 'spot-error': return {tag: ex.tag, dims: ex.dims, answers: ex.corrections, label: null};
    case 'writing-guided':
    case 'writing-free': return {tag: null, dims: undefined, answers: [], label: null};
    default: return {tag: ex.tag, dims: ex.dims, answers: ex.answers ?? [], label: null};
  }
}

const tokens = s => String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

// ¿`text` contiene `answer` como secuencia de palabras enteras? (sin mayúsculas ni puntuación)
export function containsAnswer(text, answer) {
  const t = tokens(text);
  const a = tokens(answer);
  if (!a.length) return false;
  for (let i = 0; i + a.length <= t.length; i++) if (a.every((w, j) => t[i + j] === w)) return true;
  return false;
}

const TRIES = 12;

// Ejemplo de pickExample para un ítem fallado, descartando los que contengan la respuesta de algún ítem fallado
// del mismo ejercicio. null si acertó, si no hay ejemplo seguro, o en spot-error si tocó una palabra correcta (§5.5).
export function exampleFor(ex, result, {results, answer, curriculum, rng}) {
  if (result.ok) return null;
  if (ex.type === 'spot-error' && answer?.index !== ex.wrong) return null;
  const {tag, dims} = itemInfo(ex, result.key);
  if (!tag) return null;
  const forbidden = results.filter(r => !r.ok).flatMap(r => itemInfo(ex, r.key).answers ?? []);
  for (let i = 0; i < TRIES; i++) {
    const e = pickExample(tag, dims, curriculum, rng);
    if (!e) return null;
    if (!forbidden.some(a => containsAnswer(e.de, a))) return e;
  }
  return null;
}

// Dato curioso solo si todos los ítems del ejercicio están bien (así no delata la forma de uno fallado).
export function curiosityFor(ex, results, curriculum, rng) {
  if (!results.length || !results.every(r => r.ok)) return null;
  return pickCuriosity(ex, results[0].tag ?? ex.tag, curriculum, rng);
}

// Ficha del escalón 1 (§5.3): al principio si el tema es arbitrario; si no, después del primer detective.
export function needsFicha(group, topic) {
  if (group.step !== 1 || group.fichaShown) return false;
  if (topic.arbitrary) return true;
  return group.exercises.slice(0, group.index).some(e => e.type === 'detective');
}

// Aplica los resultados confirmados. state: {mastery, log, words, progress, srs}; quarantine: ids (array).
// Cada resultado lleva `ms` y `at` (los pone la UI al responder). Los ejercicios con `vocab` (tarjetas, huecos y
// dictados de nivel 3) además repasan su palabra en la SRS; el dictado, por lo que dice `lemmaOk` de esa palabra.
// Un dictado suelto repasa solo FSRS de cada palabra suya que esté vencida, sin cambiar su nivel (spec §6.1).
export function applyCommit({group, toApply, state, quarantine, now}) {
  const byId = new Map(group.exercises.map(e => [e.id, e]));
  const q = new Set(quarantine);
  let {mastery, words} = state;
  let srs = state.srs ?? {};
  const log = [...state.log];
  const touched = [];
  for (const r of toApply) {
    const ex = byId.get(idOf(r.key));
    if (!touched.includes(ex)) touched.push(ex);
    if (r.pending || r.applied) continue; // pendiente: la aplica la cola; applied: ya la aplicó la cola
    mastery = applyResult(mastery, {...r, type: ex.type, exerciseId: ex.id}, {now, quarantine: q});
    log.push(answerEntry(r, {type: ex.type, ms: r.ms, at: r.at}));
    for (const lt of r.ltRules ?? []) log.push(ltEntry({...lt, at: r.at}));
    if (ex.vocab) {
      const {lemma, rung, mode} = ex.vocab;
      const ok = ex.type === 'dictation' ? !!r.lemmaOk?.[lemma] : r.ok;
      srs = reviewWord(srs, lemma, ok, {now: r.at, rung, mode});
      log.push(vocabEntry({lemma, rung, mode, ok, ms: r.ms, at: r.at}));
    } else if (ex.type === 'dictation') {
      for (const [lemma, ok] of Object.entries(r.lemmaOk ?? {})) srs = reviewDue(srs, lemma, ok, {now: r.at});
    }
  }
  for (const ex of touched) words = countWords(words, ex.words ?? []);
  const key = stepKey(group.topic, group.step);
  const prev = state.progress.steps[key] ?? {attempts: [], seen: {}};
  const seen = {...prev.seen};
  for (const ex of touched) if (!ex.review) seen[ex.id] = now;
  const progress = {...state.progress, steps: {...state.progress.steps, [key]: {...prev, seen}}};
  return {mastery, log, words, progress, srs};
}

// Cierre del grupo: intento en progress, entrada de grupo en el log y puntaje.
export function finishGroup(group, {progress, log}, now) {
  return {
    progress: recordAttempt(progress, group, now),
    log: [...log, groupEntry({id: group.id, startedAt: group.startedAt, endedAt: now, abandoned: false})],
    score: scoreGroup(group),
  };
}

// Tramos de `text` para subrayar las marcas de una escritura: [{text, mark: índice en `marks` | null}].
// Las marcas se ordenan por offset; una que se solapa con la anterior se ignora.
export function segments(text, marks) {
  const order = marks.map((m, i) => ({...m, i})).sort((a, b) => a.offset - b.offset);
  const out = [];
  let pos = 0;
  for (const m of order) {
    if (m.offset < pos) continue;
    if (m.offset > pos) out.push({text: text.slice(pos, m.offset), mark: null});
    out.push({text: text.slice(m.offset, m.offset + m.length), mark: m.i});
    pos = m.offset + m.length;
  }
  if (pos < text.length || !out.length) out.push({text: text.slice(pos), mark: null});
  return out;
}

// El grupo en memoria de la vista toma las escrituras que la cola resolvió en el grupo guardado (mismo id),
// así guardarlo no las vuelve a dejar pendientes.
export function carryResolved(mem, stored) {
  if (!stored || stored.id !== mem.id) return mem;
  let changed = false;
  const results = mem.results.map(r => {
    if (!r.pending) return r;
    const s = stored.results.find(x => x.key === r.key && !x.pending);
    if (!s) return r;
    changed = true;
    return s;
  });
  return changed ? {...mem, results} : mem;
}

// Respuesta de un ejercicio: suma los resultados, avanza y borra el borrador de escritura.
export function recordAnswer(group, results) {
  const {draft, ...rest} = group;
  return {...rest, results: [...group.results, ...results], index: group.index + 1};
}

// Cierra el grupo guardado antes de empezar otro: primero aplica lo respondido sin commit; si estaba todo
// respondido, registra el intento (no abandonado); si no, lo deja en el log como abandonado.
export function closeSaved({saved, state, quarantine, now}) {
  let s = state;
  let g = saved;
  if (g.index > g.committed) {
    const c = commitNext(g);
    s = applyCommit({group: g, toApply: c.toApply, state: s, quarantine, now});
    g = c.group;
  }
  if (g.index >= g.exercises.length) {
    const f = finishGroup(g, {progress: s.progress, log: s.log}, now);
    return {...s, progress: f.progress, log: f.log};
  }
  return {...s, log: [...s.log, groupEntry({id: g.id, startedAt: g.startedAt, endedAt: now, abandoned: true})]};
}

// Salta el ejercicio actual sin resultado: ni puntaje, ni mastery, ni SRS (spec §6.3). `entry` va al log.
export function skipExercise(group, {now}) {
  const item = group.exercises[group.index].id;
  return {group: {...group, index: group.index + 1}, entry: skipEntry({item, at: now})};
}

// Cronómetro de un ejercicio que no cuenta el tiempo con la app en segundo plano (el usuario se fue a otra cosa).
export function stopwatch(start) {
  let total = 0;
  let from = start;
  return {
    pause(t) { if (from !== null) { total += t - from; from = null; } },
    resume(t) { if (from === null) from = t; },
    elapsed: t => total + (from === null ? 0 : t - from),
  };
}
