// Palabras y nombres propios que no deben marcarse como error ortográfico en las escrituras.
// Insensible a mayúsculas/minúsculas y tildes/diacríticos.

export const DEFAULT_ACCEPTED_WORDS = [
  // Nombres del curso y nombres comunes
  'Agustin', 'Agustín', 'Andrea', 'Anna', 'Bruno', 'Camila', 'Carlos', 'Daniel', 'David', 'Diego',
  'Elena', 'Fernando', 'Gabriel', 'Herbert', 'Jan', 'Jana', 'Joaquin', 'Joaquín', 'Jonas', 'Juan',
  'Julian', 'Julián', 'Krause', 'Laura', 'Lea', 'Leo', 'Lucas', 'Lucia', 'Lucía', 'Manuel',
  'Maria', 'María', 'Martin', 'Martín', 'Mateo', 'Matias', 'Matías', 'Max', 'Mia', 'Nicolas',
  'Nicolás', 'Paul', 'Paula', 'Pedro', 'Santiago', 'Sofia', 'Sofía', 'Tom', 'Valentina', 'Yilmaz',
  // Ciudades y países (LATAM, España y DACH)
  'Alemania', 'Argentinien', 'Argentina', 'Asunción', 'Asuncion', 'Austria', 'Barcelona', 'Berlin', 'Berlín',
  'Bogotá', 'Bogota', 'Bolivia', 'Buenos Aires', 'Caracas', 'Chile', 'Colonia', 'Colombia', 'Cordoba',
  'Córdoba', 'Deutschland', 'Dresden', 'Düsseldorf', 'Dusseldorf', 'Ecuador', 'España', 'Frankfurt',
  'Hamburg', 'Hamburgo', 'Italien', 'Italia', 'Kanada', 'Canada', 'Köln', 'Koln', 'La Paz', 'Leipzig',
  'Lima', 'Madrid', 'Medellín', 'Medellin', 'Mendoza', 'México', 'Mexico', 'Montevideo', 'München',
  'Munich', 'Österreich', 'Oesterreich', 'Paraguay', 'Perú', 'Peru', 'Quito', 'Rosario', 'Santiago',
  'Schweiz', 'Suiza', 'Sevilla', 'Spanien', 'Stuttgart', 'Uruguay', 'Valencia', 'Valparaíso',
  'Valparaiso', 'Venezuela', 'Viena', 'Wien', 'Zürich', 'Zurich',
];

export function normalizeAcceptedWord(w) {
  return String(w ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function buildAcceptedWordsSet(customWords = [], defaultWords = DEFAULT_ACCEPTED_WORDS) {
  const set = new Set();
  const add = (w) => {
    if (!w) return;
    const parts = String(w).split(/[\s,]+/);
    for (const part of parts) {
      const norm = normalizeAcceptedWord(part);
      if (norm) set.add(norm);
    }
  };
  for (const w of defaultWords ?? []) add(w);
  for (const w of customWords ?? []) add(w);
  return set;
}

export function isAcceptedWord(word, acceptedSet) {
  const norm = normalizeAcceptedWord(word);
  return norm ? acceptedSet.has(norm) : false;
}
