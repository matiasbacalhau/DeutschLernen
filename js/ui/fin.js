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
  const group = await store.get('group');
  const home = h('a', { class: 'button secondary', href: '#/' }, 'Inicio');
  if (!group || group.index < group.exercises.length || group.committed < group.index) {
    el.append(h('p', {}, 'No hay un grupo terminado para mostrar.'), home);
    return;
  }
  const { units } = await content();
  const now = Date.now();
  const [progress0, log0, mastery] = await Promise.all([store.get('progress'), store.get('log'), store.get('mastery')]);
  const { progress, log, score } = finishGroup(group, { progress: progress0 ?? { steps: {} }, log: log0 ?? [] }, now);
  await store.setMany({ progress, log, group: null });

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
