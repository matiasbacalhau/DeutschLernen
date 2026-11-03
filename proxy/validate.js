// Valida la respuesta del modelo igual para todos los proveedores.
// El modelo cita el fragmento con error ({quote, occurrence}); el offset lo calcula este archivo, porque los LLM cuentan mal los caracteres.
const LETTER = /[\p{L}\p{N}]/u;

// errors: [{quote, occurrence, category}]. Devuelve {marks: [{offset, length, category}], dropped: {motivo: cantidad}}.
export function validate(text, errors, catalog) {
  const marks = [];
  const dropped = {};
  const drop = reason => { dropped[reason] = (dropped[reason] ?? 0) + 1; };
  for (const e of errors ?? []) {
    if (!Object.hasOwn(catalog, e?.category)) { drop('category_unknown'); continue; }
    const offset = locate(text, e.quote, e.occurrence);
    if (offset === 'not_found' || offset === 'off_word') { drop(offset === 'off_word' ? 'offset_off_word' : 'quote_not_found'); continue; }
    if (marks.some(m => m.offset === offset && m.length === e.quote.length)) { drop('duplicate'); continue; }
    marks.push({offset, length: e.quote.length, category: e.category});
  }
  return {marks, dropped};
}

// Offset de la aparición n.º `occurrence` de `quote` como palabra (con bordes de palabra a los dos lados).
// 'off_word' si la cita aparece solo dentro de otras palabras.
function locate(text, quote, occurrence) {
  if (typeof quote !== 'string' || !quote || !Number.isInteger(occurrence) || occurrence < 1) return 'not_found';
  let seen = 0;
  let inside = false;
  for (let at = text.indexOf(quote); at >= 0; at = text.indexOf(quote, at + 1)) {
    if (LETTER.test(text[at - 1] ?? '') || LETTER.test(text[at + quote.length] ?? '')) { inside = true; continue; }
    if (++seen === occurrence) return at;
  }
  return seen === 0 && inside ? 'off_word' : 'not_found';
}
