// gap: micro-contexto, frase con hueco y un campo. answer = string.
import { h, rich } from '../ui/dom.js';
import { answerInput } from '../ui/inputs.js';
import { onceButton, withGaps, onEnter } from './common.js';

export function render(ex, el, { submit }) {
  const { nodes, gaps } = withGaps(ex.text);
  const input = answerInput({ label: 'Tu respuesta' });
  input.addEventListener('input', () => { gaps[0].textContent = input.value() || '(1)'; });
  const btn = onceButton('Responder', () => submit(input.value()), () => input.value().trim() !== '');
  input.addEventListener('input', btn.refresh);
  onEnter(input, () => btn.click());
  el.append(ex.context && h('p', { class: 'muted' }, rich(ex.context)), h('p', { class: 'sentence', lang: 'de' }, nodes), input, btn);
}
