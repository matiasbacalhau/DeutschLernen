// writing-guided / writing-free: consigna, restricciones, tips y un texto libre. answer = {text}.
import { h, rich } from '../ui/dom.js';
import { answerInput } from '../ui/inputs.js';
import { onceButton } from './common.js';

const list = (title, items) => items?.length ? [h('h2', {}, title), h('ul', {}, items.map(t => h('li', {}, rich(t))))] : [];

export function render(ex, el, { submit }) {
  const input = answerInput({ multiline: true, label: 'Dein Text' });
  input.lang = 'de';
  const btn = onceButton('Abgeben', () => { btn.textContent = 'Wird korrigiert…'; submit({ text: input.value() }); }, () => input.value().trim() !== '');
  input.addEventListener('input', btn.refresh);
  el.append(
    h('p', {}, rich(ex.prompt)),
    ...list('Bedingungen', ex.constraints),
    ...list('Tipps', ex.tips),
    input, btn,
  );
}
