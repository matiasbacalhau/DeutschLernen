import { checkWritten } from './common.js';

export async function check(ex, answer, ctx) {
  return [checkWritten(ex.id, ex, answer, ctx)];
}
