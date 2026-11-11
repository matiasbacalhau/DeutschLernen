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
  const stepOf = (topic, n) => defs.find(t => t.topic === topic)?.steps.find(s => s.n === n);
  // Con un grupo a medias, la tarjeta principal es ese grupo (Seguir); la sugerencia queda como secundaria (§5.1).
  const open = group && stepOf(group.topic, group.step) ? { topic: group.topic, step: group.step } : null;
  const suggested = next && stepOf(next.topic, next.step) && !(open && open.topic === next.topic && open.step === next.step) ? next : null;
  const card = (g, heading, primary) => {
    const s = stepOf(g.topic, g.step);
    return h('div', { class: 'card' },
      h('h2', {}, heading),
      h('p', {}, h('strong', {}, titleOf(g.topic))),
      h('p', { class: 'muted' }, `Stufe ${g.step} · ${s.name}`),
      h('p', {}, rich(s.scene.title)),
      !primary && h('p', { class: 'muted' }, 'Empezarlo cierra el grupo a medias (lo que respondiste queda guardado).'),
      h('a', { class: primary ? 'button' : 'button secondary', href: `#/grupo/${encodeURIComponent(g.topic)}/${g.step}` }, open && primary ? 'Weiter' : 'Start'),
    );
  };

  el.append(...[
    h('p', { class: 'greeting' }, greeting(new Date().getHours(), settings?.name)),
    h('p', {}, rich(humorLine(m, C.curriculum.tags))),
    // Escrituras corregidas desde la cola: el aviso dice cómo salió y abre el resultado (verlo lo descarta).
    ...(notices ?? []).map(n => h('div', { class: 'notice' }, 'Tu escritura de ', h('em', {}, n.scene), ` ya se corrigió: ${n.ok ? 'sin errores' : 'con errores'}. `,
      h('a', { href: `#/escritura/${encodeURIComponent(n.key)}` }, 'Ver el resultado'))),
    needsBackupReminder(meta, Date.now()) &&
      h('div', { class: 'notice' }, 'Pasaron 7 días o más sin backup. ', h('a', { href: '#/ajustes' }, 'Exportá uno ahora.')),
    open && card(open, 'Grupo a medias', true),
    suggested && card(suggested, 'Siguiente grupo', !open),
    h('a', { class: 'button secondary', href: '#/mapa' }, 'Themenkarte'),
    h('a', { class: 'button secondary', href: '#/ajustes' }, 'Einstellungen & Backup'),
    !isStandalone() && h('div', { class: 'card' },
      h('h2', {}, 'Instalar en el iPhone'),
      h('p', {}, 'En Safari: botón Compartir → "Agregar a pantalla de inicio". Así se abre a pantalla completa, funciona sin conexión y el progreso queda más protegido.'),
    ),
  ].filter(Boolean));
}
