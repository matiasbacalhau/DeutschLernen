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
  if (targets.some((t) => t === a || (a && sameButFirstCase(a, t)))) return {ok: true, notice: null};
  if (orthographic) return {ok: false, notice: null};
  for (const t of targets) {
    if ([0, 1].some((i) => fold(a, i) === fold(t, i))) return {ok: true, notice: notice(a, t)};
  }
  return {ok: false, notice: null};
}
