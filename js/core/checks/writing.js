// Escritura (writing-guided / writing-free): LanguageTool encuentra los errores y lt-map los traduce.
// El corrector de gramática (js/services/grammar.js) suma marcas {offset, length, llm: categoría, src}, traducidas por lt-map.llm_categories.
// El texto de cada marca sale solo de lt-map, nunca del mensaje de LanguageTool ni de sus reemplazos (regla 3).
import { result } from './common.js';
import { normalizeAcceptedWord, buildAcceptedWordsSet, isAcceptedWord } from '../accepted-words.js';

export { normalizeAcceptedWord, buildAcceptedWordsSet, isAcceptedWord };

const overlaps = (a, b) => a.offset < b.offset + b.length && b.offset < a.offset + a.length;

const IMPLICIT_TAGS = {
  DAT_AFTER_PREP: ['a2.dativ'],
  DE_AGREEMENT: ['a1.nom.mask', 'a1.nom.fem', 'a1.nom.neut', 'a1.nom.plural'],
  OBJECT_AGREEMENT: ['a1.akk.mask', 'a1.akk.fem', 'a1.akk.neut', 'a1.akk.plural'],
};

function isRuleActive(ruleId, entryTag, activeSet) {
  if (!activeSet) return true;
  if (entryTag) return activeSet.has(entryTag);
  const implicit = IMPLICIT_TAGS[ruleId];
  if (implicit) return implicit.some(t => activeSet.has(t));
  return true;
}

export function countSentences(text) {
  if (!text) return 0;
  return (String(text).match(/[^.!?]+[.!?]*/g) ?? []).map(s => s.trim()).filter(Boolean).length;
}

const wordOf = (mt, text) => {
  if (mt.context?.text != null && mt.context?.offset != null && mt.context?.length != null) {
    return mt.context.text.slice(mt.context.offset, mt.context.offset + mt.context.length);
  }
  if (text != null && mt.offset != null && mt.length != null) {
    return text.slice(mt.offset, mt.offset + mt.length);
  }
  return '';
};

export const relevant = (matches, ltMap, { text, acceptedWords } = {}) => {
  const set = buildAcceptedWordsSet(acceptedWords ?? [], ltMap?.accepted_words ?? []);
  if (!set.size) return matches;
  return matches.filter(mt => {
    if (mt.rule?.id !== 'GERMAN_SPELLER_RULE' && mt.rule?.category?.id !== 'TYPOS') return true;
    const word = wordOf(mt, text);
    return !word || !isAcceptedWord(word, set);
  });
};

export function gradeWriting(allMatches, ltMap, opts = {}) {
  const text = typeof opts === 'string' ? opts : opts.text;
  const acceptedWords = typeof opts === 'object' ? opts.acceptedWords : undefined;
  const activeTags = typeof opts === 'object' ? opts.activeTags : undefined;
  const activeSet = activeTags ? (activeTags instanceof Set ? activeTags : new Set(activeTags)) : null;
  const matches = relevant(allMatches, ltMap, { text, acceptedWords });
  const notices = new Set(ltMap.notice_categories ?? []);
  const llmMarks = matches.filter(mt => mt.llm);
  const marks = [];
  const penalties = [];
  for (const mt of matches) {
    const base = {offset: mt.offset, length: mt.length};
    let entry;
    let fallback;
    let ruleId;
    if (mt.llm) {
      ruleId = mt.llm;
      entry = ltMap.llm_categories?.[mt.llm];
      fallback = 'gramática';
    } else {
      ruleId = mt.rule.id;
      const cat = mt.rule.category?.id;
      if (notices.has(cat)) {
        marks.push({...base, text: ltMap.categories?.[cat] ?? 'estilo', kind: 'notice'});
        continue;
      }
      // El corrector nombra mejor los errores de gramática: la marca de LT que se superpone queda fuera.
      if (cat === 'GRAMMAR' && llmMarks.some(x => overlaps(x, mt))) continue;
      entry = ltMap.rules?.[mt.rule.id];
      if (!entry) console.warn('unmapped', mt.rule.id, cat);
      fallback = ltMap.categories?.[cat] ?? 'otro error';
    }
    const active = isRuleActive(ruleId, entry?.tag, activeSet);
    const kind = active ? 'error' : 'notice';
    marks.push({...base, text: entry?.es ?? fallback, kind});
    if (active && entry?.tag && !penalties.some(p => p.tag === entry.tag)) penalties.push({tag: entry.tag});
  }
  const errorCount = marks.filter(x => x.kind === 'error').length;
  const sentences = countSentences(text);
  const score = sentences > 0
    ? Math.max(0, (sentences - errorCount) / sentences)
    : (errorCount === 0 ? 1 : 0);
  const ok = errorCount === 0 || (sentences > 0 && score >= 0.8);
  return {ok, ...(text !== undefined ? {score} : {}), marks, penalties};
}

// Para el log de uso: una entrada por marca; las del corrector llevan proveedor, modelo y traceId.
export const ltRulesOf = (matches, ltMap, opts = {}) => {
  const text = typeof opts === 'string' ? opts : opts.text;
  const acceptedWords = typeof opts === 'object' ? opts.acceptedWords : undefined;
  return relevant(matches, ltMap, { text, acceptedWords }).map(mt => (mt.llm
    ? {rule: `llm:${mt.llm}`, mapped: !!ltMap.llm_categories?.[mt.llm], src: mt.src}
    : {rule: mt.rule.id, mapped: !!ltMap.rules?.[mt.rule.id]}));
};

export async function check(exercise, answer, {lt, ltMap, acceptedWords, activeTags, topicTags}) {
  let matches;
  try {
    matches = await lt.check(answer.text);
  } catch {
    return [result(exercise.id, null, false, {pending: true})];
  }
  const opts = { text: answer.text, acceptedWords, activeTags };
  const filtered = relevant(matches, ltMap, opts);
  const {ok, score, marks, penalties} = gradeWriting(filtered, ltMap, opts);
  const rewards = topicTags ?? exercise.tags;
  return [result(exercise.id, null, ok, {
    score,
    penalties,
    marks,
    ...(rewards ? {rewards} : {}),
    ltRules: ltRulesOf(matches, ltMap, opts),
  })];
}
