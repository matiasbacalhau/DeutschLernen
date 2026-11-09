// SRS del vocabulario: una tarjeta FSRS por lema más el nivel de la escalera (1 reconocer, 2 producir, 3 usar en contexto).
// Lógica pura: el reloj entra como `now` (ms) y el estado se guarda como JSON, con las fechas de la tarjeta en ms.
import { fsrs, createEmptyCard, Rating } from '../vendor/ts-fsrs.js';

// Estabilidad (en días) que hay que alcanzar en cada nivel para subir al siguiente (spec §4).
export const PROMOTE_DAYS = { 1: 4, 2: 10 };

const scheduler = fsrs({ request_retention: 0.9 });

const toStored = c => ({ ...c, due: +c.due, last_review: c.last_review ? +c.last_review : undefined });
const toCard = c => ({ ...c, due: new Date(c.due), last_review: c.last_review != null ? new Date(c.last_review) : undefined });

// Agrega en nivel 1 las palabras que no están; nunca pisa una existente.
export function addWords(srs, lemmas, now) {
  const out = { ...srs };
  for (const lemma of lemmas) {
    if (out[lemma]) continue;
    out[lemma] = { card: toStored(createEmptyCard(new Date(now))), rung: 1, listenUnlocked: {}, addedAt: now };
  }
  return out;
}

const grade = (entry, ok, now) => toStored(scheduler.next(toCard(entry.card), new Date(now), ok ? Rating.Good : Rating.Again).card);

// Repaso en una tarjeta de la escalera: FSRS más subir/bajar de nivel.
export function reviewWord(srs, lemma, ok, { now, rung, mode }) {
  const entry = srs[lemma];
  if (!entry) return srs;
  const card = grade(entry, ok, now);
  let next = rung;
  if (!ok) next = Math.max(1, rung - 1);
  else if (card.stability >= (PROMOTE_DAYS[rung] ?? Infinity)) next = rung + 1;
  const listenUnlocked = ok && mode === 'read' ? { ...entry.listenUnlocked, [rung]: true } : entry.listenUnlocked;
  return { ...srs, [lemma]: { ...entry, card, rung: next, listenUnlocked } };
}

// Repaso suelto (dictado): solo FSRS, sin tocar el nivel, y solo si la palabra está vencida.
export function reviewDue(srs, lemma, ok, { now }) {
  const entry = srs[lemma];
  if (!entry || entry.card.due > now) return srs;
  return { ...srs, [lemma]: { ...entry, card: grade(entry, ok, now) } };
}

// Palabras vencidas, la más atrasada primero.
export function dueLemmas(srs, now) {
  return Object.keys(srs)
    .filter(l => srs[l].card.due <= now)
    .sort((a, b) => srs[a].card.due - srs[b].card.due);
}

// Conocida: nivel 3, o verbo en nivel 2 con estabilidad ≥ 10 días (los verbos pueden quedarse sin nivel 3; spec §4).
export function isKnown(entry, word) {
  return entry.rung === 3 || (word.pos === 'verb' && entry.rung === 2 && entry.card.stability >= PROMOTE_DAYS[2]);
}

// Carga inicial (spec §5.1): por cada tema con un intento en el escalón 3, entran los lemas del campo de ese escalón.
export function seedSrs(srs, { progress, units, lexicon, now }) {
  let out = srs;
  for (const unit of Object.values(units)) {
    for (const topic of unit.topics) {
      if (!progress.steps[`${topic.topic}/3`]?.attempts.length) continue;
      const field = topic.steps.find(s => s.n === 3)?.field;
      if (!field) continue;
      out = addWords(out, lexicon.filter(w => w.field === field).map(w => w.lemma), now);
    }
  }
  return out;
}
