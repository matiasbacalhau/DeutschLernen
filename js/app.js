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
import escritura from './ui/escritura.js';
import * as lt from './services/languagetool.js';
import { withGrammar } from './services/grammar.js';
import { applyResolved } from './core/inicio.js';
import { loadContent } from './core/content.js';

const views = { home, ajustes, pruebas, grupo, fin, ficha, mapa, tema, escritura };
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

// Cola de LanguageTool: las escrituras sin red se corrigen al arrancar, al volver la conexión y al volver a la app.
// Cada una se resuelve en el grupo abierto (si sigue ahí, pendiente) o en el intento ya registrado; penaliza el mastery
// (salvo cuarentena), suma al log y deja un aviso en el inicio.
let processing = false;
async function processLtQueue() {
  if (processing || !navigator.onLine) return;
  processing = true;
  try {
    if (!((await store.get('ltQueue')) ?? []).length) return;
    const resolved = await lt.processQueue(store, withGrammar(text => lt.check(text)));
    if (!resolved.length) return;
    const { ltMap } = await content();
    // Una sola transacción (lectura incluida): resultados, grupo abierto, avisos y salida de la cola.
    // Si algo falla antes, las escrituras siguen en la cola.
    await store.update(['progress', 'mastery', 'log', 'quarantine', 'notices', 'group', 'ltQueue'], v => {
      let state = { progress: v.progress ?? { steps: {} }, mastery: v.mastery ?? { tags: {}, pairs: {} }, log: v.log ?? [], group: v.group ?? null };
      let notices = v.notices ?? [];
      for (const entry of resolved) {
        const { notice, ...next } = applyResolved({ state, entry, ltMap, quarantine: v.quarantine ?? [], now: Date.now() });
        state = next;
        notices = [...notices.filter(n => n.key !== notice.key), notice];
      }
      return { ...state, notices, ltQueue: lt.withoutResolved(v.ltQueue, resolved) };
    });
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
// En iOS la PWA vuelve del fondo sin evento online: se reintenta al volver a verse.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') processLtQueue(); });
window.addEventListener('pageshow', e => { if (e.persisted) processLtQueue(); });
store.requestPersist();
registerSW();
