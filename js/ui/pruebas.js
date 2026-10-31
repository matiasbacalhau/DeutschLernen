// Pruebas de la iteración 0 en el iPhone: instalación, almacenamiento, offline, voz alemana y LanguageTool.
// La lógica de cada prueba está en core/checks.js; acá solo se arman las tarjetas.
import { h, isStandalone } from './dom.js';
import * as tts from '../services/tts.js';
import * as lt from '../services/languagetool.js';
import { installCheck, persistCheck, dbCheck, offlineCheck, voicesCheck, speakCheck, ltCheck } from '../core/checks.js';

function row(title, help) {
  const status = h('span', { class: 'status' }, '…');
  const card = h('div', { class: 'card' }, h('h2', {}, title, ': ', status), help && h('p', { class: 'muted' }, help));
  const set = ({ ok, text }) => {
    status.className = `status ${ok ? 'ok' : 'bad'}`;
    status.textContent = text;
  };
  return { card, set };
}

async function voiceCard() {
  const voice = row('Voz alemana', 'Para una voz mejor: en Ajustes buscá "Voces" (Accesibilidad → Leer y hablar → Voces → Alemán) y descargá una voz "mejorada". Probá primero con la predeterminada y después cada voz de la lista.');
  // iOS lista voces que no están descargadas: forzar una de esas da "synthesis-failed".
  const voiceSelect = h('select', {}, h('option', { value: '' }, 'Predeterminada del sistema'));
  const voices = tts.supported() ? await tts.germanVoices() : [];
  voice.set(voicesCheck(tts.supported(), voices));
  voiceSelect.append(...voices.map((v, i) => h('option', { value: i }, `${v.name} (${v.lang})`)));
  voice.card.append(
    voiceSelect,
    h('button', { onclick: async () => voice.set(await speakCheck(tts.speak, voices[voiceSelect.value])) }, 'Escuchar'),
  );
  return voice.card;
}

function ltCard() {
  const ltRow = row('LanguageTool', 'Envía una frase de prueba con un error a los servidores de LanguageTool.');
  ltRow.card.append(h('button', { onclick: async () => ltRow.set(await ltCheck(lt.check)) }, 'Probar LanguageTool'));
  return ltRow.card;
}

export default async function pruebas(el, { store }) {
  el.append(h('h1', {}, 'Pruebas del iPhone'));

  const install = row('App instalada', 'Abrila desde el ícono de la pantalla de inicio, no desde Safari.');
  install.set(installCheck(isStandalone()));

  const persist = row('Almacenamiento persistente', 'Si dice "no", el backup semanal es la protección.');
  persist.set(await persistCheck(navigator.storage));

  const idb = row('Base de datos local');
  idb.set(await dbCheck(store, Date.now()));

  const offline = row('Modo avión', 'Con "lista", activá el modo avión y volvé a abrir la app.');
  const cached = 'caches' in window && (await caches.match('index.html'));
  offline.set(offlineCheck(navigator.serviceWorker?.controller, cached));

  el.append(install.card, persist.card, idb.card, offline.card, await voiceCard(), ltCard());
}
