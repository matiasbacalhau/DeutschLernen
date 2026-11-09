// Lógica del inicio y del tema sin DOM: saludo, línea con humor, escrituras corregidas desde la cola y estado de escalón.
import {applyResult, masteryOf} from './mastery.js';
import {resolvePending, pendingInGroup, resolveInGroup} from './progress.js';
import {gradeWriting, ltRulesOf} from './checks/writing.js';
import {answerEntry, ltEntry} from './log.js';

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
  if (worst.m < WEAK) return `Lo que más te viene costando: *${worst.title}*.`;
  return 'Todo en orden. Sigamos subiendo.';
}

// entry: elemento resuelto de processQueue ({key, group, type, ms, topic, step, scene, text, at, matches}).
// state: {progress, mastery, log, group}; `group` es el grupo abierto (o null).
// Si la escritura está pendiente en el grupo abierto, se resuelve ahí (la cuenta el intento del fin de grupo);
// si no, en el intento ya registrado. Mastery y log se aplican acá, una sola vez.
// Devuelve el estado nuevo ({progress, mastery, log, group}) y el aviso para el inicio (con texto y marcas).
export function applyResolved({state, entry, ltMap, quarantine, now, acceptedWords}) {
  const {ok, marks, penalties} = gradeWriting(entry.matches, ltMap, {text: entry.text, acceptedWords});
  const mastery = applyResult(state.mastery, {tag: null, type: 'writing', ok, penalties, exerciseId: entry.key}, {now, quarantine: new Set(quarantine)});
  const log = [
    ...state.log,
    answerEntry({key: entry.key, tag: null, ok}, {type: entry.type ?? 'writing', ms: entry.ms, at: entry.at}),
    ...ltRulesOf(entry.matches, ltMap).map(lt => ltEntry({...lt, at: entry.at})),
  ];
  let {progress, group = null} = state;
  if (pendingInGroup(group, entry.key, entry.group)) group = resolveInGroup(group, entry.key, {ok, marks, penalties});
  else progress = resolvePending(progress, entry.key, ok, entry.group);
  const notice = {key: entry.key, topic: entry.topic, step: entry.step, scene: entry.scene, text: entry.text, marks, ok, at: now};
  return {progress, mastery, log, group, notice};
}

export function stepStatus(attempt) {
  if (!attempt) return 'sin-intentar';
  if (attempt.passed === true) return 'superado';
  if (attempt.passed === false) return 'reforzar';
  return 'pendiente';
}
