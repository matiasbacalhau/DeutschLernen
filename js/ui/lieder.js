// Vista de canciones (#/lieder y #/lieder/:id): reproductor híbrido en IndexedDB aparte (aleman-media),
// Hören (huecos), Lesen & Grammatik (con acordeón en español) y Wortschatz → SRS.
import { h } from './dom.js';
import { resolveLoopRange, splitGapLine, checkGapLine } from '../core/lieder.js';
import { saveTrack, getTrack, deleteTrack, listTrackIds } from '../core/media.js';
import { addWords } from '../core/srs.js';

const fmtTime = sec => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default async function lieder(el, { store, content, params }) {
  const C = await content();
  const songs = C.lieder ?? [];
  if (params[0]) {
    const song = songs.find(s => s.id === params[0]);
    if (!song) {
      el.append(h('p', {}, 'Lied nicht gefunden.'), h('a', { class: 'button secondary', href: '#/lieder' }, 'Zurück'));
      return;
    }
    await renderSong(el, song, { store, lexicon: C.lexicon });
    return;
  }

  let readyIds = new Set();
  try { readyIds = await listTrackIds(); } catch { /* sin IndexedDB en test */ }

  el.append(
    h('div', { class: 'group-bar' },
      h('a', { class: 'close', href: '#/', 'aria-label': 'Start' }, '✕'),
      h('div', { class: 'group-title' }, h('strong', {}, 'Lieder'), h('span', { class: 'muted' }, 'Hören · Lesen · Wortschatz')),
    ),
    h('p', { class: 'muted' }, 'Cargá tu archivo local (.m4a, .mp3 o .flac) en cada canción. Queda guardado solo en este dispositivo (fuera de tus backups).'),
    ...songs.map(s => {
      const hasAudio = readyIds.has(s.id);
      return h('a', { class: 'card lied-card', href: `#/lieder/${encodeURIComponent(s.id)}` },
        h('div', { class: 'lied-row' },
          h('strong', {}, `${s.title} · ${s.artist}`),
          h('span', { class: hasAudio ? 'tag-ok' : 'pill small' }, hasAudio ? 'Audio bereit' : s.level),
        ),
        h('span', { class: 'muted' }, `${s.level} · ${s.words.length} Wörter`),
      );
    }),
    h('a', { class: 'button secondary', href: '#/' }, 'Zurück'),
  );
}

