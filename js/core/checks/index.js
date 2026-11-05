// Despacha por tipo. Las escrituras (writing-*) se corrigen con LanguageTool, inyectado en ctx.lt.
import { check as choice } from './choice.js';
import { check as gap } from './gap.js';
import { check as situation } from './situation.js';
import { check as transform } from './transform.js';
import { check as translate } from './translate.js';
import { check as order } from './order.js';
import { check as spotError } from './spot-error.js';
import { check as reading } from './reading.js';
import { check as detective } from './detective.js';
import { check as writing } from './writing.js';
import { check as card } from './card.js';

const CHECKS = {choice, gap, situation, transform, translate, order, 'spot-error': spotError, reading, detective, 'writing-guided': writing, 'writing-free': writing, card};

export async function checkExercise(exercise, answer, ctx) {
  const fn = CHECKS[exercise.type];
  if (!fn) throw new Error(`Tipo sin check: ${exercise.type}`);
  return fn(exercise, answer, ctx);
}

// Igual que count_items de tools/validate.py.
export function countItems(ex) {
  if (ex.type === 'situation') return (ex.gaps ?? []).length;
  if (ex.type === 'reading') return (ex.questions ?? []).length;
  if (ex.type === 'detective') return 1 + (ex.apply ?? []).length;
  return 1;
}
