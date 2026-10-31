// order: se tocan los chunks para armar la frase; tocar uno ya usado lo devuelve. answer = textos en orden.
import { h, rich } from '../ui/dom.js';
import { onceButton } from './common.js';

export function render(ex, el, { submit }) {
  const picked = [];
  const line = h('div', { class: 'built', lang: 'de', 'aria-live': 'polite' });
  const pool = h('div', { class: 'pool', lang: 'de' });
  const btn = onceButton('Responder', () => submit(picked.map(i => ex.chunks[i])), () => picked.length === ex.chunks.length);
  const toggle = i => {
    const at = picked.indexOf(i);
    if (at >= 0) picked.splice(at, 1); else picked.push(i);
    draw();
  };
  const draw = () => {
    line.replaceChildren(...(picked.length
      ? picked.map(i => h('button', { type: 'button', class: 'chunk', onclick: () => toggle(i) }, ex.chunks[i]))
      : [h('span', { class: 'muted' }, 'Tocá los bloques en orden.')]));
    pool.replaceChildren(...ex.chunks.map((c, i) => h('button', {
      type: 'button', class: picked.includes(i) ? 'chunk used' : 'chunk', 'aria-pressed': String(picked.includes(i)), onclick: () => toggle(i),
    }, c)));
    btn.refresh();
  };
  draw();
  el.append(ex.prompt && h('p', {}, rich(ex.prompt)), line, pool, btn);
}
