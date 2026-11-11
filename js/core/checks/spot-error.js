import { matchAnswer } from '../normalize.js';
import { result, tagInfo } from './common.js';

export async function check(ex, {index, text}, ctx) {
  const info = tagInfo(ctx, ex.tag);
  const rule = ex.rule ?? info.rule;
  const rule_de = ex.rule_de ?? info.rule_de;
  // Si tocó una palabra correcta, la regla del ítem es la pista para encontrar el error (no revela la forma).
  if (index !== ex.wrong) {
    return [result(ex.id, ex.tag, false, {
      rule: `Esa palabra está bien. ${rule}`,
      rule_de: rule_de ? `Dieses Wort ist richtig. ${rule_de}` : null,
    })];
  }
  const ok = matchAnswer(text ?? '', ex.corrections, {orthographic: !!info.orthographic});
  return [result(ex.id, ex.tag, ok.ok, {rule, rule_de, notice: ok.notice})];
}
