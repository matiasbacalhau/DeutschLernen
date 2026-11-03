// Piezas compartidas por los plugins de ejercicios.
import { h } from '../ui/dom.js';

// Índices 0..n-1 en orden al azar (las opciones correctas no quedan siempre arriba).
export function shuffledIndexes(n) {
  const a = [...Array(n).keys()];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Botón que dispara una sola vez. `enabled()` decide si está habilitado; refresh() lo reevalúa.
export function onceButton(label, onClick, enabled = () => true) {
  let done = false;
  const btn = h('button', { type: 'button', onclick: () => {
    if (done || !enabled()) return;
    done = true;
    btn.disabled = true;
    onClick();
  } }, label);
  btn.refresh = () => { btn.disabled = done || !enabled(); };
  btn.refresh();
  return btn;
}

// Frase con huecos `___` → nodos; cada hueco es un <span class="gap"> (devueltos en `gaps`).
export function withGaps(text, start = 0) {
  const parts = String(text).split('___');
  const gaps = [];
  const nodes = parts.flatMap((p, i) => {
    if (i === 0) return [p];
    const g = h('span', { class: 'gap', 'data-n': start + i }, `(${start + i})`);
    gaps.push(g);
    return [g, p];
  });
  return { nodes, gaps };
}

// Enter en un input de una línea dispara `fn`.
export function onEnter(input, fn) {
  input.querySelector('input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); fn(); }
  });
}
