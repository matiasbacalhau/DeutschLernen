// Piezas compartidas por los checks: armado del Result y evaluación de respuestas escritas.
import { matchAnswer, wrongWords } from '../normalize.js';
import { diagnose } from '../diagnose.js';

export const tagInfo = (ctx, tag) => ctx.curriculum.tags[tag] ?? {};

export function result(key, tag, ok, {rule = null, notice = null, prereq = null, ...extra} = {}) {
  return {key, tag, ok, rule: ok ? null : rule, notice, prereq, review: false, ...extra};
}

// Los tipos multi-ítem siempre usan `id#n`, aun con un solo ítem.
export const keyFor = (ex, n) => `${ex.id}#${n}`;

// item: ejercicio o hueco con {tag, answers, errors?, dims?, generated?}.
export function checkWritten(key, item, answer, ctx) {
  const info = tagInfo(ctx, item.tag);
  const m = matchAnswer(answer, item.answers, {orthographic: !!info.orthographic});
  if (m.ok) return result(key, item.tag, true, {notice: m.notice});
  if (item.generated) {
    const d = diagnose(item, answer, ctx.curriculum.tags);
    return result(key, item.tag, false, d);
  }
  const hit = (item.errors ?? []).find((e) => matchAnswer(answer, [e.answer], {orthographic: !!info.orthographic}).ok);
  // En una frase, además de la regla, las palabras que difieren: así se ve también un segundo error.
  const wrong = wrongWords(String(answer), item.answers, {orthographic: !!info.orthographic});
  // `given`: el texto tal como llegó, para el registro local (así se puede ver por qué una respuesta no se aceptó).
  return result(key, item.tag, false, {rule: hit?.rule ?? info.rule, given: String(answer), ...(wrong.length ? {wrong} : {})});
}

// options: [{text, correct?, rule?}]; answer: índice elegido.
export function checkOption(key, tag, options, answer, ctx) {
  const opt = options[answer];
  if (opt?.correct) return result(key, tag, true);
  return result(key, tag, false, {rule: opt?.rule ?? tagInfo(ctx, tag).rule});
}
