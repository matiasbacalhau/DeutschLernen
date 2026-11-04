// Escritura corregida: el texto con las marcas subrayadas y el texto en español de cada una (de lt-map, nunca el
// mensaje de LanguageTool), más la checklist y el modelo del ejercicio. Lo usan el feedback del grupo y la vista
// #/escritura/<id> (spec §5.5: la escritura corregida desde la cola se ve desde el inicio; verla descarta su aviso).
import { h, rich } from './dom.js';
import { listenButton } from './inputs.js';
import { segments } from '../core/runner.js';

export function marked(text, marks) {
  return h('p', { class: 'written', lang: 'de' }, segments(text, marks).map(s => (s.mark === null
    ? s.text
    : [h('span', { class: `mark ${marks[s.mark].kind}` }, s.text), h('sup', {}, String(s.mark + 1))])).flat());
}

export const markList = marks => marks.length
  ? h('ol', { class: 'marks' }, marks.map(m => h('li', { class: m.kind === 'notice' ? 'muted' : null }, rich(m.text))))
  : h('p', { class: 'muted' }, 'LanguageTool no marcó nada. Ojo: no ve todo (sentido, estilo, alguna gramática).');

export const verdict = ok => (ok ? h('span', { class: 'tag-ok' }, 'Sin errores') : h('span', { class: 'tag-bad' }, 'Con errores'));

// Checklist ("lo que LanguageTool no ve") y modelo del ejercicio, si los tiene.
export const extras = ex => [
  ex?.checklist?.length && [h('h2', {}, 'Lo que LanguageTool no ve'), h('ul', { class: 'checklist' }, ex.checklist.map(c => h('li', {}, h('label', {}, h('input', { type: 'checkbox' }), h('span', {}, rich(c))))))],
  ex?.model && [h('h2', {}, 'Un modelo', ' ', listenButton(ex.model)), h('p', { class: 'model', lang: 'de' }, ex.model)],
];

export default async function escritura(el, { store, content, params }) {
  const C = await content();
  const key = params[0];
  const home = h('a', { class: 'button secondary', href: '#/' }, 'Inicio');
  const notice = ((await store.get('notices')) ?? []).findLast(n => n.key === key);
  // Verla la descarta del inicio (en una transacción: no pisa un aviso que la cola agregue mientras tanto).
  if (notice) await store.update(['notices'], v => ({ notices: (v.notices ?? []).filter(n => !(n.key === notice.key && n.at === notice.at)) }));
  if (!notice?.text) {
    el.append(h('p', {}, 'No hay una escritura corregida para mostrar.'), home);
    return;
  }
  const ex = Object.values(C.units).flatMap(u => u.topics).flatMap(t => t.steps ?? []).flatMap(s => s.exercises).find(e => e.id === key);
  const title = C.curriculum.topics.find(t => t.id === notice.topic)?.title ?? notice.topic;
  const marks = notice.marks ?? [];
  el.append(
    h('h1', {}, 'Tu escritura'),
    h('p', { class: 'muted' }, `${title} · Escalón ${notice.step}`),
    notice.scene && h('p', {}, rich(notice.scene)),
    h('div', { class: 'card' }, verdict(notice.ok), marked(notice.text, marks), markList(marks)),
    ...extras(ex).flat().filter(Boolean),
    h('a', { class: 'button', href: `#/tema/${encodeURIComponent(notice.topic)}` }, 'Ver el tema'),
    home,
  );
}
