// Carga el contenido compilado (data/*.json). El service worker lo cachea para que ande offline.
const get = async path => (await fetch(path)).json();

export async function loadContent() {
  const [curriculum, lexicon, ltMap] = await Promise.all([get('data/curriculum.json'), get('data/lexicon.json'), get('data/lt-map.json')]);
  const ids = [...new Set(curriculum.topics.filter(t => t.unit).map(t => t.unit))];
  const units = Object.fromEntries(await Promise.all(ids.map(async id => {
    const [level, num] = id.split('.');
    return [id, await get(`data/levels/${level}/unit-${num.slice(1)}.json`)];
  })));
  return { curriculum, lexicon, ltMap, units };
}
