// Mapa de temas de A1 (spec §5.8): estado en texto; los "próximamente" no son enlaces.
import { h } from './dom.js';
import { topicStatus } from '../core/progress.js';

const LABEL = { nuevo: 'nuevo', 'en-curso': 'en curso', dominado: 'dominado', reforzar: 'para reforzar', proximamente: 'próximamente' };

export default async function mapa(el, { store, content }) {
  const C = await content();
  const [progress, mastery] = await Promise.all([store.get('progress'), store.get('mastery')]);
  const units = Object.values(C.units);
  const rows = C.curriculum.topics.filter(t => t.level === 'A1').map(t => {
    const status = topicStatus(t, progress ?? { steps: {} }, mastery ?? { tags: {}, pairs: {} }, C.curriculum, units);
    // La etiqueta visible sale del CSS (::after); aria-label la deja también en el árbol de accesibilidad.
    const props = { class: 'map-topic', 'data-status': status, 'aria-label': `${t.title}, ${LABEL[status]}` };
    return status === 'proximamente'
      ? h('div', props, h('span', {}, t.title))
      : h('a', { ...props, href: `#/tema/${encodeURIComponent(t.id)}` }, h('span', {}, t.title));
  });
  el.append(h('h1', {}, 'Mapa de temas'), h('div', { class: 'card' }, rows), h('a', { class: 'button secondary', href: '#/' }, 'Inicio'));
}
