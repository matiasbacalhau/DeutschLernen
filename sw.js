// La CI reemplaza 'dev' por el commit; cada deploy crea una caché nueva.
const CACHE = 'dev';

// tests/sw.test.js verifica que esta lista tenga todos los archivos de la app.
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/core/backup.js',
  'js/core/checks/choice.js',
  'js/core/checks/common.js',
  'js/core/checks/detective.js',
  'js/core/checks/gap.js',
  'js/core/checks/index.js',
  'js/core/checks/order.js',
  'js/core/checks/reading.js',
  'js/core/checks/situation.js',
  'js/core/checks/spot-error.js',
  'js/core/checks/transform.js',
  'js/core/checks/translate.js',
  'js/core/checks/writing.js',
  'js/core/checks.js',
  'js/core/content.js',
  'js/core/diagnose.js',
  'js/core/feedback.js',
  'js/core/generators/articulo-caso.js',
  'js/core/generators/index.js',
  'js/core/generators/sein-praesens.js',
  'js/core/glossary.js',
  'js/core/inicio.js',
  'js/core/log.js',
  'js/core/mastery.js',
  'js/core/morph.js',
  'js/core/progress.js',
  'js/core/runner.js',
  'js/core/normalize.js',
  'js/core/router.js',
  'js/core/scheduler.js',
  'js/core/store.js',
  'js/exercises/choice.js',
  'js/exercises/common.js',
  'js/exercises/detective.js',
  'js/exercises/gap.js',
  'js/exercises/index.js',
  'js/exercises/order.js',
  'js/exercises/reading.js',
  'js/exercises/situation.js',
  'js/exercises/spot-error.js',
  'js/exercises/transform.js',
  'js/exercises/translate.js',
  'js/exercises/writing.js',
  'js/services/grammar.js',
  'js/services/languagetool.js',
  'js/services/tts.js',
  'js/ui/ajustes.js',
  'js/ui/dom.js',
  'js/ui/escritura.js',
  'js/ui/ficha.js',
  'js/ui/fin.js',
  'js/ui/glosario.js',
  'js/ui/grupo.js',
  'js/ui/home.js',
  'js/ui/inputs.js',
  'js/ui/mapa.js',
  'js/ui/pruebas.js',
  'js/ui/tema.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'fonts/InstrumentSans-400.woff2',
  'fonts/InstrumentSans-500.woff2',
  'fonts/InstrumentSans-600.woff2',
  'fonts/InstrumentSerif-Regular.woff2',
  'fonts/OFL.txt',
  'data/curriculum.json',
  'data/lexicon.json',
  'data/lt-map.json',
  'data/templates.json',
  'data/levels/a1/unit-01.json',
];

self.addEventListener('install', e => {
  // cache: 'reload' saltea la caché HTTP (Pages manda max-age=600); si no, la versión nueva guardaría archivos viejos.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Cache-first para archivos propios; lo externo (LanguageTool, YouTube) va directo a la red.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
