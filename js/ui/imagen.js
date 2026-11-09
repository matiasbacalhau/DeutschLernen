// Imagen de una palabra (OpenMoji a color sobre una ficha clara, spec §7). null si la palabra no tiene `image`.
// El alt es la traducción: nunca la palabra alemana, que es lo que se evalúa.
import { h } from './dom.js';

// size: 'card' (ficha de 112 px) o 'gl' (44 px, glosario).
export function wordPicture(word, size) {
  if (!word.image) return null;
  return h('span', { class: `pic pic-${size}` }, h('img', { src: `images/openmoji/${word.image}.svg`, alt: word.es, width: 72, height: 72 }));
}
