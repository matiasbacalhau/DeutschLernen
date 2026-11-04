import { h } from './dom.js';
import * as tts from '../services/tts.js';

let seq = 0;

const KEYS = ['ä', 'ö', 'ü', 'ß'];

// Campo de respuesta con fila de teclas ä ö ü ß. Las teclas insertan en el cursor y no le sacan el foco al campo.
export function answerInput({ multiline = false, label } = {}) {
  const id = `answer-${++seq}`;
  const field = h(multiline ? 'textarea' : 'input', {
    id, autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', autocomplete: 'off', type: multiline ? null : 'text',
  });
  const insert = ch => {
    const { selectionStart: a, selectionEnd: b } = field;
    field.setRangeText(ch, a, b, 'end');
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.focus();
  };
  const keys = KEYS.map(ch => h('button', {
    type: 'button', 'aria-label': ch,
    onmousedown: e => e.preventDefault(),
    onpointerdown: e => e.preventDefault(),
    onclick: () => insert(ch),
  }, ch));
  const root = h('div', { class: 'answer' }, label && h('label', { for: id }, label), field, h('div', { class: 'umlauts' }, keys));
  root.value = () => field.value;
  root.focus = () => field.focus();
  return root;
}

// Botón 🔊 que lee `text` con la voz alemana predeterminada (en iOS, forzar una voz de la lista falla).
// Sin síntesis de voz no se muestra. Con el iPhone en silencio no suena: no hay forma de detectarlo.
export function listenButton(text) {
  if (!tts.supported()) return null;
  // speak() rechaza si otra frase la interrumpe: no es un error para el usuario.
  return h('button', { type: 'button', class: 'listen', 'aria-label': 'Escuchar', lang: 'es', onclick: () => tts.speak(text, { rate: 0.9 }).catch(() => {}) }, '🔊');
}
