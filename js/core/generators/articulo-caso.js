// Generador de huecos de artículo: una instancia por lema (singular) que cabe en la ranura.
import { article } from '../morph.js';

const GENDER = {der: 'm', die: 'f', das: 'n'};
const TAG_SUFFIX = {m: 'mask', f: 'fem', n: 'neut', pl: 'plural'};

function fits(slot, w) {
  if (w.pos !== slot.pos || !slot.fields.includes(w.field)) return false;
  return !slot.countable || w.plural != null;
}

function build(template, w) {
  const gender = GENDER[w.article];
  return {
    id: `${template.id}:${w.lemma}`,
    type: 'gap',
    tag: `${template.tag_prefix}.${TAG_SUFFIX[gender]}`,
    context: template.context,
    text: template.text.replace('{noun}', w.lemma),
    answers: article(template.det, template.kase, gender),
    dims: {gender, kase: template.kase, det: template.det},
    noun: w.lemma,
    verb: template.verb,
    generated: true,
  };
}

export function instances(template, lexicon) {
  return lexicon.filter(w => fits(template.slot, w)).map(w => build(template, w));
}

// rng: () => [0, 1)
export function generate(template, lexicon, rng) {
  const all = instances(template, lexicon);
  return all[Math.floor(rng() * all.length)];
}
