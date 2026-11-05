// Runner de un grupo (un escalón de un tema): arma o retoma el grupo, corre cada ejercicio, corrige, autoguarda,
// muestra el feedback (§5.6), el ⚑ y la escritura con LanguageTool; al terminar va a #/fin.
import { h, rich } from './dom.js';
import { answerInput, listenButton } from './inputs.js';
import { renderFicha } from './ficha.js';
import { renderGlossary } from './glosario.js';
import { render as renderExercise } from '../exercises/index.js';
import { checkExercise } from '../core/checks/index.js';
import { EVALUATED_OK } from '../core/checks/common.js';
import { gradeWriting } from '../core/checks/writing.js';
import { buildGroup, commitNext } from '../core/progress.js';
import { pickGlossary } from '../core/glossary.js';
import { reviewCandidates, itemInfo, exampleFor, curiosityFor, needsFicha, applyCommit, closeSaved, recordAnswer, carryResolved, segments, stopwatch } from '../core/runner.js';
import { marked, markList, verdict, extras } from './escritura.js';
import { addWords } from '../core/srs.js';
import * as lt from '../services/languagetool.js';
import { withGrammar } from '../services/grammar.js';

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
    const candidates = reviewCandidates(C.units, topicId);
    // En una transacción: la cola de LanguageTool no puede resolver nada en el grupo guardado mientras se cierra.
    ({ group } = await store.update(['group', 'progress', 'mastery', 'words', 'log', 'quarantine', 'srs'], v => {
      let state = { progress: v.progress ?? { steps: {} }, mastery: v.mastery ?? EMPTY_MASTERY, words: v.words ?? {}, log: v.log ?? [], srs: v.srs ?? {} };
      // El grupo guardado de otro escalón no se pierde: se aplica lo respondido y se cierra (terminado o abandonado).
      if (v.group) state = closeSaved({ saved: v.group, state, quarantine: v.quarantine ?? [], now });
      const { progress, mastery, words } = state;
      const fresh = buildGroup(unit, topicId, n, progress, mastery, {
        now, rng: Math.random, templates: C.templates, lexicon: C.lexicon, otherExercises: candidates, curriculum: C.curriculum,
      });
      if (n === 3) {
        fresh.glossary = pickGlossary(C.lexicon, words, { field: stepDef.field, level: 'A1', hide: topic.hides ?? [], rng: Math.random });
      }
      // Las palabras del glosario entran a la SRS en nivel 1 (spec §5.1); las que ya están no se tocan.
      const srs = fresh.glossary ? addWords(state.srs, fresh.glossary.map(w => w.lemma), now) : undefined;
      return { ...(v.group ? state : {}), group: fresh, ...(srs && { srs }) };
    }));
  }

  // Todo guardado del grupo conserva las escrituras que la cola resolvió en el store mientras tanto (carryResolved).
  const save = async () => {
    ({ group } = await store.update(['group'], v => ({ group: carryResolved(group, v.group) })));
  };

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
  // LanguageTool más el corrector de gramática, los dos con timeout: sin respuesta, la escritura queda pendiente.
  const correct = withGrammar(text => lt.check(text));
  const ltClient = { check: correct };
  const checkCtxFor = () => ({ curriculum: C.curriculum, ltMap: C.ltMap, lexicon: C.lexicon, lt: ltClient });

  async function commit() {
    const { group: g, toApply } = commitNext(group);
    const now = Date.now();
    // El grupo en memoria avanza solo si el guardado salió bien: si falla, reintentar Siguiente vuelve a aplicar este commit.
    ({ group } = await store.update(['mastery', 'log', 'words', 'progress', 'quarantine', 'group', 'srs'], v => ({
      ...applyCommit({
        group, toApply, now, quarantine: v.quarantine ?? [],
        state: { mastery: v.mastery ?? EMPTY_MASTERY, log: v.log ?? [], words: v.words ?? {}, progress: v.progress ?? { steps: {} }, srs: v.srs ?? {} },
      }),
      group: carryResolved(g, v.group),
    })));
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
    if (group.draft?.id === ex.id && group.draft.text != null) {
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
    ({ group } = await store.update(['group', 'ltQueue'], v => {
      // Una vista vieja (✕ durante "Corrigiendo…" y Seguir) ya respondió este ejercicio: no se responde dos veces.
      if (v.group?.id === answered.id && v.group.results.some(r => String(r.key).split('#')[0] === ex.id)) return { group: v.group };
      const entries = { group: carryResolved(answered, v.group) };
      if (results.some(r => r.pending)) {
        entries.ltQueue = [...(v.ltQueue ?? []), {
          key: ex.id, group: answered.id, type: ex.type, ms, topic: topicId, step: n, scene: stepDef.scene.title, text: answer.text, at: now,
        }];
      }
      return entries;
    }));
    feedback(ex, answer, results);
  }

  function runExercise(ex) {
    const watch = stopwatch(Date.now());
    const onVisibility = () => (document.hidden ? watch.pause(Date.now()) : watch.resume(Date.now()));
    document.addEventListener('visibilitychange', onVisibility);
    counter.textContent = `${group.index + 1} de ${group.exercises.length}`;
    const body = h('div', { class: 'exercise' });
    const ctx = {
      curriculum: C.curriculum,
      // detective: la regla elegida se guarda antes de seguir (al retomar no se puede volver a elegir: nunca un reintento).
      rule: group.draft?.id === ex.id ? group.draft.rule : undefined,
      // Con la regla elegida mal, la ficha aparece antes de aplicar (§5.5).
      beforeApply: async rule => {
        const [first] = await checkExercise(ex, { rule, apply: [] }, checkCtxFor(ex));
        group = { ...group, draft: { id: ex.id, rule }, ...(first.showFicha ? { fichaShown: true } : {}) };
        await save();
        if (!first.showFicha) return;
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
        const ms = watch.elapsed(Date.now());
        document.removeEventListener('visibilitychange', onVisibility);
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
        // Lo que escribió el usuario: la frase con lo que difiere subrayado, o la palabra suelta (la situación ya la muestra).
        r.wrong ? underlined(r.given, r.wrong, r.rule !== EVALUATED_OK)
          : !r.ok && r.given && ex.type !== 'situation' && h('p', { class: 'muted' }, 'Escribiste: ', h('em', { lang: 'de' }, r.given)),
        !r.ok && r.rule && h('p', {}, rich(r.rule)),
        example && h('p', { class: 'example' }, 'Por ejemplo: ', h('em', { lang: 'de' }, example.de), ` (${example.es}) `, listenButton(example.de)),
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

  // La frase del usuario con las palabras que no coinciden con ninguna respuesta válida, subrayadas sin corregirlas.
  // hint: false cuando la regla ya habla de lo subrayado.
  function underlined(text, wrong, hint) {
    return [
      h('p', { class: 'written', lang: 'de' }, segments(text, wrong).map(x => (x.mark === null ? x.text : h('span', { class: 'mark error' }, x.text)))),
      hint && h('p', { class: 'muted' }, wrong.length > 1 ? 'Revisá las palabras subrayadas.' : 'Revisá la palabra subrayada.'),
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

  function writingFeedback(ex, answer, r) {
    if (r.pending) {
      return [h('p', { class: 'notice' }, 'Sin conexión: la corregimos cuando vuelva la red.'), h('p', { class: 'muted' }, 'Tu texto quedó guardado. El grupo sigue.')];
    }
    const rewrite = h('div');
    return [
      verdict(r.ok),
      marked(answer.text, r.marks),
      markList(r.marks),
      extras(ex),
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
        const { marks } = gradeWriting(await correct(t), C.ltMap);
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
          box.replaceChildren(h('p', { class: 'muted' }, 'Gracias: quedó reportado y este ejercicio no cuenta para tu mastery hasta revisarlo.'));
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
