// Entrada del Worker de Cloudflare: conecta el handler con los proveedores reales y el catálogo de data/lt-map.json.
// Sumar un proveedor = un archivo en providers/ y una línea en `providers`.
import Anthropic from '@anthropic-ai/sdk';
import ltMap from '../data/lt-map.json' with { type: 'json' };
import lexicon from '../data/lexicon.json' with { type: 'json' };
import { handle } from './worker.js';
import { makeClaude } from './providers/claude.js';
import { makeGemini } from './providers/gemini.js';
import { nounIndex } from './genders.js';

const providers = {
  claude: makeClaude(env => new Anthropic({apiKey: env.ANTHROPIC_API_KEY})),
  gemini: makeGemini((...args) => fetch(...args)),
};
const nouns = nounIndex(lexicon);
const hits = new Map();
// Workers Logs indexa los campos de cada línea JSON.
const log = (level, msg, fields) => console[level === 'warn' ? 'warn' : 'log'](JSON.stringify({level, msg, ...fields}));

export default {
  fetch: (request, env) => handle(request, env, {catalog: ltMap.llm_categories, nouns, providers, log, hits}),
};
