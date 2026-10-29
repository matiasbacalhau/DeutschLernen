// Pruebas de la iteración 0 en el iPhone: instalación, almacenamiento, offline, voz alemana y LanguageTool.
import { h, isStandalone } from './dom.js';
import * as tts from '../services/tts.js';
import * as lt from '../services/languagetool.js';

function row(title, help) {
  const status = h('span', { class: 'status' }, '…');
  const card = h('div', { class: 'card' }, h('h2', {}, title, ': ', status), help && h('p', { class: 'muted' }, help));
  const set = (ok, text) => {
    status.className = `status ${ok ? 'ok' : 'bad'}`;
    status.textContent = text;
  };
  return { card, set };
}

export default async function pruebas(el, { store }) {
  el.append(h('h1', {}, 'Pruebas del iPhone'));

  const install = row('App instalada', 'Abrila desde el ícono de la pantalla de inicio, no desde Safari.');
  install.set(isStandalone(), isStandalone() ? 'sí' : 'no (abierta en el navegador)');

  const persist = row('Almacenamiento persistente', 'Si dice "no", el backup semanal es la protección.');
  const persisted = (await navigator.storage?.persisted?.()) ?? false;
  persist.set(persisted, persisted ? 'sí' : 'no');

  const idb = row('Base de datos local');
  try {
    const probe = Date.now();
    await store.set('probe', probe);
    const ok = (await store.get('probe')) === probe;
    idb.set(ok, ok ? 'funciona' : 'no devuelve lo guardado');
  } catch (e) {
    idb.set(false, e.message);
  }

  const offline = row('Modo avión', 'Con "lista", activá el modo avión y volvé a abrir la app.');
  const cached = 'caches' in window && (await caches.match('index.html'));
  const ready = Boolean(navigator.serviceWorker?.controller && cached);
  offline.set(ready, ready ? 'lista' : 'todavía no (recargá una vez)');

  const voice = row('Voz alemana', 'Para una voz mejor: Ajustes → Accesibilidad → Contenido leído → Voces → Alemán, y descargá una voz "mejorada".');
  const voiceList = h('p', { class: 'muted' });
  let voices = [];
  voice.card.append(
    voiceList,
    h('button', {
      onclick: async () => {
        try {
          await tts.speak('Guten Tag! Ich lerne Deutsch.', { rate: 0.9, voice: voices[0] });
          voice.set(true, 'suena');
        } catch (e) {
          voice.set(false, `error: ${e.message}`);
        }
      },
    }, 'Escuchar'),
  );
  if (tts.supported()) {
    voices = await tts.germanVoices();
    voice.set(voices.length > 0, voices.length ? `${voices.length} voz/voces` : 'no hay voces alemanas');
    voiceList.textContent = voices.map(v => `${v.name} (${v.lang})`).join(', ');
  } else {
    voice.set(false, 'este navegador no tiene síntesis de voz');
  }

  const ltRow = row('LanguageTool', 'Envía una frase de prueba con un error a los servidores de LanguageTool.');
  ltRow.card.append(h('button', {
    onclick: async () => {
      try {
        const matches = await lt.check('Ich habe ein Fehler gemacht.');
        ltRow.set(matches.length > 0, matches.length ? `responde (${matches.length} error detectado)` : 'responde, pero no detectó el error');
      } catch (e) {
        ltRow.set(false, `bloqueado o sin red: ${e.message}`);
      }
    },
  }, 'Probar LanguageTool'));

  el.append(install.card, persist.card, idb.card, offline.card, voice.card, ltRow.card);
}
