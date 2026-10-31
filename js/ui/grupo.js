// Runner de un grupo (un escalón de un tema): arma o retoma el grupo, corre cada ejercicio, corrige, autoguarda,
// muestra el feedback (§5.6), el ⚑ y la escritura con LanguageTool; al terminar va a #/fin.
import { h, rich } from './dom.js';
import { answerInput } from './inputs.js';
import { renderFicha } from './ficha.js';
import { renderGlossary } from './glosario.js';
import { render as renderExercise } from '../exercises/index.js';
import { checkExercise } from '../core/checks/index.js';
import { gradeWriting } from '../core/checks/writing.js';
import { buildGroup, commitNext } from '../core/progress.js';
import { pickGlossary } from '../core/glossary.js';
import { reviewCandidates, itemInfo, exampleFor, curiosityFor, needsFicha, applyCommit, segments, closeSaved, recordAnswer } from '../core/runner.js';
import * as lt from '../services/languagetool.js';

const WRITING = new Set(['writing-guided', 'writing-free']);
const EMPTY_MASTERY = { tags: {}, pairs: {} };

export default async function grupo(el, { store, content, params }) {
  const C = await content();
  const topicId = params[0];
  const n = Number(params[1]);
  const unit = Object.values(C.units).find(u => u.topics.some(t => t.topic === topicId));
  const topic = unit?.topics.find(t => t.topic === topicId);
  const stepDef = topic?.steps?.find(s => s.n === n);
  if (!topic || topic.draft || !stepDef) {
    el.append(h('p', {}, 'Este escalón todavía no tiene contenido.'), h('a', { class: 'button secondary', href: '#/' }, 'Inicio'));
    return;
  }
  const titleOf = id => C.curriculum.topics.find(t => t.id === id)?.title ?? id;
  const defOf = id => Object.values(C.units).flatMap(u => u.topics).find(t => t.topic === id);

  let group = await store.get('group');
  if (!group || group.topic !== topicId || group.step !== n) {
    const now = Date.now();
    const [progress0, mastery0, words0, log0, quarantine] = await Promise.all(['progress', 'mastery', 'words', 'log', 'quarantine'].map(k => store.get(k)));
    let state = { progress: progress0 ?? { steps: {} }, mastery: mastery0 ?? EMPTY_MASTERY, words: words0 ?? {}, log: log0 ?? [] };
    // El grupo guardado de otro escalón no se pierde: se aplica lo respondido y se cierra (terminado o abandonado).
    if (group) state = closeSaved({ saved: group, state, quarantine: quarantine ?? [], now });
    const { progress, mastery, words } = state;
    const fresh = buildGroup(unit, topicId, n, progress, mastery, {
      now, rng: Math.random, templates: C.templates, lexicon: C.lexicon,
      otherExercises: reviewCandidates(C.units, topicId), curriculum: C.curriculum,
    });
    if (n === 3) {
      fresh.glossary = pickGlossary(C.lexicon, words, { field: stepDef.field, level: 'A1', hide: topic.hides ?? [], rng: Math.random });
    }
    await store.setMany(group ? { ...state, group: fresh } : { group: fresh });
    group = fresh;
  }

  const save = () => store.set('group', group);

  // Barra del grupo: ✕ (vuelve al inicio sin confirmar; el grupo queda guardado), título y, en el escalón 3, "Glosario".
  const glossaryBox = h('div', { class: 'card', hidden: true });
  if (group.glossary) renderGlossary(glossaryBox, group.glossary);
  const counter = h('span', { class: 'muted' });
  const bar = h('div', { class: 'group-bar' },
    h('a', { class: 'close', href: '#/', 'aria-label': 'Salir al inicio' }, '✕'),
    h('div', { class: 'group-title' }, h('strong', {}, `Escalón ${n} · ${stepDef.name}`), counter),
    group.glossary && h('button', { type: 'button', class: 'secondary small', onclick: () => { glossaryBox.hidden = !glossaryBox.hidden; } }, 'Glosario'),
  );
  const screen = h('div', { class: 'screen' });
  // Región viva: el resultado de cada ejercicio se anuncia sin releer toda la pantalla.
  const announcer = h('div', { class: 'sr-only', role: 'status' });
  el.append(bar, glossaryBox, screen, announcer);

  const show = (...nodes) => {
    screen.replaceChildren(...nodes.flat(Infinity).filter(Boolean));
    window.scrollTo(0, 0);
  };
  const ltClient = { check: text => lt.check(text) }; // con timeout: sin respuesta, la escritura queda pendiente
  const checkCtxFor = ex => ({ curriculum: C.curriculum, topicTitle: titleOf(ex.topic ?? topicId), ltMap: C.ltMap, lt: ltClient });

  async function commit() {
    const { group: g, toApply } = commitNext(group);
    const [mastery, log, words, progress, quarantine] = await Promise.all(['mastery', 'log', 'words', 'progress', 'quarantine'].map(k => store.get(k)));
    const out = applyCommit({
      group, toApply, now: Date.now(), quarantine: quarantine ?? [],
      state: { mastery: mastery ?? EMPTY_MASTERY, log: log ?? [], words: words ?? {}, progress: progress ?? { steps: {} } },
    });
    group = g;
    await store.setMany({ ...out, group });
  }

  async function next() {
    if (group.index > group.committed) await commit();
    if (group.index >= group.exercises.length) {
      location.hash = '#/fin';
      return;
    }
    if (group.glossary && !group.glossaryShown && group.index === 0) {
      const box = h('div', { class: 'card' }, h('h2', {}, 'Glosario'), h('p', { class: 'muted' }, 'Palabras para usar en este grupo. Después quedan en el botón "Glosario".'));
      renderGlossary(box, group.glossary);
      show(h('p', { class: 'scene' }, rich(stepDef.scene.context)), box, h('button', { type: 'button', onclick: async () => {
        group = { ...group, glossaryShown: true };
        await save();
        next();
      } }, 'Empezar'));
      return;
    }
    if (needsFicha(group, topic)) {
      show(h('div', { class: 'card' }, renderFicha(topic, titleOf(topicId))), h('button', { type: 'button', onclick: async () => {
        group = { ...group, fichaShown: true };
        await save();
        next();
      } }, 'Seguir'));
      return;
    }
    const ex = group.exercises[group.index];
    // Escritura enviada que no llegó a corregirse (se cerró la app durante "Corrigiendo…"): se reenvía.
    if (group.draft?.id === ex.id) {
      counter.textContent = `${group.index + 1} de ${group.exercises.length}`;
      show(h('p', {}, 'Corrigiendo tu texto…'));
      grade(ex, { text: group.draft.text }, group.draft.ms);
      return;
    }
    runExercise(ex);
  }

  // Corrige, guarda la respuesta (y la escritura pendiente en la cola) en una sola transacción y muestra el feedback.
  async function grade(ex, answer, ms) {
    const now = Date.now();
    const results = (await checkExercise(ex, answer, checkCtxFor(ex))).map(r => ({ ...r, ms, at: now }));
    const answered = recordAnswer(group, results);
    const entries = { group: answered };
    if (results.some(r => r.pending)) {
      const queue = (await store.get('ltQueue')) ?? [];
      entries.ltQueue = [...queue, { key: ex.id, topic: topicId, step: n, scene: stepDef.scene.title, text: answer.text, at: now }];
    }
    await store.setMany(entries);
    group = answered;
    feedback(ex, answer, results);
  }

  function runExercise(ex) {
    const shownAt = Date.now();
    counter.textContent = `${group.index + 1} de ${group.exercises.length}`;
    const body = h('div', { class: 'exercise' });
    const ctx = {
      curriculum: C.curriculum,
      // detective: con la regla elegida mal, la ficha aparece antes de aplicar (§5.5).
      beforeApply: async rule => {
        const [first] = await checkExercise(ex, { rule, apply: [] }, checkCtxFor(ex));
        if (!first.showFicha) return;
        group = { ...group, fichaShown: true };
        await new Promise(resolve => {
          const box = h('div', { class: 'card' }, renderFicha(topic, titleOf(topicId)),
            h('button', { type: 'button', onclick: () => { box.remove(); resolve(); } }, 'Seguir'));
          body.append(box);
          box.scrollIntoView({ block: 'start' });
        });
      },
    };
    const head = [
      ex.review && h('span', { class: 'pill small' }, 'Repaso'),
      group.index === 0 && n !== 3 && h('p', { class: 'scene' }, h('strong', {}, stepDef.scene.title), ' · ', rich(stepDef.scene.context)),
    ];
    show(head, body);
    renderExercise(ex, body, {
      ctx,
      submit: async answer => {
        const ms = Date.now() - shownAt;
        // El texto de una escritura se guarda antes de mandarlo a LanguageTool: si se cierra la app, se reenvía al volver.
        if (WRITING.has(ex.type)) {
          group = { ...group, draft: { id: ex.id, text: answer.text, ms } };
          await save();
        }
        await grade(ex, answer, ms);
      },
    });
  }

  function feedback(ex, answer, results) {
    announcer.textContent = WRITING.has(ex.type)
      ? (results[0].pending ? 'Sin conexión: se corrige después.' : results[0].ok ? 'Sin errores' : 'Con errores')
      : (results.every(r => r.ok) ? 'Bien' : 'Incorrecto');
    const nodes = WRITING.has(ex.type) ? writingFeedback(ex, answer, results[0]) : closedFeedback(ex, answer, results);
    const anyBad = results.some(r => !r.ok && !r.pending);
    const fichaDef = defOf(ex.topic ?? topicId);
    const fichaBox = h('div');
    const fichaBtn = anyBad && fichaDef?.ficha && h('button', { type: 'button', class: 'secondary', onclick: () => {
      if (fichaBox.firstChild) fichaBox.replaceChildren();
      else fichaBox.append(h('div', { class: 'card' }, renderFicha(fichaDef, titleOf(ex.topic ?? topicId))));
    } }, 'Ver ficha');
    const report = reportBox(ex, answer);
    // Siguiente se usa una vez y espera a que el ⚑ termine de guardar la cuarentena antes del commit (regla 4).
    const nextBtn = h('button', { type: 'button', onclick: async () => {
      if (nextBtn.disabled) return;
      nextBtn.disabled = true;
      try {
        await report.saving;
        await next();
      } catch {
        // Si el reporte o el commit fallan, Siguiente queda disponible para reintentar.
        nextBtn.disabled = false;
        announcer.textContent = 'No se pudo guardar. Probá de nuevo.';
      }
    } }, 'Siguiente');
    show(nodes, fichaBtn, fichaBox, report, nextBtn);
  }

  function closedFeedback(ex, answer, results) {
    const rng = Math.random;
    const allOk = results.every(r => r.ok);
    const multi = results.length > 1;
    const items = results.map(r => {
      const info = itemInfo(ex, r.key);
      const example = exampleFor(ex, r, { results, answer, curriculum: C.curriculum, rng });
      return h('div', { class: 'item' },
        multi && info.label && h('p', { class: 'item-label', lang: 'de' }, rich(info.label)),
        r.ok ? h('span', { class: 'tag-ok' }, 'Bien') : h('span', { class: 'tag-bad' }, 'Incorrecto'),
        !r.ok && r.rule && h('p', {}, rich(r.rule)),
        example && h('p', { class: 'example' }, 'Por ejemplo: ', h('em', { lang: 'de' }, example.de), ` (${example.es})`),
        r.notice && h('p', { class: 'muted' }, r.notice),
      );
    });
    const curiosity = curiosityFor(ex, results, C.curriculum, rng);
    return [
      ex.type === 'situation' && situationReplay(ex, answer, results),
      allOk && multi ? [h('span', { class: 'tag-ok' }, 'Bien'), results.filter(r => r.notice).map(r => h('p', { class: 'muted' }, r.notice))] : items,
      curiosity && h('p', { class: 'curiosity' }, rich(curiosity)),
    ];
  }

  // La situación con lo que escribió el usuario; los huecos fallados en rojo.
  function situationReplay(ex, answer, results) {
    let k = 0;
    return h('div', { class: 'chat' }, ex.bubbles.map(b => h('div', { class: `bubble ${b.who}`, lang: 'de' },
      String(b.text).split('___').flatMap((part, i) => {
        if (i === 0) return [part];
        const r = results[k];
        const text = answer[k++] || '…';
        return [h('span', { class: r?.ok ? 'gap' : 'gap bad' }, text), part];
      }))));
  }

  function marked(text, marks) {
    return h('p', { class: 'written', lang: 'de' }, segments(text, marks).map(s => (s.mark === null
      ? s.text
      : [h('span', { class: `mark ${marks[s.mark].kind}` }, s.text), h('sup', {}, String(s.mark + 1))])).flat());
  }
  const markList = marks => marks.length
    ? h('ol', { class: 'marks' }, marks.map(m => h('li', { class: m.kind === 'notice' ? 'muted' : null }, rich(m.text))))
    : h('p', { class: 'muted' }, 'LanguageTool no marcó nada. Ojo: no ve todo (sentido, estilo, alguna gramática).');

  function writingFeedback(ex, answer, r) {
    if (r.pending) {
      return [h('p', { class: 'notice' }, 'Sin conexión: la corregimos cuando vuelva la red.'), h('p', { class: 'muted' }, 'Tu texto quedó guardado. El grupo sigue.')];
    }
    const result = r.ok ? h('span', { class: 'tag-ok' }, 'Sin errores') : h('span', { class: 'tag-bad' }, 'Con errores');
    const rewrite = h('div');
    return [
      result,
      marked(answer.text, r.marks),
      markList(r.marks),
      ex.checklist?.length && [h('h2', {}, 'Lo que LanguageTool no ve'), h('ul', { class: 'checklist' }, ex.checklist.map(c => h('li', {}, h('label', {}, h('input', { type: 'checkbox' }), h('span', {}, rich(c))))))],
      ex.model && [h('h2', {}, 'Un modelo'), h('p', { class: 'model', lang: 'de' }, ex.model)],
      h('button', { type: 'button', class: 'secondary', onclick: e => { e.currentTarget.remove(); rewriteForm(rewrite, answer.text); } }, 'Reescribir'),
      rewrite,
    ];
  }

  // Reescribir es opcional: vuelve a corregir y muestra las marcas, pero no cambia el Result.
  function rewriteForm(box, text) {
    const input = answerInput({ multiline: true, label: 'Tu reescritura' });
    input.lang = 'de';
    input.querySelector('textarea').value = text;
    const out = h('div');
    const btn = h('button', { type: 'button', class: 'secondary', onclick: async () => {
      btn.disabled = true;
      try {
        const t = input.value();
        const { marks } = gradeWriting(await lt.check(t), C.ltMap);
        out.replaceChildren(marked(t, marks), markList(marks));
      } catch {
        out.replaceChildren(h('p', { class: 'muted' }, 'Sin conexión: no se pudo corregir la reescritura.'));
      }
      btn.disabled = false;
    } }, 'Corregir de nuevo');
    box.replaceChildren(input, btn, out);
  }

  // ⚑: nota opcional; guarda el reporte y pone el ejercicio en cuarentena antes del commit (regla 4).
  function reportBox(ex, answer) {
    const box = h('div', { class: 'report' });
    box.saving = Promise.resolve();
    const open = h('button', { type: 'button', class: 'secondary small', onclick: () => {
      const note = h('textarea', { 'aria-label': 'Nota (opcional)', placeholder: 'Nota (opcional)', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' });
      const send = h('button', { type: 'button', class: 'secondary', onclick: () => {
        if (send.disabled) return;
        send.disabled = true;
        box.saving = (async () => {
          const [reports, quarantine] = await Promise.all([store.get('reports'), store.get('quarantine')]);
          const q = quarantine ?? [];
          await store.setMany({
            reports: [...(reports ?? []), { exerciseId: ex.id, answer, note: note.value.trim(), at: Date.now() }],
            quarantine: q.includes(ex.id) ? q : [...q, ex.id],
          });
          box.replaceChildren(h('p', { class: 'muted' }, 'Gracias: quedó reportado y este ejercicio no cuenta para tu progreso hasta revisarlo.'));
        })();
        box.saving.catch(() => {
          send.disabled = false;
          announcer.textContent = 'No se pudo guardar el reporte. Tocá Enviar reporte de nuevo.';
        });
      } }, 'Enviar reporte');
      box.replaceChildren(h('div', { class: 'answer' }, note), send);
      note.focus();
    } }, '⚑ Creo que esto está mal');
    box.append(open);
    return box;
  }

  next();
}