async function renderSong(el, song, { store, lexicon }) {
  let track = null;
  try { track = await getTrack(song.id); } catch { /* sin IndexedDB */ }

  const audio = new Audio();
  audio.preload = 'metadata';
  let objectUrl = null;
  let loopOn = true;
  let slow = false;
  let range = resolveLoopRange(0, song.loop);

  const cleanup = () => {
    audio.pause();
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    window.removeEventListener('hashchange', cleanup);
  };
  window.addEventListener('hashchange', cleanup);

  const statusLine = h('p', { class: 'muted lied-status' }, '');
  const playBtn = h('button', { type: 'button', class: 'small', disabled: !track, onclick: () => {
    if (!audio.src) return;
    if (audio.paused) {
      if (loopOn && (audio.currentTime < range.start || audio.currentTime >= range.end)) audio.currentTime = range.start;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  } }, 'Play');
  const backBtn = h('button', { type: 'button', class: 'secondary small', disabled: !track, onclick: () => {
    if (!audio.src) return;
    audio.currentTime = Math.max(loopOn ? range.start : 0, audio.currentTime - 5);
  } }, '↺ -5s');
  const speedBtn = h('button', { type: 'button', class: 'secondary small', disabled: !track, onclick: () => {
    slow = !slow;
    audio.playbackRate = slow ? 0.85 : 1;
    speedBtn.textContent = slow ? '0.85×' : '1×';
  } }, '1×');
  const loopBtn = h('button', { type: 'button', class: 'secondary small', disabled: !track, 'aria-pressed': 'true', onclick: () => {
    loopOn = !loopOn;
    loopBtn.setAttribute('aria-pressed', String(loopOn));
    loopBtn.textContent = loopOn ? 'Loop: An' : 'Loop: Aus';
  } }, 'Loop: An');
  const delBtn = h('button', { type: 'button', class: 'secondary small', hidden: !track, onclick: async () => {
    audio.pause();
    audio.removeAttribute('src');
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    await deleteTrack(song.id);
    track = null;
    syncControls();
  } }, 'Audio löschen');

  const syncControls = () => {
    const has = !!track;
    playBtn.disabled = !has;
    backBtn.disabled = !has;
    speedBtn.disabled = !has;
    loopBtn.disabled = !has;
    delBtn.hidden = !has;
    if (!has) {
      statusLine.textContent = 'Sin audio cargado. Elegí el archivo desde tu teléfono.';
    } else {
      const modeLabel = range.mode === 'clip'
        ? `Recorte (${fmtTime(range.end)}) · bucle completo`
        : `Canción (${fmtTime(audio.duration)}) · bucle ${fmtTime(range.start)}–${fmtTime(range.end)}`;
      statusLine.textContent = `${track.name} · ${modeLabel}`;
    }
  };

  const attachBlob = rec => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(rec.blob);
    audio.src = objectUrl;
    audio.playbackRate = slow ? 0.85 : 1;
  };

  audio.addEventListener('play', () => { playBtn.textContent = 'Pause'; });
  audio.addEventListener('pause', () => { playBtn.textContent = 'Play'; });
  audio.addEventListener('loadedmetadata', () => {
    range = resolveLoopRange(audio.duration, song.loop);
    if (loopOn && range.start > 0) audio.currentTime = range.start;
    syncControls();
  });
  audio.addEventListener('timeupdate', () => {
    if (loopOn && range.end > range.start && audio.currentTime >= range.end) {
      audio.currentTime = range.start;
    }
  });

  if (track) attachBlob(track);
  syncControls();

  const fileInput = h('input', {
    type: 'file',
    accept: 'audio/*,.flac,.m4a,.mp3',
    onchange: async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      track = await saveTrack(song.id, file);
      attachBlob(track);
      syncControls();
      e.target.value = '';
    },
  });

  const playerBar = h('div', { class: 'card lied-player' },
    h('div', { class: 'lied-controls' }, playBtn, backBtn, speedBtn, loopBtn, delBtn),
    statusLine,
    h('label', { class: 'muted' }, 'Audio laden (.m4a, .mp3, .flac):', fileInput),
  );

  // Paso 1: Hören (huecos)
  const lineRefs = song.hoeren.lines.map(line => {
    const { parts } = splitGapLine(line.text);
    const inputs = [];
    const row = h('p', { class: 'lied-line', lang: 'de' },
      ...parts.flatMap((part, i) => {
        if (i === parts.length - 1) return [part];
        const inp = h('input', {
          type: 'text',
          class: 'lied-gap',
          autocapitalize: 'off',
          autocorrect: 'off',
          spellcheck: 'false',
          'aria-label': `Lücke ${i + 1}`,
        });
        inputs.push(inp);
        return [part, inp];
      }),
    );
    const mark = h('span', { class: 'lied-mark' });
    return { line, inputs, row, mark };
  });
  const hoerenOut = h('p', { class: 'status', role: 'status' });
  const hoerenBox = h('div', { class: 'card' },
    h('h2', {}, '1 · Hören'),
    h('p', { class: 'muted' }, song.hoeren.prompt),
    ...lineRefs.map(r => h('div', { class: 'lied-verse' }, r.row, r.mark)),
    h('button', { type: 'button', onclick: () => {
      let okCount = 0;
      for (const r of lineRefs) {
        const res = checkGapLine(r.inputs.map(inp => inp.value), r.line);
        if (res.ok) okCount++;
        r.inputs.forEach((inp, i) => {
          inp.classList.toggle('good', res.results[i]);
          inp.classList.toggle('bad', !res.results[i]);
        });
        r.mark.className = res.ok ? 'tag-ok' : 'tag-bad';
        r.mark.textContent = res.ok ? 'Richtig' : 'Falsch';
      }
      hoerenOut.className = okCount === lineRefs.length ? 'status ok' : 'status bad';
      hoerenOut.textContent = `${okCount} / ${lineRefs.length} richtig`;
    } }, 'Prüfen'),
    hoerenOut,
  );

  // Paso 2: Lesen & Grammatik
  const lesenBox = h('div', { class: 'card' },
    h('h2', {}, '2 · Lesen & Grammatik'),
    ...song.lesen.map((q, qi) => {
      const fb = h('div', { hidden: true });
      const opts = q.options.map((opt, oi) => h('button', {
        type: 'button',
        class: 'secondary option',
        onclick: () => {
          const ok = oi === q.answer;
          opts.forEach((b, bi) => b.setAttribute('aria-pressed', String(bi === oi)));
          fb.hidden = false;
          fb.replaceChildren(
            h('span', { class: ok ? 'tag-ok' : 'tag-bad' }, ok ? 'Richtig' : 'Falsch'),
            h('p', { class: 'rule-primary', lang: 'de' }, q.rule_de),
            h('details', { class: 'rule-accordion' },
              h('summary', { lang: 'de' }, 'Erklärung auf Spanisch anzeigen'),
              h('p', { class: 'rule-detailed', lang: 'es' }, q.rule),
            ),
          );
        },
      }, opt));
      return h('div', { class: 'item' },
        h('p', { class: 'item-label', lang: 'de' }, `${qi + 1}. ${q.prompt}`),
        ...opts,
        fb,
      );
    }),
  );

  // Paso 3: Wortschatz → SRS
  const srsCurrent = (await store.get('srs')) ?? {};
  const byLemma = new Map(lexicon.map(w => [w.lemma, w]));
  const checks = song.words.map(lemma => {
    const w = byLemma.get(lemma);
    const inSrs = !!srsCurrent[lemma];
    const cb = h('input', { type: 'checkbox', checked: !inSrs, disabled: inSrs });
    return {
      lemma,
      cb,
      row: h('label', {},
        cb,
        h('span', {},
          h('strong', { lang: 'de' }, w?.article ? `${w.article} ${lemma}` : lemma),
          w?.es ? ` · ${w.es}` : '',
          inSrs ? ' (ya en SRS)' : '',
        ),
      ),
    };
  });
  const srsStatus = h('p', { class: 'status', role: 'status' });
  const wortschatzBox = h('div', { class: 'card' },
    h('h2', {}, '3 · Wortschatz → SRS'),
    h('p', { class: 'muted' }, 'Elegí las palabras de esta canción para sumarlas a tu repaso diario.'),
    h('ul', { class: 'checklist' }, ...checks.map(c => h('li', {}, c.row))),
    h('button', { type: 'button', class: 'secondary', onclick: async () => {
      const selected = checks.filter(c => c.cb.checked && !c.cb.disabled).map(c => c.lemma);
      if (!selected.length) {
        srsStatus.className = 'status';
        srsStatus.textContent = 'No hay palabras nuevas seleccionadas.';
        return;
      }
      await store.update(['srs'], v => ({ srs: addWords(v.srs ?? {}, selected, Date.now()) }));
      checks.forEach(c => { if (selected.includes(c.lemma)) c.cb.disabled = true; });
      srsStatus.className = 'status ok';
      srsStatus.textContent = `${selected.length} palabra(s) sumadas a tu SRS.`;
    } }, 'Zur Wiederholung hinzufügen (SRS)'),
    srsStatus,
  );

  el.append(
    h('div', { class: 'group-bar' },
      h('a', { class: 'close', href: '#/lieder', 'aria-label': 'Zurück' }, '✕'),
      h('div', { class: 'group-title' }, h('strong', {}, `${song.title} · ${song.artist}`), h('span', { class: 'muted' }, song.level)),
    ),
    playerBar,
    hoerenBox,
    lesenBox,
    wortschatzBox,
    h('a', { class: 'button secondary', href: '#/lieder' }, 'Zurück'),
  );
}
