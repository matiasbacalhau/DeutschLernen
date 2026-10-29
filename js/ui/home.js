import { h, isStandalone } from './dom.js';
import { needsBackupReminder } from '../core/backup.js';

export default async function home(el, { store }) {
  const meta = await store.get('meta');
  el.append(...[
    h('h1', {}, 'Alemán A1 → C1'),
    needsBackupReminder(meta, Date.now()) &&
      h('div', { class: 'notice' }, 'Pasaron 7 días o más sin backup. ', h('a', { href: '#/ajustes' }, 'Exportá uno ahora.')),
    !isStandalone() && h('div', { class: 'card' },
      h('h2', {}, 'Instalar en el iPhone'),
      h('p', {}, 'En Safari: botón Compartir → "Agregar a pantalla de inicio". Así se abre a pantalla completa, funciona sin conexión y el progreso queda más protegido.'),
    ),
    h('div', { class: 'card' },
      h('p', {}, 'Iteración 0: esqueleto de la app. La práctica llega en la iteración 1.'),
      h('a', { class: 'button', href: '#/pruebas' }, 'Pruebas del iPhone'),
      h('a', { class: 'button secondary', href: '#/ajustes' }, 'Ajustes y backup'),
    ),
  ].filter(Boolean));
}
