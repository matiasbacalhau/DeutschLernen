import { h, rich, isStandalone } from './dom.js';
import { needsBackupReminder } from '../core/backup.js';
import { suggestNext } from '../core/progress.js';
import { greeting, humorLine } from '../core/inicio.js';

export default async function home(el, { store, content }) {
  const C = await content();
  const [meta, progress, mastery, settings, group, notices] = await Promise.all(['meta', 'progress', 'mastery', 'settings', 'group', 'notices'].map(k => store.get(k)));
  const units = Object.values(C.units);
  const defs = units.flatMap(u => u.topics).filter(t => !t.draft && t.steps?.length);
  const titleOf = id => C.curriculum.topics.find(t => t.id === id)?.title ?? id;
  const m = mastery ?? { tags: {}, pairs: {} };
  const next = units[0] && suggestNext(units[0], progress ?? { steps: {} }, Date.now(), m);
  const def = next && defs.find(t => t.topic === next.topic);
  const stepDef = def?.steps.find(s => s.n === next.step);
  const resume = next && group?.topic === next.topic && group?.step === next.step;
  const dismiss = () => store.set('notices', []);

  el.append(...[
    h('p', { class: 'greeting' }, greeting(new Date().getHours(), settings?.name)),
    h('p', {}, rich(humorLine(m, C.curriculum.tags))),
    ...(notices ?? []).map(n => h('div', { class: 'notice' }, 'Tu escritura de ', h('em', {}, n.scene), ' ya se corrigió. ',
      h('a', { href: `#/tema/${encodeURIComponent(n.topic)}`, onclick: dismiss }, 'Ver el tema'))),
    needsBackupReminder(meta, Date.now()) &&
      h('div', { class: 'notice' }, 'Pasaron 7 días o más sin backup. ', h('a', { href: '#/ajustes' }, 'Exportá uno ahora.')),
    stepDef && h('div', { class: 'card' },
      h('h2', {}, 'Siguiente grupo'),
      h('p', {}, h('strong', {}, titleOf(next.topic))),
      h('p', { class: 'muted' }, `Escalón ${next.step} · ${stepDef.name}`),
      h('p', {}, rich(stepDef.scene.title)),
      h('a', { class: 'button', href: `#/grupo/${encodeURIComponent(next.topic)}/${next.step}` }, resume ? 'Seguir' : 'Empezar'),
    ),
    h('a', { class: 'button secondary', href: '#/mapa' }, 'Mapa de temas'),
    h('a', { class: 'button secondary', href: '#/ajustes' }, 'Ajustes y backup'),
    !isStandalone() && h('div', { class: 'card' },
      h('h2', {}, 'Instalar en el iPhone'),
      h('p', {}, 'En Safari: botón Compartir → "Agregar a pantalla de inicio". Así se abre a pantalla completa, funciona sin conexión y el progreso queda más protegido.'),
    ),
  ].filter(Boolean));
}
