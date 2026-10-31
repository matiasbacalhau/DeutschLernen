// Lógica del inicio y del tema sin DOM: saludo, línea con humor, escrituras corregidas desde la cola y estado de escalón.
import {applyResult, masteryOf} from './mastery.js';
import {resolvePending} from './progress.js';
import {gradeWriting} from './checks/writing.js';
import {ltEntry} from './log.js';

const WEAK = 0.5;

export function greeting(hour, name) {
  const base = hour < 12 ? 'Guten Morgen' : hour < 19 ? 'Guten Tag' : 'Guten Abend';
  const n = name?.trim();
  return n ? `${base}, ${n}` : base;
}

// tags: curriculum.tags ({[tag]: {title}}). Usa el título del tag más flojo con datos; texto con *énfasis* para rich().
export function humorLine(mastery, tags) {
  const withData = Object.entries(tags).map(([tag, t]) => ({title: t.title, m: masteryOf(mastery, tag)})).filter(x => x.m !== null);
  if (!withData.length) return 'Primer día. Arrancamos por lo básico: *sein*.';
  const worst = withData.reduce((a, b) => (b.m < a.m ? b : a));
  if (worst.m < WEAK) return `El ${worst.title} te viene esquivando.`;
  return 'Todo en orden. Sigamos subiendo.';
}

// entry: elemento resuelto de processQueue ({key, topic, step, scene, text, at, matches}).
// Devuelve el estado nuevo ({progress, mastery, log}) y el aviso para el inicio.
export function applyResolved({state, entry, ltMap, quarantine, now}) {
  const {ok, penalties} = gradeWriting(entry.matches, ltMap);
  let mastery = state.mastery;
  const q = new Set(quarantine);
  mastery = applyResult(mastery, {tag: null, type: 'writing', ok, penalties, exerciseId: entry.key}, {now, quarantine: q});
  const log = [...state.log, ...entry.matches.map(mt => ltEntry({rule: mt.rule.id, mapped: !!ltMap.rules?.[mt.rule.id], at: entry.at}))];
  const progress = resolvePending(state.progress, entry.key, ok);
  return {progress, mastery, log, notice: {key: entry.key, topic: entry.topic, step: entry.step, scene: entry.scene, ok, at: now}};
}

export function stepStatus(attempt) {
  if (!attempt) return 'sin-intentar';
  if (attempt.passed === true) return 'superado';
  if (attempt.passed === false) return 'reforzar';
  return 'pendiente';
}
