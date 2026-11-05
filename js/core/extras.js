// Extras de un grupo (spec §5.2 y §6): tarjetas vencidas y el lugar de escucha. Puro: azar y reloj inyectados.
import { pickCards } from './cards.js';
import { pickDictation, revealing } from './dictation.js';
import { interleave } from './scheduler.js';
import { stepKey } from './progress.js';

// La última vez que se vio `id` en cualquier escalón del tema (o undefined).
function lastSeen(progress, topic, id) {
  const times = topic.steps.map((s) => progress.steps[stepKey(topic.topic, s.n)]?.seen?.[id]).filter((t) => t !== undefined);
  return times.length ? Math.max(...times) : undefined;
}

// Una situación ya vista del tema o de uno anterior de su unidad, la vista hace más tiempo, en modo escucha
// (spec §6.2), salvo las de `skip` (ids ya en el grupo). La de otro tema va como repaso, con su `topic`.
export function pickListening(units, progress, topicId, {skip = new Set()} = {}) {
  const unit = Object.values(units).find((u) => u.topics.some((t) => t.topic === topicId));
  if (!unit) return null;
  const upTo = unit.topics.slice(0, unit.topics.findIndex((t) => t.topic === topicId) + 1);
  let best = null;
  for (const t of upTo) {
    if (t.draft) continue;
    for (const s of t.steps ?? []) {
      for (const ex of s.exercises) {
        if (ex.type !== 'situation' || skip.has(ex.id)) continue;
        const at = lastSeen(progress, t, ex.id);
        if (at !== undefined && (!best || at < best.at)) best = {ex, at, topic: t.topic};
      }
    }
  }
  if (!best) return null;
  return best.topic === topicId ? {...best.ex, listen: true} : {...best.ex, listen: true, review: true, topic: best.topic};
}

// Suma al grupo las tarjetas (escalones 1–4) y, con `audio`, un ítem de escucha (escalones 2–4): un dictado o una
// situación vista, el orden de prueba al azar. Así nunca hay más de 4 extras (3 tarjetas y 1 de escucha); el
// escalón 5 no lleva ninguno.
export function buildExtras(group, {srs, now, rng, unit, units, progress, lexicon, templates, mastery, curriculum, pool, audio}) {
  const n = group.step;
  if (n === 5) return group;
  const topic = unit.topics.find((t) => t.topic === group.topic);
  const cards = pickCards(srs, {
    now, rng, lexicon, templates, topic, groupExercises: group.exercises, mastery, curriculum, audio, pool, max: 3,
  });
  const extras = [...cards];
  if (n >= 2 && audio) {
    const reveals = revealing([...group.exercises, ...cards]);
    const dictation = () => pickDictation(pool, srs, {rng, exclude: reveals});
    const listening = () => pickListening(units, progress, group.topic, {skip: new Set(group.exercises.map((e) => e.id))});
    const order = rng() < 0.5 ? [dictation, listening] : [listening, dictation];
    const item = order[0]() ?? order[1]();
    if (item) extras.push(item);
  }
  if (!extras.length) return group;
  return {...group, exercises: interleave(group.exercises, extras, rng)};
}
