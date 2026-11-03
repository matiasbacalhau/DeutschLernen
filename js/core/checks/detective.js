// Ítem 0 = regla elegida; ítems 1.. = aplicaciones escritas.
import { checkWritten, result, tagInfo } from './common.js';

export async function check(ex, {rule, apply}, ctx) {
  const ok = !!ex.rules[rule]?.correct;
  const first = result(`${ex.id}#0`, ex.tag, ok, {rule: tagInfo(ctx, ex.tag).rule, ...(ok ? {} : {showFicha: true})});
  const rest = ex.apply.map((a, i) => checkWritten(`${ex.id}#${i + 1}`, {...a, tag: ex.tag}, apply[i] ?? '', ctx));
  return [first, ...rest];
}
