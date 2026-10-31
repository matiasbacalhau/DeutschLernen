// Lista todo el alemán que entra a la app, para que lt_check.py lo pase por LanguageTool.
// Uso: node tools/german_texts.mjs  →  JSON [{where, text, ignore?}]
// No se chequean: distractores de choice, la frase con el error de spot-error, ni las
// cursivas/tablas de la ficha (son fragmentos; el resto de la ficha es castellano).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { instances } from '../js/core/generators/articulo-caso.js';

const fill = (text, answer) => text.replace('___', answer);

function exerciseTexts(ex) {
  const out = [];
  const add = (field, text) => out.push({where: `${ex.id}: ${field}`, text});
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
    case 'order':
      ex.answers.forEach((a, n) => add(`answers[${n}]`, a.join(' ')));
      break;
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
      add('text', ex.text);
      break;
    case 'detective':
      ex.apply.forEach((a, n) => add(`apply[${n}]`, a.text.includes('___') ? fill(a.text, a.answers[0]) : a.answers[0]));
      break;
    case 'writing-guided':
    case 'writing-free':
      add('model', ex.model);
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
