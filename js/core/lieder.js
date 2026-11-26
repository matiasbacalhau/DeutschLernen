// Lógica pura del módulo Lieder: cálculo híbrido de bucle y corrección de huecos (Hören).
export const LOOP_CLIP_MAX_SECONDS = 45;

/**
 * Resuelve el rango de reproducción en bucle según la duración del audio cargado:
 * - Recorte (< 45 s): repite todo el archivo [0, duration].
 * - Canción entera (>= 45 s): usa [start, end] definido en la canción si es válido.
 */
export function resolveLoopRange(duration, songLoop) {
  if (duration > 0 && duration < LOOP_CLIP_MAX_SECONDS) {
    return { start: 0, end: duration, mode: 'clip' };
  }
  if (songLoop && songLoop.end > songLoop.start) {
    return { start: songLoop.start, end: songLoop.end, mode: 'song' };
  }
  return { start: 0, end: duration || 0, mode: 'full' };
}

/** Separa una línea con marcadores `___` en fragmentos de texto y cantidad de huecos. */
export function splitGapLine(text) {
  const parts = String(text ?? '').split('___');
  return { parts, gapCount: Math.max(0, parts.length - 1) };
}

const norm = s => String(s ?? '').trim().toLowerCase().normalize('NFC');

/** Evalúa los inputs de una línea contra las variantes aceptadas en `line.answers`. */
export function checkGapLine(inputs, line) {
  const expected = line?.answers ?? [];
  const results = expected.map((variants, i) => {
    const given = norm(inputs?.[i]);
    if (!given) return false;
    return variants.some(v => norm(v) === given);
  });
  return { ok: results.length > 0 && results.every(Boolean), results };
}
