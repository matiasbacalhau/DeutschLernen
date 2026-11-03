// Fin de grupo (spec §5.7): puntaje, superado / para reforzar / esperando corrección, reglas falladas y siguiente.
import { h, rich } from './dom.js';
import { finishGroup } from '../core/runner.js';
import { suggestNext } from '../core/progress.js';

const pctText = p => `${Math.round(p * 100)} %`;

function verdict(score) {
  if (score.passed === true) return h('span', { class: 'tag-ok' }, 'Superado');
  if (score.passed === false) return h('span', { class: 'tag-bad' }, 'Para reforzar');
  const n = score.pending.length;
  return h('span', { class: 'pill' }, `Esperando la corrección de ${n} ${n === 1 ? 'escritura' : 'escrituras'}`);
}

export default async function fin(el, { store, content }) {
  const { units } = await content();
  const home = h('a', { class: 'button secondary', href: '#/' }, 'Inicio');
  const now = Date.now();
  // En una transacción: una escritura que la cola resuelve justo ahora entra en el intento o lo resuelve después, nunca se pierde.
  let group = null;
  let score;
  const { progress } = await store.update(['group', 'progress', 'log'], v => {
    const g = v.group;
    if (!g || g.index < g.exercises.length || g.committed < g.index) return {};
    group = g;
    const f = finishGroup(g, { progress: v.progress ?? { steps: {} }, log: v.log ?? [] }, now);
    score = f.score;
    return { progress: f.progress, log: f.log, group: null };
  });
  if (!group) {
    el.append(h('p', {}, 'No hay un grupo terminado para mostrar.'), home);
    return;
  }
  const mastery = await store.get('mastery');

  const unit = Object.values(units).find(u => u.topics.some(t => t.topic === group.topic));
  const next = suggestNext(unit, progress, now, mastery ?? { tags: {}, pairs: {} });
  el.append(
    h('div', { class: 'card' },
      h('p', { class: 'greeting' }, pctText(score.pct)),
      h('p', {}, verdict(score)),
      score.failedRules.length > 0 && [h('h2', {}, 'Reglas para repasar'), h('ul', {}, score.failedRules.map(r => h('li', {}, rich(r))))],
    ),
    next && h('a', { class: 'button', href: `#/grupo/${encodeURIComponent(next.topic)}/${next.step}` }, 'Siguiente grupo'),
    home,
  );
}
