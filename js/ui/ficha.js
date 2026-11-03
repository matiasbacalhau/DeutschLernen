// Ficha de un tema: lo corto, la tabla y "más" desplegable. renderFicha la usa también el runner.
import { h, rich } from './dom.js';

export function renderFicha(def, title) {
  const f = def.ficha ?? {};
  return h('section', { class: 'ficha' },
    h('h2', {}, `Ficha · ${title}`),
    f.short?.length && h('ul', {}, f.short.map(t => h('li', {}, rich(t)))),
    f.table && h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, f.table.head.map(c => h('th', { scope: 'col' }, rich(c))))),
      h('tbody', {}, f.table.rows.map(r => h('tr', {}, r.map(c => h('td', {}, rich(c)))))),
    )),
    f.more?.length && h('details', {}, h('summary', {}, 'Más sobre esto'), f.more.map(t => h('p', {}, rich(t)))),
  );
}

export default async function ficha(el, { content, params }) {
  const { curriculum, units } = await content();
  const id = params[0];
  const def = Object.values(units).flatMap(u => u.topics).find(t => t.topic === id);
  const title = curriculum.topics.find(t => t.id === id)?.title ?? id;
  const back = h('button', { type: 'button', class: 'secondary', onclick: () => (history.length > 1 ? history.back() : (location.hash = '#/')) }, 'Volver');
  if (!def?.ficha) {
    el.append(h('p', {}, 'Este tema todavía no tiene ficha.'), back);
    return;
  }
  el.append(h('div', { class: 'card' }, renderFicha(def, title)), back);
}
