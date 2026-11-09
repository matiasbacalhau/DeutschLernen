// Escritura (writing-guided / writing-free): LanguageTool encuentra los errores y lt-map los traduce.
// El corrector de gramática (js/services/grammar.js) suma marcas {offset, length, llm: categoría, src}, traducidas por lt-map.llm_categories.
// El texto de cada marca sale solo de lt-map, nunca del mensaje de LanguageTool ni de sus reemplazos (regla 3).
import { result } from './common.js';

const overlaps = (a, b) => a.offset < b.offset + b.length && b.offset < a.offset + a.length;

// Nombres, ciudades y marcas que LanguageTool no conoce (lt-map.accepted_words): su "mal escrita" no cuenta.
// La palabra sale del contexto de la coincidencia, así anda igual con las que vuelven de la cola offline.
const key = w => w.normalize('NFC').toLowerCase();
const isAcceptedWord = (mt, ltMap) => {
  if (mt.rule?.id !== 'GERMAN_SPELLER_RULE' || !mt.context) return false;
  const {text, offset, length} = mt.context;
  return (ltMap.accepted_words ?? []).some(w => key(w) === key(text.slice(offset, offset + length)));
};
const relevant = (matches, ltMap) => matches.filter(mt => !isAcceptedWord(mt, ltMap));

export function gradeWriting(allMatches, ltMap) {
  const matches = relevant(allMatches, ltMap);
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
export const ltRulesOf = (matches, ltMap) => relevant(matches, ltMap).map(mt => (mt.llm
  ? {rule: `llm:${mt.llm}`, mapped: !!ltMap.llm_categories?.[mt.llm], src: mt.src}
  : {rule: mt.rule.id, mapped: !!ltMap.rules?.[mt.rule.id]}));

export async function check(exercise, answer, {lt, ltMap}) {
  let matches;
  try {
    matches = await lt.check(answer.text);
  } catch {
    return [result(exercise.id, null, false, {pending: true})];
  }
  const {ok, marks, penalties} = gradeWriting(matches, ltMap);
  return [result(exercise.id, null, ok, {penalties, marks, ltRules: ltRulesOf(matches, ltMap)})];
}
