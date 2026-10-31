import { parseHash } from './core/router.js';
import * as store from './core/store.js';
import home from './ui/home.js';
import ajustes from './ui/ajustes.js';
import pruebas from './ui/pruebas.js';
import grupo from './ui/grupo.js';
import fin from './ui/fin.js';
import ficha from './ui/ficha.js';
import mapa from './ui/mapa.js';
import tema from './ui/tema.js';
import * as lt from './services/languagetool.js';
import { applyResolved } from './core/inicio.js';
import { loadContent } from './core/content.js';

const views = { home, ajustes, pruebas, grupo, fin, ficha, mapa, tema };
let contentPromise;
const content = () => (contentPromise ??= loadContent());
const main = document.getElementById('view');

async function render() {
  const { view, params } = parseHash(location.hash);
  main.replaceChildren();
  await (views[view] ?? home)(main, { store, content, params });
  main.focus();
}

// El service worker nuevo espera hasta que el usuario toca el aviso; después se recarga una sola vez.
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const banner = document.getElementById('update');
  const reg = await navigator.serviceWorker.register('sw.js');
  const show = worker => {
    banner.hidden = false;
    banner.onclick = () => worker.postMessage('skipWaiting');
  };
  if (reg.waiting && navigator.serviceWorker.controller) show(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) show(worker);
    });
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

// Cola de LanguageTool: las escrituras sin red se corrigen al arrancar y al volver la conexión.
// Cada una resuelve el intento pendiente, penaliza el mastery (salvo cuarentena), suma al log y deja un aviso en el inicio.
let processing = false;
async function processLtQueue() {
  if (processing || !navigator.onLine) return;
  processing = true;
  try {
    if (!((await store.get('ltQueue')) ?? []).length) return;
    const resolved = await lt.processQueue(store, text => lt.check(text));
    if (!resolved.length) return;
    const { ltMap } = await content();
    const [progress, mastery, log, quarantine, notices] = await Promise.all(['progress', 'mastery', 'log', 'quarantine', 'notices'].map(k => store.get(k)));
    let state = { progress: progress ?? { steps: {} }, mastery: mastery ?? { tags: {}, pairs: {} }, log: log ?? [] };
    const fresh = [];
    for (const entry of resolved) {
      const { notice, ...next } = applyResolved({ state, entry, ltMap, quarantine: quarantine ?? [], now: Date.now() });
      state = next;
      fresh.push(notice);
    }
    await store.setMany({ ...state, notices: [...(notices ?? []), ...fresh] });
    if (['', '#/'].includes(location.hash)) render();
  } catch (e) {
    console.warn('cola de LanguageTool', e);
  } finally {
    processing = false;
  }
}

await store.init();
window.addEventListener('hashchange', render);
render();
processLtQueue();
window.addEventListener('online', processLtQueue);
store.requestPersist();
registerSW();
