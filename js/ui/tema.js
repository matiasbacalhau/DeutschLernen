// Página de un tema: enlace a la ficha y sus 5 escalones con estado. Todos abren sin bloqueo.
import { h } from './dom.js';
import { stepKey } from '../core/progress.js';
import { stepStatus } from '../core/inicio.js';

const TEXT = { 'sin-intentar': 'noch nicht begonnen', superado: 'abgeschlossen', reforzar: 'wiederholen', pendiente: 'ausstehend' };

export default async function tema(el, { store, content, params }) {
  const C = await content();
  const id = params[0];
  const def = Object.values(C.units).flatMap(u => u.topics).find(t => t.topic === id);
  const title = C.curriculum.topics.find(t => t.id === id)?.title ?? id;
  if (!def || def.draft || !def.steps?.length) {
    el.append(h('p', {}, 'Este tema todavía no tiene contenido.'), h('a', { class: 'button secondary', href: '#/mapa' }, 'Themenkarte'));
    return;
  }
  const progress = (await store.get('progress')) ?? { steps: {} };
  el.append(
    h('h1', {}, title),
    def.ficha && h('a', { class: 'button secondary', href: `#/ficha/${encodeURIComponent(id)}` }, 'Theoriekarte'),
    h('div', { class: 'card' }, def.steps.map(s => {
      const status = stepStatus(progress.steps[stepKey(id, s.n)]?.attempts.at(-1));
      return h('a', { class: 'map-step', 'data-status': status, href: `#/grupo/${encodeURIComponent(id)}/${s.n}` },
        h('span', {}, `Stufe ${s.n} · ${s.name}`), h('span', { class: 'muted' }, TEXT[status]));
    })),
    h('a', { class: 'button secondary', href: '#/mapa' }, 'Themenkarte'),
  );
}
