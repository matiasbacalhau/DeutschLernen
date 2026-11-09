// dictation: answer = la frase escrita. Sin tag: no toca el mastery (la SRS la mueve applyCommit con `lemmaOk`).
// Cada palabra en aprendizaje se juzga sola (spec §6.1): bien si está escrita y no quedó subrayada.
import { matchAnswer, wrongWords } from '../normalize.js';
import { wordForms } from '../dictation.js';
import { result } from './common.js';

const RULE = 'Compará tu frase con la original.';

const tokens = (s) => [...s.matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map((m) => ({w: m[0], offset: m.index}));

export async function check(ex, answer, ctx) {
  const given = String(answer);
  const m = matchAnswer(given, [ex.text], {orthographic: false});
  const lemmaOk = {};
  if (m.ok) {
    for (const l of ex.lemmas) lemmaOk[l] = true;
    return [result(ex.id, null, true, {notice: m.notice, lemmaOk})];
  }
  const wrong = wrongWords(given, [ex.text], {orthographic: false});
  const marked = new Set(wrong.map((w) => w.offset));
  const written = tokens(given).filter((t) => !marked.has(t.offset)).map((t) => t.w);
  for (const l of ex.lemmas) {
    const word = (ctx.lexicon ?? []).find((w) => w.lemma === l);
    const forms = word ? wordForms(word) : [l];
    lemmaOk[l] = written.some((w) => matchAnswer(w, forms, {orthographic: false}).ok);
  }
  // Una sola pista: con palabras subrayadas, la del subrayado (grupo.js); sin ellas, la regla.
  return [result(ex.id, null, false, {given, lemmaOk, ...(wrong.length ? {wrong} : {rule: RULE})})];
}
