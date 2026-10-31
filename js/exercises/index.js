// Plugins de UI por tipo: render(exercise, el, {submit(answer), ctx}). Cada uno llama a submit una sola vez.
import * as choice from './choice.js';
import * as gap from './gap.js';
import * as situation from './situation.js';
import * as transform from './transform.js';
import * as translate from './translate.js';
import * as order from './order.js';
import * as spotError from './spot-error.js';
import * as reading from './reading.js';
import * as detective from './detective.js';
import * as writing from './writing.js';

const PLUGINS = { choice, gap, situation, transform, translate, order, 'spot-error': spotError, reading, detective, 'writing-guided': writing, 'writing-free': writing };

export function render(exercise, el, opts) {
  const p = PLUGINS[exercise.type];
  if (!p) throw new Error(`Tipo sin UI: ${exercise.type}`);
  p.render(exercise, el, opts);
}
