// Comparación de respuestas: tolera teclado y ortografía solo cuando el tag no es ortográfico.

// Limpia comillas tipográficas, espacios y puntuación final.
export function clean(s) {
  return s.trim().replace(/\s+/g, ' ')
    .replace(/[’‘]/g, "'").replace(/[„“”]/g, '"')
    .replace(/[.!?]+$/, '').trim();
}

const lower = (s) => s.toLocaleLowerCase('de');
const UMLAUT = {ä: ['ae', 'a'], ö: ['oe', 'o'], ü: ['ue', 'u']};

// Pliega ß y umlauts en minúsculas; `i` elige la variante (0 = ae/oe/ue, 1 = a/o/u).
function fold(s, i) {
  return lower(s).replace(/ß/g, 'ss').replace(/[äöü]/g, (c) => UMLAUT[c][i]);
}

// Primer rasgo que la respuesta no respetó: ß, luego ä/ö/ü, luego mayúscula.
function notice(answer, target) {
  const a = lower(answer), t = target;
  if (t.includes('ß') && !a.includes('ß')) return 'ojo: ß';
  const um = [...t].find((c) => UMLAUT[c] && !answer.includes(c));
  if (um) return `ojo: ${um}`;
  return 'ojo: mayúscula';
}

const sameButFirstCase = (a, b) => a.slice(1) === b.slice(1) && lower(a[0]) === lower(b[0]);

export function matchAnswer(answer, accepted, {orthographic}) {
  const a = clean(answer);
  const targets = accepted.map(clean);
  // En modo ortográfico, la mayúscula inicial solo se tolera en frases (inicio de oración).
  const firstCaseOk = (t) => !orthographic || t.includes(' ');
  if (targets.some((t) => t === a || (a && firstCaseOk(t) && sameButFirstCase(a, t)))) return {ok: true, notice: null};
  if (orthographic) return {ok: false, notice: null};
  for (const t of targets) {
    if ([0, 1].some((i) => fold(a, i) === fold(t, i))) return {ok: true, notice: notice(a, t)};
  }
  return {ok: false, notice: null};
}

const tokens = (s) => [...s.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({w: m[0], offset: m.index, length: m[0].length}));

// Las palabras de una frase que no están en la respuesta aceptada más parecida (por subsecuencia común más larga),
// como [{offset, length}] sobre `answer`. Solo subraya: nunca dice cuál es la forma correcta (regla 3).
export function wrongWords(answer, accepted, {orthographic}) {
  const a = tokens(answer);
  if (a.length < 2) return [];
  const same = (x, y) => lower(x) === lower(y) || (!orthographic && [0, 1].some((i) => fold(x, i) === fold(y, i)));
  let best = null;
  for (const target of accepted) {
    const t = tokens(target).map((x) => x.w);
    // L[i][j]: subsecuencia común más larga entre a[i..] y t[j..].
    const L = Array.from({length: a.length + 1}, () => new Array(t.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = t.length - 1; j >= 0; j--) {
        L[i][j] = same(a[i].w, t[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
      }
    }
    if (best && L[0][0] <= best.L[0][0]) continue;
    best = {L, t};
  }
  const wrong = [];
  for (let i = 0, j = 0; i < a.length;) {
    if (j < best.t.length && same(a[i].w, best.t[j])) { i++; j++; }
    else if (j < best.t.length && best.L[i][j + 1] >= best.L[i + 1][j]) j++;
    else wrong.push({offset: a[i].offset, length: a[i].length}), i++;
  }
  return wrong;
}
