// Glosario del escalón 3 (spec §5.4): lema con artículo (si no es null), plural y traducción. Sin rótulos de grupo.
import { h } from './dom.js';
import { listenButton } from './inputs.js';

export function renderGlossary(el, words) {
  el.append(h('ul', { class: 'glossary' }, words.map(w => h('li', {},
    h('span', { class: 'lemma', lang: 'de' }, w.article ? `${w.article} ${w.lemma}` : w.lemma),
    w.plural && h('span', { class: 'muted', lang: 'de' }, ` · pl. ${w.plural}`),
    listenButton(w.article ? `${w.article} ${w.lemma}` : w.lemma),
    h('span', { class: 'es' }, w.es),
  ))));
}
