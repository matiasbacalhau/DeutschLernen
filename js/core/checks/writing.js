// Escritura (writing-guided / writing-free): LanguageTool encuentra los errores y lt-map los traduce.
// El texto de cada marca sale solo de lt-map, nunca del mensaje de LanguageTool ni de sus reemplazos (regla 3).
import { result } from './common.js';

export function gradeWriting(matches, ltMap) {
  const notices = new Set(ltMap.notice_categories ?? []);
  const marks = [];
  const penalties = [];
  for (const mt of matches) {
    const cat = mt.rule.category?.id;
    const entry = ltMap.rules?.[mt.rule.id];
    const base = {offset: mt.offset, length: mt.length};
    if (notices.has(cat)) {
      marks.push({...base, text: ltMap.categories?.[cat] ?? 'estilo', kind: 'notice'});
      continue;
    }
    if (!entry) console.warn('unmapped', mt.rule.id, cat);
    marks.push({...base, text: entry?.es ?? ltMap.categories?.[cat] ?? 'otro error', kind: 'error'});
    if (entry?.tag && !penalties.some(p => p.tag === entry.tag)) penalties.push({tag: entry.tag});
  }
  return {ok: !marks.some(x => x.kind === 'error'), marks, penalties};
}

export async function check(exercise, answer, {lt, ltMap}) {
  let matches;
  try {
    matches = await lt.check(answer.text);
  } catch {
    return [result(exercise.id, null, false, {pending: true})];
  }
  const {ok, marks, penalties} = gradeWriting(matches, ltMap);
  const ltRules = matches.map(mt => ({rule: mt.rule.id, mapped: !!ltMap.rules?.[mt.rule.id]}));
  return [result(exercise.id, null, ok, {penalties, marks, ltRules})];
}
