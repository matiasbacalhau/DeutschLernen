// situation: escena, chat y un campo por hueco. answer = string[] (uno por hueco, en orden).
import { h, rich } from '../ui/dom.js';
import { answerInput, listenButton } from '../ui/inputs.js';
import { onceButton, withGaps } from './common.js';

export function render(ex, el, { submit, onNoAudio }) {
  const gapSpans = [];
  // Modo escucha (spec §6.2): lo que dice el otro personaje suena al tocar 🔊 y su texto aparece recién en el feedback.
  // Sin síntesis de voz, o si la burbuja tiene un hueco, se ve con texto.
  const bubbles = ex.bubbles.map(b => {
    const speaker = ex.listen && b.who === 'them' && !String(b.text).includes('___') ? listenButton(b.text) : null;
    if (speaker) return h('div', { class: `bubble ${b.who}`, lang: 'de' }, speaker);
    const { nodes, gaps } = withGaps(b.text, gapSpans.length);
    gapSpans.push(...gaps);
    return h('div', { class: `bubble ${b.who}`, lang: 'de' }, nodes);
  });
  const inputs = gapSpans.map((_, i) => answerInput({ label: `Hueco ${i + 1}` }));
  const filled = () => inputs.every(x => x.value().trim() !== '');
  const btn = onceButton('Responder', () => submit(inputs.map(x => x.value())), filled);
  inputs.forEach((x, i) => x.addEventListener('input', () => { gapSpans[i].textContent = x.value() || `(${i + 1})`; btn.refresh(); }));
  el.append(
    h('p', { class: 'scene' }, h('strong', {}, ex.scene.title), ' · ', rich(ex.scene.context)),
    h('div', { class: 'chat' }, bubbles),
    ...inputs, btn,
    ex.listen && onNoAudio && h('button', { type: 'button', class: 'secondary no-audio', onclick: () => onNoAudio() }, 'Ahora no puedo escuchar'),
  );
}
