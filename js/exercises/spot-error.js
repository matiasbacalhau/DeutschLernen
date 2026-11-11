// spot-error: se toca la palabra equivocada y se escribe su corrección. answer = {index, text}.
import { h, rich } from '../ui/dom.js';
import { answerInput } from '../ui/inputs.js';
import { onceButton, onEnter } from './common.js';

export function render(ex, el, { submit }) {
  let index = null;
  const slot = h('div');
  const input = answerInput({ label: 'Korrektur' });
  const btn = onceButton('Prüfen', () => submit({ index, text: input.value() }), () => index !== null && input.value().trim() !== '');
  input.addEventListener('input', btn.refresh);
  onEnter(input, () => btn.click());
  const words = ex.tokens.map((t, i) => h('button', { type: 'button', class: 'chunk', 'aria-pressed': 'false', onclick: () => choose(i) }, t));
  const choose = i => {
    index = i;
    words.forEach((w, j) => { w.classList.toggle('picked', j === i); w.setAttribute('aria-pressed', String(j === i)); });
    input.querySelector('label').textContent = `Korrektur von «${ex.tokens[i]}»`;
    slot.replaceChildren(input);
    btn.refresh();
    input.focus();
  };
  el.append(
    h('p', {}, rich(ex.prompt ?? 'Dieser Satz enthält einen Fehler. Tippe auf das falsche Wort.')),
    h('div', { class: 'tokens', lang: 'de' }, words),
    slot, btn,
  );
}
