// transform: una frase y una instrucción; se escribe la frase completa. answer = string.
import { h, rich } from '../ui/dom.js';
import { answerInput } from '../ui/inputs.js';
import { onceButton, onEnter } from './common.js';

export function render(ex, el, { submit }) {
  const input = answerInput({ label: 'Tu frase' });
  const btn = onceButton('Responder', () => submit(input.value()), () => input.value().trim() !== '');
  input.addEventListener('input', btn.refresh);
  onEnter(input, () => btn.click());
  el.append(h('p', { class: 'sentence', lang: 'de' }, rich(ex.source)), h('p', {}, rich(ex.instruction)), input, btn);
}
