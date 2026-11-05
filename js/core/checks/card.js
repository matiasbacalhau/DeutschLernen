// card: nivel 1 → answer es el índice de la opción; nivel 2 → texto con artículo (verbos: el infinitivo).
// Sin tag: no toca el mastery (el SRS lo mueve `vocab`).
import { matchAnswer } from '../normalize.js';
import { result } from './common.js';

const RULE_1 = 'Esa no es la traducción. Fijate en la palabra y probá de nuevo la próxima vez.';
const RULE_2 = 'Eso no coincide con la palabra. Revisá cómo se escribe, con su artículo si es un sustantivo.';

// Formas aceptadas: "<artículo> <lema>" por cada artículo del léxico con ese lema; los verbos y los sustantivos sin
// artículo, el lema.
export function forms(ex, lexicon) {
  const w = ex.word;
  if (w.pos !== 'noun') return [w.lemma];
  const articles = new Set([w.article, ...lexicon.filter((x) => x.lemma === w.lemma && x.pos === 'noun').map((x) => x.article)]);
  const out = [...articles].filter(Boolean).map((a) => `${a} ${w.lemma}`);
  return out.length ? out : [w.lemma]; // sin artículo en el léxico (países como *Deutschland*): el lema solo
}

export async function check(ex, answer, ctx) {
  if (ex.rung === 1) {
    const ok = !!ex.options[answer]?.correct;
    return [result(ex.id, null, ok, {rule: RULE_1})];
  }
  const m = matchAnswer(String(answer), forms(ex, ctx.lexicon ?? []), {orthographic: false});
  return [result(ex.id, null, m.ok, {rule: RULE_2, notice: m.notice, given: String(answer)})];
}
