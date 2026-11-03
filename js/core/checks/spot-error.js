import { matchAnswer } from '../normalize.js';
import { result, tagInfo } from './common.js';

export async function check(ex, {index, text}, ctx) {
  if (index !== ex.wrong)
    return [result(ex.id, ex.tag, false, {rule: 'Esa palabra está bien · ' + ctx.topicTitle})];
  const ok = matchAnswer(text ?? '', ex.corrections, {orthographic: !!tagInfo(ctx, ex.tag).orthographic});
  return [result(ex.id, ex.tag, ok.ok, {rule: ex.rule ?? tagInfo(ctx, ex.tag).rule, notice: ok.notice})];
}
