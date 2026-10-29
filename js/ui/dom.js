// h('button', { class: 'x', onclick: fn }, 'texto') → elemento. Los hijos null/false se ignoran.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  el.append(...children.flat().filter(c => c != null && c !== false));
  return el;
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
