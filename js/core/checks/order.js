// Compara por texto (nunca por índice): los chunks pueden repetirse.
import { clean } from '../normalize.js';
import { result, tagInfo } from './common.js';

const joined = (chunks) => clean(chunks.join(' '));

export async function check(ex, answer, ctx) {
  const got = joined(answer);
  const ok = ex.answers.some((a) => joined(a) === got);
  return [result(ex.id, ex.tag, ok, {rule: tagInfo(ctx, ex.tag).rule})];
}
