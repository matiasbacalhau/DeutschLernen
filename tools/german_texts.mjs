// Lista todo el alemán que entra a la app, para que lt_check.py lo pase por LanguageTool.
// Uso: node tools/german_texts.mjs  →  JSON [{where, text, ignore?}]
// Los textos de varias oraciones (reading.text, model) llevan multi: true y se chequean de a uno.
// No se chequean: distractores de choice, la frase con el error de spot-error, ni las
// cursivas/tablas de la ficha (son fragmentos; el resto de la ficha es castellano).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { instances } from '../js/core/generators/articulo-caso.js';

const fill = (text, answer) => text.replace('___', answer);

function exerciseTexts(ex) {
  const out = [];
  const add = (field, text, multi) => out.push({where: `${ex.id}: ${field}`, text, ...(multi && {multi: true})});
  switch (ex.type) {
    case 'gap':
      add('text', fill(ex.text, ex.answers[0]));
      break;
    case 'situation': {
      let i = 0;
      ex.bubbles.forEach((b, n) => {
        const text = b.text.replace(/___/g, () => ex.gaps[i++]?.answers[0] ?? '___');
        add(`bubbles[${n}]`, text);
      });
      break;
    }
    case 'transform':
    case 'translate':
      ex.answers.forEach((a, n) => add(`answers[${n}]`, a));
      break;
    case 'order': {
      // Los chunks van en mayúscula de mitad de frase: la oración se chequea con la primera letra en mayúscula.
      const sentence = (a) => { const t = a.join(' '); return t.charAt(0).toLocaleUpperCase('de') + t.slice(1); };
      ex.answers.forEach((a, n) => add(`answers[${n}]`, sentence(a)));
      break;
    }
    case 'choice':
      ex.options.forEach((o, n) => { if (o.correct) add(`options[${n}]`, o.text); });
      break;
    case 'spot-error': {
      const tokens = ex.tokens.slice();
      tokens[ex.wrong] = ex.corrections[0];
      add('corrected', tokens.join(' '));
      break;
    }
    case 'reading':
      add('text', ex.text, true);
      // Las preguntas se escriben en alemán (prompt, respuestas escritas y opciones); si una
      // va en castellano, el ejercicio lleva lt_ignore.
      ex.questions.forEach((q, i) => {
        add(`questions[${i}].prompt`, q.prompt);
        (q.answers ?? []).forEach((a, n) => { if (typeof a === 'string') add(`questions[${i}].answers[${n}]`, a); });
        (q.options ?? []).forEach((o, n) => { if (o.correct) add(`questions[${i}].options[${n}]`, o.text); });
      });
      break;
    case 'detective':
      ex.sentences.forEach((s, n) => add(`sentences[${n}]`, s.de));
      ex.apply.forEach((a, i) => a.answers.forEach((ans, n) =>
        add(`apply[${i}].answers[${n}]`, a.text.includes('___') ? fill(a.text, ans) : ans)));
      break;
    case 'writing-guided':
    case 'writing-free':
      add('model', ex.model, true);
      break;
  }
  if (ex.lt_ignore) out.forEach(o => { o.ignore = ex.lt_ignore; });
  return out;
}

export function germanTexts({curriculum, lexicon, templates, units}) {
  const out = [];
  for (const [tag, t] of Object.entries(curriculum.tags ?? {}))
    (t.examples ?? []).forEach((e, n) => out.push({where: `curriculum ${tag}: examples[${n}]`, text: e.de}));
  for (const tpl of templates)
    for (const ex of instances(tpl, lexicon)) out.push({where: `${ex.id}: text`, text: fill(ex.text, ex.answers[0])});
  for (const u of units)
    for (const topic of u.topics)
      for (const step of topic.steps ?? [])
        for (const ex of step.exercises ?? []) out.push(...exerciseTexts(ex));
  return out;
}

function main() {
  const data = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
  const read = f => JSON.parse(readFileSync(join(data, f), 'utf8'));
  const units = [];
  for (const level of readdirSync(join(data, 'levels')))
    for (const f of readdirSync(join(data, 'levels', level)).sort()) units.push(read(`levels/${level}/${f}`));
  const texts = germanTexts({curriculum: read('curriculum.json'), lexicon: read('lexicon.json'),
    templates: read('templates.json'), units});
  process.stdout.write(JSON.stringify(texts));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
