// Compara por texto (nunca por índice): los chunks pueden repetirse.
// La mayúscula de la primera letra se pliega (un chunk escrito a mitad de frase puede abrirla);
// la del resto de la frase sigue contando.
import { clean } from '../normalize.js';
import { result, tagInfo } from './common.js';

const foldFirst = (s) => s.charAt(0).toLocaleLowerCase('de') + s.slice(1);
const joined = (chunks) => foldFirst(clean(chunks.join(' ')));

export async function check(ex, answer, ctx) {
  const got = joined(answer);
  const ok = ex.answers.some((a) => joined(a) === got);
  const info = tagInfo(ctx, ex.tag);
  return [result(ex.id, ex.tag, ok, {rule: info.rule, rule_de: info.rule_de})];
}
