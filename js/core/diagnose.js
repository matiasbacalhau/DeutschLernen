// Diagnóstico de un hueco de artículo. El texto nombra la regla y nunca la forma esperada.
import { findArticle } from './morph.js';

const GENDER_NAME = {m: 'masculino', f: 'femenino', n: 'neutro', pl: 'plural'};
const TAG_SUFFIX = {m: 'mask', f: 'fem', n: 'neut', pl: 'plural'};
const KASE_NAME = {nom: 'Nominativ (sujeto)', akk: 'Akkusativ (objeto directo)'};

// item: {tag, dims: {gender, kase, det}, noun, verb}; tags: curriculum.tags (para la regla del tag).
export function diagnose(item, answer, tags = {}) {
  const {gender, kase, det} = item.dims;
  const cells = findArticle(String(answer).trim().toLowerCase()).filter(c => c.det === det);
  if (cells.some(c => c.gender === gender && c.kase !== kase))
    return {rule: `*${item.verb ?? 'Este verbo'}* pide ${KASE_NAME[kase]}.`, prereq: null};
  const wrong = cells.find(c => c.kase === kase && c.gender !== gender);
  if (wrong) {
    const what = wrong.gender === 'pl' ? 'plural: revisá el número' : `${GENDER_NAME[wrong.gender]}: revisá el género`;
    return {rule: `*${item.noun}* no es ${what}.`, prereq: `a1.nom.${TAG_SUFFIX[gender]}`};
  }
  return {rule: tags[item.tag]?.rule ?? 'Repasá la regla de este tema.', prereq: null};
}
