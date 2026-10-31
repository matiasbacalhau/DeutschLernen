import { checkOption, checkWritten, keyFor } from './common.js';

export async function check(ex, answer, ctx) {
  return ex.questions.map((q, i) => {
    const key = keyFor(ex, i);
    return q.options ? checkOption(key, q.tag, q.options, answer[i], ctx) : checkWritten(key, q, answer[i] ?? '', ctx);
  });
}
