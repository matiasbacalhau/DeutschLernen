// Diagnóstico de un hueco generado (artículo o verbo en presente). El texto nombra la regla y nunca la forma esperada.
import { findArticle, present } from './morph.js';
import { SEIN } from './generators/sein-praesens.js';

const PERSON_NAME = {ich: '*ich*', du: '*du*', er: '*er*, *sie* (ella) y *es*', wir: '*wir*', ihr: '*ihr*', sie: '*sie* (ellos) y *Sie*'};
const PERSONS = Object.keys(PERSON_NAME);

// *sein* y verbos de nivel 3: si escribió la forma de otra persona, nombra esa persona (lo que escribió), no la forma que va.
function diagnoseVerb(item, answer, tags, lexicon = []) {
  const given = String(answer).trim().toLowerCase();
  const word = item.word ?? lexicon.find(w => w.pos === 'verb' && w.lemma === item.verb);
  const formsOf = p => (word && word.lemma !== 'sein' ? present(word, p).map(f => f.toLowerCase()) : [SEIN[p]]);
  const persons = PERSONS.filter(p => formsOf(p).includes(given));
  if (!persons.length) {
    return {
      rule: tags[item.tag]?.rule ?? 'Repasá la regla de este tema.',
      rule_de: tags[item.tag]?.rule_de ?? 'Wiederhole die grammatische Regel für dieses Thema.',
      prereq: null,
    };
  }
  const names = persons.map(p => PERSON_NAME[p]);
  return {
    rule: `Esa forma es la de ${names.join(', ')}: fijate quién es el sujeto.`,
    rule_de: 'Überprüfe das Subjekt: Die Verbendung muss zum Subjekt passen.',
    prereq: null,
  };
}

const GENDER_NAME = {m: 'masculino', f: 'femenino', n: 'neutro', pl: 'plural'};
const TAG_SUFFIX = {m: 'mask', f: 'fem', n: 'neut', pl: 'plural'};
const KASE_NAME = {nom: 'Nominativ (sujeto)', akk: 'Akkusativ (objeto directo)'};

// item: {tag, dims: {gender, kase, det}, noun, verb}; tags: curriculum.tags (para la regla del tag).
export function diagnose(item, answer, tags = {}, lexicon = []) {
  if (item.dims?.person) return diagnoseVerb(item, answer, tags, lexicon);
  const {gender, kase, det} = item.dims;
  const cells = findArticle(String(answer).trim().toLowerCase()).filter(c => c.det === det);
  if (cells.some(c => c.gender === gender && c.kase !== kase))
    return {
      rule: `*${item.verb ?? 'Este verbo'}* pide ${KASE_NAME[kase]}.`,
      rule_de: `${item.verb ? `*${item.verb}*` : 'Dieses Verb'} verlangt ${kase === 'akk' ? 'Akkusativ' : 'Nominativ'}.`,
      prereq: null,
    };
  const wrong = cells.find(c => c.kase === kase && c.gender !== gender);
  if (wrong) {
    const what = wrong.gender === 'pl' ? 'plural: revisá el número' : `${GENDER_NAME[wrong.gender]}: revisá el género`;
    const whatDe = wrong.gender === 'pl'
      ? `Achte auf den Numerus: *${item.noun}* steht nicht im Plural.`
      : `Achte auf das Geschlecht: *${item.noun}* hat ein anderes grammatisches Geschlecht.`;
    return {
      rule: `*${item.noun}* no es ${what}.`,
      rule_de: whatDe,
      prereq: `a1.nom.${TAG_SUFFIX[gender]}`,
    };
  }
  return {
    rule: tags[item.tag]?.rule ?? 'Repasá la regla de este tema.',
    rule_de: tags[item.tag]?.rule_de ?? 'Wiederhole die grammatische Regel für dieses Thema.',
    prereq: null,
  };
}
