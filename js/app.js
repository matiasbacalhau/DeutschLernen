import { parseHash } from './core/router.js';
import * as store from './core/store.js';
import home from './ui/home.js';
import ajustes from './ui/ajustes.js';
import pruebas from './ui/pruebas.js';

const views = { home, ajustes, pruebas };
const main = document.getElementById('view');

async function render() {
  const { view } = parseHash(location.hash);
  main.replaceChildren();
  await (views[view] ?? home)(main, { store });
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

await store.init();
window.addEventListener('hashchange', render);
render();
store.requestPersist();
registerSW();
