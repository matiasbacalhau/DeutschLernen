// Piezas compartidas por los checks: armado del Result y evaluación de respuestas escritas.
import { matchAnswer, wrongWords, closestAnswer, keyWords } from '../normalize.js';
import { diagnose } from '../diagnose.js';

export const tagInfo = (ctx, tag) => ctx.curriculum.tags[tag] ?? {};

export function result(key, tag, ok, {rule = null, notice = null, prereq = null, ...extra} = {}) {
  return {key, tag, ok, rule: ok ? null : rule, notice, prereq, review: false, ...extra};
}

// Los tipos multi-ítem siempre usan `id#n`, aun con un solo ítem.
export const keyFor = (ex, n) => `${ex.id}#${n}`;

// Las palabras que evalúa cada tag, cuando lo evaluado es una palabra (no el orden, como en las W-Fragen).
const KEY_WORDS = {
  'a1.sein.praesens': ['bin', 'bist', 'ist', 'sind', 'seid'],
  'a1.pron.personal': ['ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr'],
};
const ARTICLES = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines'];
const keyWordsOf = tag => KEY_WORDS[tag] ?? (/^a1\.(nom|akk)\./.test(tag ?? '') ? ARTICLES : null);
export const EVALUATED_OK = 'Lo que practica este ejercicio está bien: el error está en lo subrayado, que es de otro tema.';

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
  const opts = {orthographic: !!info.orthographic};
  const wrong = wrongWords(String(answer), item.answers, opts);
  // Si las palabras que evalúa el tag coinciden con la respuesta más parecida, el error es de otro tema: la regla
  // del tag no lo explica.
  const words = keyWordsOf(item.tag);
  const elsewhere = !hit && wrong.length && words && (() => {
    const set = new Set(words);
    return keyWords(String(answer), set).join(' ') === keyWords(closestAnswer(String(answer), item.answers, opts), set).join(' ');
  })();
  // `given`: el texto tal como llegó, para el registro local (así se puede ver por qué una respuesta no se aceptó).
  return result(key, item.tag, false, {rule: hit?.rule ?? (elsewhere ? EVALUATED_OK : info.rule), given: String(answer), ...(wrong.length ? {wrong} : {})});
}

// options: [{text, correct?, rule?}]; answer: índice elegido.
export function checkOption(key, tag, options, answer, ctx) {
  const opt = options[answer];
  if (opt?.correct) return result(key, tag, true);
  return result(key, tag, false, {rule: opt?.rule ?? tagInfo(ctx, tag).rule});
}
