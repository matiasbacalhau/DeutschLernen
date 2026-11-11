// translate: del español o del inglés al alemán. answer = string.
import { h, rich } from '../ui/dom.js';
import { answerInput } from '../ui/inputs.js';
import { onceButton, onEnter } from './common.js';

const FROM = { es: 'Übersetze ins Deutsche (aus dem Spanischen):', en: 'Übersetze ins Deutsche (aus dem Englischen):' };

export function render(ex, el, { submit }) {
  const input = answerInput({ label: 'Auf Deutsch' });
  const btn = onceButton('Prüfen', () => submit(input.value()), () => input.value().trim() !== '');
  input.addEventListener('input', btn.refresh);
  onEnter(input, () => btn.click());
  el.append(h('p', { class: 'muted' }, FROM[ex.from] ?? FROM.es), h('p', { class: 'sentence', lang: ex.from }, rich(ex.source)), input, btn);
}
