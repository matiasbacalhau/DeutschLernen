import { matchAnswer } from '../normalize.js';
import { result, tagInfo } from './common.js';

export async function check(ex, {index, text}, ctx) {
  const rule = ex.rule ?? tagInfo(ctx, ex.tag).rule;
  // Si tocó una palabra correcta, la regla del ítem es la pista para encontrar el error (no revela la forma).
  if (index !== ex.wrong) return [result(ex.id, ex.tag, false, {rule: `Esa palabra está bien. ${rule}`})];
  const ok = matchAnswer(text ?? '', ex.corrections, {orthographic: !!tagInfo(ctx, ex.tag).orthographic});
  return [result(ex.id, ex.tag, ok.ok, {rule, notice: ok.notice})];
}
