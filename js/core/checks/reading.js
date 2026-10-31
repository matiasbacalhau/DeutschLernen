import { checkOption, checkWritten, keyFor } from './common.js';

export async function check(ex, answer, ctx) {
  const n = ex.questions.length;
  return ex.questions.map((q, i) => {
    const key = keyFor(ex, i, n);
    return q.options ? checkOption(key, q.tag, q.options, answer[i], ctx) : checkWritten(key, q, answer[i] ?? '', ctx);
  });
}
