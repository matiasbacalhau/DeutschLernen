// detective: frases con el rasgo resaltado, elegir la regla y aplicarla. answer = {rule, apply: string[]}.
// Si la regla elegida es incorrecta, el runner muestra la ficha antes de la parte de aplicar (ctx.beforeApply).
import { h, rich } from '../ui/dom.js';
import { answerInput } from '../ui/inputs.js';
import { onceButton, shuffledIndexes, withGaps } from './common.js';

function highlighted({ de, highlight }) {
  const m = new RegExp(`(^|[^\\p{L}])(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}])`, 'u').exec(de);
  if (!m) return h('li', { lang: 'de' }, de);
  const at = m.index + m[1].length;
  return h('li', { lang: 'de' }, de.slice(0, at), h('mark', {}, m[2]), de.slice(at + m[2].length));
}

export function render(ex, el, { submit, ctx }) {
  const applyBox = h('div');
  let chosen = false;
  const order = shuffledIndexes(ex.rules.length);
  const rules = order.map(i => h('button', {
    type: 'button', class: 'secondary option', onclick: async e => {
      if (chosen) return;
      chosen = true;
      rules.forEach(b => { b.disabled = true; b.setAttribute('aria-pressed', String(b === e.currentTarget)); });
      await ctx.beforeApply(i);
      showApply(i);
    },
  }, rich(ex.rules[i].text)));

  const showApply = rule => {
    const inputs = ex.apply.map((a, n) => {
      const hasGap = a.text.includes('___');
      const input = answerInput({ label: hasGap ? `Frase ${n + 1}` : `Frase ${n + 1}: escribila completa` });
      const line = hasGap ? withGaps(a.text) : null;
      if (line) input.addEventListener('input', () => { line.gaps[0].textContent = input.value() || '(1)'; });
      return { input, node: h('div', { class: 'apply' }, h('p', { lang: hasGap ? 'de' : null }, line ? line.nodes : rich(a.text)), input) };
    });
    const btn = onceButton('Responder', () => submit({ rule, apply: inputs.map(x => x.input.value()) }),
      () => inputs.every(x => x.input.value().trim() !== ''));
    inputs.forEach(x => x.input.addEventListener('input', btn.refresh));
    applyBox.replaceChildren(h('h2', {}, 'Ahora aplicala'), ...inputs.map(x => x.node), btn);
    inputs[0]?.input.focus();
  };

  el.append(
    h('ul', { class: 'card sentences' }, ex.sentences.map(highlighted)),
    h('p', {}, '¿Qué cambia y cuándo?'),
    ...rules, applyBox,
  );
  // Al retomar con la regla ya elegida (ctx.rule): queda fija y se sigue con la parte de aplicar.
  const preset = ctx.rule;
  if (preset != null) {
    chosen = true;
    rules.forEach(b => { b.disabled = true; });
    order.forEach((i, k) => rules[k].setAttribute('aria-pressed', String(i === preset)));
    showApply(preset);
  }
}
