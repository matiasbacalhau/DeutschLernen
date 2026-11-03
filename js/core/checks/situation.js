import { checkWritten, keyFor } from './common.js';

export async function check(ex, answer, ctx) {
  return ex.gaps.map((g, i) => checkWritten(keyFor(ex, i), g, answer[i] ?? '', ctx));
}
