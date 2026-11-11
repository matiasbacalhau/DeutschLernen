// card: tarjeta de vocabulario. Nivel 1: elegir la traducción (answer = índice). Nivel 2: escribir la palabra con artículo (answer = texto).
// La imagen (si la palabra tiene) es la pista del nivel 2 leyendo; en el nivel 1 y en 'listen' recién aparece al responder (grupo.js).
// 'listen' muestra solo 🔊 (suena al tocarlo, nunca sola); 'read' muestra la palabra (nivel 1) o la traducción (nivel 2).
import { h } from '../ui/dom.js';
import { answerInput, listenButton } from '../ui/inputs.js';
import { wordPicture } from '../ui/imagen.js';
import { onceButton, onEnter } from './common.js';

export function render(ex, el, { submit, onNoAudio }) {
  const { word } = ex;
  const listen = ex.mode === 'listen';
  const speaker = listen ? listenButton(word.lemma) : null;
  const prompt = listen
    ? [h('p', { class: 'muted' }, ex.rung === 1 ? 'Höre zu und wähle die Bedeutung.' : 'Höre zu und schreibe mit Artikel.'), speaker]
    : ex.rung === 1
      ? [h('p', { class: 'muted' }, 'Was bedeutet das?'), h('p', { class: 'sentence', lang: 'de' }, word.pos === 'noun' ? `${word.article} ${word.lemma}` : word.lemma)]
      : [h('p', { class: 'muted' }, 'Schreibe auf Deutsch, bei Nomen mit Artikel.'), wordPicture(word, 'card'), h('p', { class: 'sentence', lang: 'es' }, word.es)];
  // listenButton() es null sin síntesis de voz: no se agrega.
  el.append(...prompt.filter(Boolean));

  if (ex.rung === 1) {
    let sent = false;
    const pick = (i) => { if (sent) return; sent = true; el.querySelectorAll('button.option').forEach((b) => { b.disabled = true; }); submit(i); };
    el.append(...ex.options.map((o, i) => h('button', { type: 'button', class: 'secondary option', lang: 'es', onclick: () => pick(i) }, o.text)));
  } else {
    const input = answerInput({ label: 'Auf Deutsch' });
    const btn = onceButton('Prüfen', () => submit(input.value()), () => input.value().trim() !== '');
    input.addEventListener('input', btn.refresh);
    onEnter(input, () => btn.click());
    el.append(input, btn);
  }

  // Sin audio (silencio, sin altavoz): lo resuelve el flujo del grupo; acá solo se avisa.
  if (listen && onNoAudio) el.append(h('button', { type: 'button', class: 'secondary no-audio', onclick: () => onNoAudio() }, 'Gerade kein Audio'));
}
