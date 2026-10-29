// Router por hash: "#/ajustes" → { view: 'ajustes', params: [] }.
export function parseHash(hash) {
  const [view, ...params] = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { view: view ?? 'home', params };
}
