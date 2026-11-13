import { h } from './dom.js';

// En iOS el menú Compartir es la forma fiable de guardar un archivo; en otros navegadores, descarga directa.
async function saveFile(name, text) {
  const file = new File([text], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default async function ajustes(el, { store }) {
  const meta = await store.get('meta');
  const status = h('p', { class: 'status', role: 'status' });
  const last = meta?.lastBackupAt ? new Date(meta.lastBackupAt).toLocaleString('es-AR') : 'nunca';

  const exportar = async () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      await saveFile(`aleman-backup-${date}.json`, await store.exportAll());
      await store.markBackup();
      status.className = 'status ok';
      status.textContent = 'Backup exportado.';
    } catch (e) {
      status.className = 'status bad';
      status.textContent = e.name === 'AbortError' ? 'Exportación cancelada.' : `No se pudo exportar: ${e.message}`;
    }
  };

  const importar = async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Importar reemplaza todo el progreso actual por el del backup. ¿Seguir?')) {
      e.target.value = '';
      return;
    }
    try {
      await store.importAll(await file.text());
      status.className = 'status ok';
      status.textContent = 'Backup importado.';
    } catch (err) {
      status.className = 'status bad';
      status.textContent = err.message;
    }
    e.target.value = '';
  };

  const settings = (await store.get('settings')) ?? {};
  const name = h('input', { id: 'name', type: 'text', value: settings.name ?? '', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false',
    onchange: async e => store.set('settings', { ...((await store.get('settings')) ?? {}), name: e.target.value.trim() }) });

  const grammarToken = h('input', {
    id: 'grammar-token',
    type: 'password',
    value: settings.grammarToken ?? '',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    placeholder: 'Opcional (APP_TOKEN del Worker)',
    onchange: async e => store.set('settings', { ...((await store.get('settings')) ?? {}), grammarToken: e.target.value.trim() }),
  });

  const customWordsArea = h('textarea', {
    id: 'custom-words',
    rows: 4,
    autocomplete: 'off',
    autocapitalize: 'words',
    spellcheck: 'false',
    placeholder: 'Ej: Córdoba, Matías, La Plata',
    onchange: async e => {
      const words = e.target.value
        .split(/[\n,]+/)
        .map(w => w.trim())
        .filter(Boolean);
      const curr = (await store.get('settings')) ?? {};
      await store.set('settings', { ...curr, customWords: words });
    },
  });
  customWordsArea.value = (settings.customWords ?? []).join('\n');

  const exportarReportes = async () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      await saveFile(`aleman-reportes-${date}.json`, JSON.stringify({ reports: (await store.get('reports')) ?? [] }, null, 2));
      status.className = 'status ok';
      status.textContent = 'Reportes exportados.';
    } catch (e) {
      status.className = 'status bad';
      status.textContent = e.name === 'AbortError' ? 'Exportación cancelada.' : `No se pudo exportar: ${e.message}`;
    }
  };

  el.append(
    h('h1', {}, 'Ajustes'),
    h('div', { class: 'card' },
      h('label', { for: 'name' }, 'Tu nombre'),
      name,
    ),
    h('div', { class: 'card' },
      h('h2', {}, 'Palabras aceptadas'),
      h('p', { class: 'muted' }, 'Nombres propios, lugares o palabras que el corrector no debe marcar como error de ortografía (separadas por coma o renglón). Se suman a los nombres y lugares del curso sin distinguir mayúsculas ni tildes.'),
      h('label', { for: 'custom-words' }, 'Tus palabras y nombres:'),
      customWordsArea,
    ),
    h('div', { class: 'card' },
      h('h2', {}, 'Corrector de gramática (IA)'),
      h('p', { class: 'muted' }, 'Clave personal para usar tu Worker con Claude/Gemini. Si queda vacía, la app corrige gratis solo con LanguageTool.'),
      h('label', { for: 'grammar-token' }, 'Clave del Worker (APP_TOKEN):'),
      grammarToken,
    ),
    h('div', { class: 'card' },
      h('h2', {}, 'Backup'),
      h('p', { class: 'muted' }, `Último backup: ${last}. El progreso vive solo en este dispositivo.`),
      h('button', { onclick: exportar }, 'Exportar backup'),
      h('label', { for: 'import' }, 'Importar backup (.json):'),
      h('input', { id: 'import', type: 'file', accept: 'application/json,.json', onchange: importar }),
      status,
    ),
    h('div', { class: 'card' },
      h('h2', {}, 'Reportes'),
      h('p', { class: 'muted' }, 'Los ejercicios que marcaste con ⚑. El archivo no incluye tu progreso.'),
      h('button', { onclick: exportarReportes }, 'Exportar reportes ⚑'),
    ),
    h('a', { class: 'button secondary', href: '#/pruebas' }, 'Pruebas del iPhone'),
    h('p', { class: 'muted' }, 'Pictogramas: ', h('a', { href: 'https://openmoji.org', target: '_blank', rel: 'noopener' }, 'OpenMoji'), ' (CC BY-SA 4.0)'),
  );
}
