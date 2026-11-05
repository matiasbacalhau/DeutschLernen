// dictation: se oye una frase y se escribe. answer = string. La frase suena solo al tocar 🔊 (a 0,8×) o "1×";
// el texto original aparece recién en el feedback (grupo.js).
import { h } from '../ui/dom.js';
import { answerInput } from '../ui/inputs.js';
import * as tts from '../services/tts.js';
import { onceButton, onEnter } from './common.js';

export function render(ex, el, { submit, onNoAudio }) {
  // speak() rechaza si otra frase la interrumpe: no es un error para el usuario.
  const play = (rate) => () => tts.speak(ex.text, { rate }).catch(() => {});
  const input = answerInput({ label: 'Lo que escuchaste' });
  const btn = onceButton('Responder', () => submit(input.value()), () => input.value().trim() !== '');
  input.addEventListener('input', btn.refresh);
  onEnter(input, () => btn.click());
  el.append(
    h('p', { class: 'muted' }, 'Escuchá y escribí la frase.'),
    h('p', { class: 'listen-row' },
      h('button', { type: 'button', class: 'listen', 'aria-label': 'Escuchar más despacio', lang: 'es', onclick: play(0.8) }, '🔊'),
      h('button', { type: 'button', class: 'secondary small', 'aria-label': 'Escuchar a velocidad normal', lang: 'es', onclick: play(1) }, '1×'),
    ),
    input, btn,
    h('button', { type: 'button', class: 'secondary no-audio', onclick: () => onNoAudio?.() }, 'Ahora no puedo escuchar'),
  );
}
