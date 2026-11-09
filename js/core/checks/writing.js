// Escritura (writing-guided / writing-free): LanguageTool encuentra los errores y lt-map los traduce.
// El corrector de gramática (js/services/grammar.js) suma marcas {offset, length, llm: categoría, src}, traducidas por lt-map.llm_categories.
// El texto de cada marca sale solo de lt-map, nunca del mensaje de LanguageTool ni de sus reemplazos (regla 3).
import { result } from './common.js';
import { normalizeAcceptedWord, buildAcceptedWordsSet, isAcceptedWord } from '../accepted-words.js';

export { normalizeAcceptedWord, buildAcceptedWordsSet, isAcceptedWord };

const overlaps = (a, b) => a.offset < b.offset + b.length && b.offset < a.offset + a.length;

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
  const matches = relevant(allMatches, ltMap, { text, acceptedWords });
  const notices = new Set(ltMap.notice_categories ?? []);
  const llmMarks = matches.filter(mt => mt.llm);
  const marks = [];
  const penalties = [];
  for (const mt of matches) {
    const base = {offset: mt.offset, length: mt.length};
    let entry;
    let fallback;
    if (mt.llm) {
      entry = ltMap.llm_categories?.[mt.llm];
      fallback = 'gramática';
    } else {
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
    marks.push({...base, text: entry?.es ?? fallback, kind: 'error'});
    if (entry?.tag && !penalties.some(p => p.tag === entry.tag)) penalties.push({tag: entry.tag});
  }
  return {ok: !marks.some(x => x.kind === 'error'), marks, penalties};
}

// Para el log de uso: una entrada por marca; las del corrector llevan proveedor, modelo y traceId.
export const ltRulesOf = (matches, ltMap, opts = {}) => {
  const text = typeof opts === 'string' ? opts : opts.text;
  const acceptedWords = typeof opts === 'object' ? opts.acceptedWords : undefined;
  return relevant(matches, ltMap, { text, acceptedWords }).map(mt => (mt.llm
    ? {rule: `llm:${mt.llm}`, mapped: !!ltMap.llm_categories?.[mt.llm], src: mt.src}
    : {rule: mt.rule.id, mapped: !!ltMap.rules?.[mt.rule.id]}));
};

export async function check(exercise, answer, {lt, ltMap, acceptedWords}) {
  let matches;
  try {
    matches = await lt.check(answer.text);
  } catch {
    return [result(exercise.id, null, false, {pending: true})];
  }
  const opts = { text: answer.text, acceptedWords };
  const filtered = relevant(matches, ltMap, opts);
  const {ok, marks, penalties} = gradeWriting(filtered, ltMap, opts);
  return [result(exercise.id, null, ok, {penalties, marks, ltRules: ltRulesOf(matches, ltMap, opts)})];
}
