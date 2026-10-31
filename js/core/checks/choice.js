import { checkOption } from './common.js';

export async function check(ex, answer, ctx) {
  return [checkOption(ex.id, ex.tag, ex.options, answer, ctx)];
}
