// Corre el set de prueba (tools/grammar-bench.json) contra el Worker del corrector y reporta falsos positivos, falsos negativos y latencia.
// Uso: node tools/grammar_bench.mjs <url del Worker> [claude|gemini]
// Criterio para activar un proveedor (completar API en js/services/grammar.js): 0 falsos positivos en los textos correctos.
// Gasta llamadas reales al proveedor (~43 por corrida). Va de a una, con pausa, para no chocar con el rate limit del Worker.
import { readFileSync } from 'node:fs';

const [url, provider] = process.argv.slice(2);
if (!url) {
  console.error('Uso: node tools/grammar_bench.mjs <url del Worker> [claude|gemini]');
  process.exit(2);
}
const ORIGIN = 'https://matiasbacalhau.github.io';
const PAUSE_MS = Number(process.env.BENCH_PAUSE_MS ?? 3500);
const set = JSON.parse(readFileSync(new URL('grammar-bench.json', import.meta.url)));

async function correct(text) {
  const started = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json', origin: ORIGIN},
    body: JSON.stringify(provider ? {text, provider} : {text}),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${body.error} (traceId ${body.traceId})`);
  return {...body, ms: Date.now() - started};
}

const show = (text, m) => `${m.category} «${text.slice(m.offset, m.offset + m.length)}»`;
const fp = [];
const fn = [];
const ms = [];
let meta;
const cases = [...set.correct.map(text => ({text})), ...set.wrong];
for (const [i, c] of cases.entries()) {
  if (i) await new Promise(r => setTimeout(r, PAUSE_MS));
  const out = await correct(c.text);
  meta ??= out;
  ms.push(out.ms);
  const hit = out.marks.find(m => m.category === c.category && c.text.slice(m.offset, m.offset + m.length).includes(c.quote));
  for (const m of out.marks) if (m !== hit) fp.push(`${c.text} → ${show(c.text, m)} [${out.traceId}]`);
  if (c.category && !hit) fn.push(`${c.text} → faltó ${c.category} «${c.quote}» [${out.traceId}]`);
  process.stdout.write(c.category ? (hit ? '✓' : '✗') : (out.marks.length ? '✗' : '·'));
}
ms.sort((a, b) => a - b);
console.log(`\n\n${meta.provider} · ${meta.model} · deploy ${meta.version}`);
console.log(`Falsos positivos: ${fp.length}`);
for (const l of fp) console.log(`  ${l}`);
console.log(`Falsos negativos: ${fn.length} de ${set.wrong.length}`);
for (const l of fn) console.log(`  ${l}`);
console.log(`Latencia: mediana ${ms[ms.length >> 1]} ms, máxima ${ms[ms.length - 1]} ms`);
process.exit(fp.length ? 1 : 0);
