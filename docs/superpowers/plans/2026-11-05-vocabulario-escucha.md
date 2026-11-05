# Iteración 2 (vocabulario + escucha) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Las palabras del glosario vuelven dentro de los grupos con una SRS por palabra (escalera de 3 niveles, leer y escuchar), con imagen y audio, y hay dictado y situaciones en modo escucha que nunca penalizan si no se puede escuchar.

**Architecture:**
- La lógica nueva es pura y va en `js/core/` con TDD (`node --test`): `srs.js` (FSRS + escalera), `cards.js` (qué tarjetas entran a un grupo y cómo se arman), `dictation.js` (frases para dictar) y `extras.js` (agrega tarjetas y el lugar de escucha a un grupo ya armado por `buildGroup`).
- Dos tipos de ejercicio nuevos con su check y su UI, como los existentes: `card` (niveles 1 y 2) y `dictation`. El nivel 3 leyendo es un `gap` generado y el nivel 3 escuchando es un `dictation`; los dos llevan `vocab: {lemma, rung, mode}`.
- La SRS se actualiza en `applyCommit`, en la misma transacción que el mastery y el log.

**Tech Stack:** el mismo de la iteración 1 (HTML, CSS y JS con módulos ES, sin build; Python 3 con PyYAML para las herramientas) más ts-fsrs vendorizado y SVG de OpenMoji.

**Spec:** `docs/superpowers/specs/2026-11-04-vocabulario-escucha-design.md` (de acá en adelante "spec"). También rigen `docs/PLAN.md` §7 ("regla N") y el diseño de la iteración 1.

## Global Constraints

- Sin build y sin dependencias en runtime salvo ts-fsrs, vendorizado en `js/vendor/` con su LICENSE (regla 16).
- UI en español rioplatense con voseo. Todo input de respuesta con `autocapitalize="off" autocorrect="off" spellcheck="false"` (usar `answerInput`).
- Regla 1: ninguna tarjeta, imagen, glosario ni audio revela lo que evalúa otro ítem del mismo grupo.
- Reglas 2 y 3: en ítems cerrados nunca la solución ni reintento; el dictado sí muestra el original después de responder (tarea abierta).
- "Ahora no puedo escuchar" no toca puntaje, mastery ni SRS (spec §6.3).
- Voz: `speak()` de `js/services/tts.js` sin pasar `voice` (forzar una voz falla en iOS). Dictado a `rate: 0.8`, con opción `1`.
- Escalera (spec §4): `PROMOTE_DAYS = {1: 4, 2: 10}`; acierto → `Rating.Good`, error → `Rating.Again` y baja un nivel (mínimo 1); retención pedida 0.9.
- Máximo 3 tarjetas por grupo, solo vencidas, en los escalones 1 a 4; 1 ítem de escucha por grupo en los escalones 2 a 4; ninguno en el 5.
- Tarjetas y dictados llevan `review: true`: no cuentan para el 80 % del escalón (`scoreGroup` ya excluye `review`).
- RNG y reloj inyectables en todo lo nuevo de `js/core/` (regla 9).
- `tools/check.sh` en verde al final de cada tarea (con el LanguageTool local levantado).
- Cada archivo nuevo de la app entra en `SHELL` de `sw.js` (`tests/sw.test.js` lo verifica).

## Review Focus

1. **Sin síntesis de voz** (`speechSynthesis` ausente): nunca se arma una variante de escucha ni un dictado; el grupo sale completo sin audio. Test en Task 5 (`buildExtras` con `audio: false`).
2. **App cerrada en medio de un grupo con tarjetas:** al volver, cada resultado de tarjeta se aplica a la SRS una sola vez. Test en Task 4 (`applyCommit` dos veces con el mismo grupo).
3. **Backup viejo (v1) importado después de la carga inicial:** queda `srs: {}` y la carga inicial vuelve a correr sin duplicar ni pisar palabras. Test en Task 2.
4. **Lema con dos artículos (*der/die See*) o sin plural:** la tarjeta de nivel 2 acepta todas las formas del léxico para ese lema. Test en Task 3.
5. **Grupo que ya está en el máximo:** tarjetas + escucha nunca suman más de 4 ítems a un grupo. Test en Task 5.

---

### Task 1: Estilo de las imágenes (propuestas A/B, sin código)

**Files:** ninguno de la app. Resultado: una sección "Estilo elegido" agregada al final de spec §7.

- [ ] **Step 1:** Elegir a mano 10 lemas concretos del campo `hostel` con pictograma OpenMoji claro (por ejemplo *Schlüssel*, *Bett*, *Handtuch*, *Dusche*, *Koffer*) para usar en las muestras.
- [ ] **Step 2:** Preparar la propuesta A con la skill `taste-skill:design-taste-frontend` y la B con `awesome-design-md`, las dos sobre la identidad "cuaderno sereno" existente (`css/app.css`): OpenMoji color o monocromo sobre el fondo oscuro, tamaño en la tarjeta y en el glosario, marco o sin marco.
- [ ] **Step 3:** Mostrar las dos lado a lado (maqueta HTML en el navegador a 375×812) y esperar la elección del usuario. **No seguir sin elección.**
- [ ] **Step 4:** Anotar la elección en spec §7 y commitear `docs: estilo de imágenes elegido`.

### Task 2: SRS pura, ts-fsrs vendorizado, esquema v2 y carga inicial

**Files:**
- Create: `js/vendor/ts-fsrs.js`, `js/vendor/ts-fsrs.LICENSE`, `js/core/srs.js`, `tests/srs.test.js`
- Modify: `js/core/backup.js` (SCHEMA_VERSION 2 + migración), `js/core/store.js` (sin cambios de API), `js/app.js` (carga inicial al arrancar), `js/ui/grupo.js` (el glosario agrega palabras), `sw.js`, `tests/backup.test.js`

**Interfaces:**
- Produces (`js/core/srs.js`):
  - `addWords(srs, lemmas: string[], now: number) → srs` — agrega en nivel 1 las que no están; nunca pisa una existente.
  - `reviewWord(srs, lemma, ok: boolean, {now, rung, mode}) → srs` — FSRS + escalera (sube si la estabilidad ≥ `PROMOTE_DAYS[rung]`, baja uno si falla). Si `ok` en `mode: 'read'`, marca `listenUnlocked[rung] = true`.
  - `reviewDue(srs, lemma, ok, {now}) → srs` — solo FSRS, sin tocar el nivel; no hace nada si la palabra no está vencida (para el dictado suelto, spec §6.1).
  - `dueLemmas(srs, now) → string[]` — vencidas, la más atrasada primero.
  - `isKnown(entry, word) → boolean` — nivel 3, o verbo en nivel 2 con estabilidad ≥ 10 días (spec §4).
  - `seedSrs(srs, {progress, units, lexicon, now}) → srs` — por cada tema con un intento en su escalón 3, `addWords` con los lemas del léxico cuyo `field` es el del escalón 3 (spec §5.1).
  - Entrada: `{card, rung: 1|2|3, listenUnlocked: {}, addedAt}`; `card` con fechas como ms (serializable a JSON).
  - `PROMOTE_DAYS`.
- Produces (`js/core/backup.js`): `SCHEMA_VERSION = 2`; `migrations[2] = data => ({...data, srs: data.srs ?? {}})`.

- [ ] **Step 1: Vendorizar ts-fsrs.** `npm view ts-fsrs version` para la última estable; descargar el paquete en el scratchpad (`npm pack ts-fsrs@<versión>`), copiar su build ESM sin dependencias a `js/vendor/ts-fsrs.js` y su LICENSE a `js/vendor/ts-fsrs.LICENSE`. Anotar la versión en la primera línea de `js/vendor/ts-fsrs.js` como comentario. Verificar: `node -e "import('./js/vendor/ts-fsrs.js').then(m => console.log(typeof m.fsrs, typeof m.createEmptyCard))"` imprime `function function`.
- [ ] **Step 2: Tests que fallan** en `tests/srs.test.js`, con reloj fijo:
  - `addWords` agrega en nivel 1 y no pisa una existente (nivel 2 sigue en 2).
  - acierto repetido: después de suficientes `Good` espaciados en el tiempo, `rung` pasa de 1 a 2 recién cuando la estabilidad ≥ 4 días, y de 2 a 3 con ≥ 10.
  - error en nivel 3 → nivel 2; error en nivel 1 → sigue en 1.
  - `reviewDue` con palabra no vencida devuelve el mismo objeto; vencida + `ok` no cambia `rung`.
  - `dueLemmas` ordena por atraso.
  - `seedSrs` con un `progress` que tiene intento en `a1.u1.t1/3` agrega los lemas de `field: hostel` y no los de otros campos; correrla dos veces da lo mismo.
  - el estado sobrevive `JSON.parse(JSON.stringify(srs))` y se puede seguir revisando.
- [ ] **Step 3:** Ejecutar `node --test tests/srs.test.js` → FAIL (módulo inexistente).
- [ ] **Step 4:** Implementar `js/core/srs.js` sobre `fsrs({request_retention: 0.9})`, convirtiendo fechas a ms al guardar y a `Date` al revisar.
- [ ] **Step 5:** Test en `tests/backup.test.js`: un backup v1 sin `srs` sale con `srs: {}` y `meta.schemaVersion === 2`. Implementar la migración.
- [ ] **Step 6:** `js/app.js`, después de `store.init()`: `store.update(['srs', 'meta', 'progress'], …)` que corre `seedSrs` si `!meta.srsSeeded` y pone `meta.srsSeeded = true`. `js/ui/grupo.js`: en el `store.update` que arma el grupo del escalón 3, sumar `'srs'` a las claves y `addWords(srs, fresh.glossary.map(w => w.lemma), now)`.
- [ ] **Step 7:** `node --test` → todo PASS; agregar los archivos nuevos a `SHELL`; `bash tools/check.sh` en verde.
- [ ] **Step 8:** Commit `SRS: ts-fsrs, escalera por palabra, esquema v2 y carga inicial`.

### Task 3: Tipo `card` (niveles 1 y 2, leer y escuchar)

**Files:**
- Create: `js/core/checks/card.js`, `js/exercises/card.js`, `tests/card.test.js`
- Modify: `js/core/checks/index.js`, `js/exercises/index.js`, `css/app.css`, `sw.js`

**Interfaces:**
- Consumes: `matchAnswer` (`js/core/normalize.js`), `answerInput`, `listenButton` (`js/ui/inputs.js`), `speak` (`js/services/tts.js`).
- Produces: ejercicio `{id: 'card:<lemma>:<rung>:<mode>', type: 'card', rung: 1|2, mode: 'read'|'listen', lemma, word, options?, review: true, vocab: {lemma, rung, mode}}`, donde `word` es la entrada del léxico y `options` (solo nivel 1) son 4 traducciones `es` con `correct` en una.
  - Check: nivel 1 → `answer` es el índice; nivel 2 → texto, aceptado si `matchAnswer(answer, forms, {orthographic: false})` con `forms` = `"<article> <lemma>"` para cada artículo del léxico con ese lema (verbos: el infinitivo). Resultado con `tag: null` (no toca el mastery, `applyResult` ya ignora `tag == null` sin `penalties`).
  - UI: `mode: 'listen'` muestra solo 🔊 (suena al tocarlo, nunca sola) y el botón "Ahora no puedo escuchar" (lo conecta Task 6 vía `opts.onNoAudio`); `mode: 'read'` muestra la palabra (nivel 1) o la imagen y/o la traducción (nivel 2). La imagen la agrega Task 8.
- [ ] **Step 1: Tests que fallan** (`tests/card.test.js`): nivel 1 índice correcto/incorrecto; nivel 2 acepta `der Schlüssel` y `der schlüssel` (no ortográfico, con aviso), rechaza `die Schlüssel`; un lema con *der* y *die* en el léxico acepta las dos; el verbo acepta el infinitivo; el resultado tiene `tag: null` y la regla nunca contiene la forma aceptada.
- [ ] **Step 2:** `node --test tests/card.test.js` → FAIL.
- [ ] **Step 3:** Implementar check y UI; registrar `card` en los dos índices.
- [ ] **Step 4:** `node --test` → PASS; `SHELL`; commit `Tarjetas de vocabulario: niveles 1 y 2`.

### Task 4: Tarjetas dentro del grupo y SRS en el commit

**Files:**
- Create: `js/core/cards.js`, `tests/cards.test.js`
- Modify: `js/core/runner.js` (`applyCommit`), `js/core/log.js` (`vocabEntry`), `content-src/templates.yaml` (plantilla genérica de Nominativ, `card_only: true`), `js/core/progress.js` (`generated()` ignora `card_only`), `js/core/scheduler.js` (exportar `tagUnlocked`), `tests/runner.test.js`, `tests/log.test.js`

**Interfaces:**
- Consumes: `dueLemmas`, `reviewWord` (Task 2); `instancesOf` (`js/core/generators/index.js`); `present` (`js/core/morph.js`).
- Produces:
  - `tagUnlocked(tag, mastery, curriculum) → boolean` en `scheduler.js`: el tag tiene datos y sus `requires` ≥ 0.6 (mismo `GATE`).
  - `pickCards(srs, {now, rng, lexicon, templates, topic, groupExercises, mastery, curriculum, audio, max = 3}) → exercise[]` en `cards.js`:
    - toma `dueLemmas` en orden y arma una tarjeta por lema hasta `max`;
    - excluye sustantivos si `topic.hides` incluye `article`, y cualquier lema cuyo artículo o forma evalúa un ítem de `groupExercises` (`noun` del ítem o lema en sus `answers`);
    - nivel 1–2 → `card`; nivel 3 → `gap` generado (`vocab` + `review: true`) de una plantilla con lugar para el lema y tag desbloqueado, si no la `card_only` de Nominativ (tag `a1.nom.<género>`, solo si desbloqueado); verbos en nivel 3 solo si `a1.praesens.regular` está desbloqueado (hueco `"<Pronombre> ___ (<infinitivo>) …"` con `present()`); un nivel 3 cuyo tag es de `topic.tags` no entra;
    - `mode: 'listen'` solo si `audio` y `listenUnlocked[rung]`, alternando con `rng`; nivel 3 escuchando = `dictation` de Task 5 (hasta que exista, nivel 3 solo leyendo).
  - `vocabEntry({lemma, rung, mode, ok, ms, at}) → {t: 'v', …}` en `log.js`.
  - `applyCommit`: `state` suma `srs`; por cada resultado aplicado cuyo ejercicio tiene `vocab`, `reviewWord(srs, vocab.lemma, r.ok, {now: r.at, rung: vocab.rung, mode: vocab.mode})` y `vocabEntry`. Devuelve `{mastery, log, words, progress, srs}`.
- [ ] **Step 1: Tests que fallan** (`tests/cards.test.js`, `tests/runner.test.js`, `tests/log.test.js`):
  - sin vencidas → `[]`; con 5 vencidas → 3, las más atrasadas;
  - tema con `hides: ['article']` → ninguna tarjeta de sustantivo; sí de verbo;
  - lema que es `noun` de un hueco del grupo → excluido;
  - nivel 3 de un sustantivo sin plantilla de Akkusativ desbloqueada → hueco de la plantilla Nominativ con tag `a1.nom.mask` si está desbloqueado, y ninguna tarjeta si no;
  - `audio: false` → nunca `mode: 'listen'`;
  - `applyCommit` con una tarjeta acertada sube la FSRS de ese lema una vez; aplicar el mismo grupo otra vez (con `committed` ya avanzado vía `commitNext`) no la vuelve a subir;
  - la tarjeta `card` no cambia `mastery`; el `gap` de nivel 3 sí.
- [ ] **Step 2:** `node --test` → FAIL.
- [ ] **Step 3:** Implementar. La plantilla Nominativ: `{id: tpl-nom-hier, tag_prefix: a1.nom, det: def, kase: nom, verb: sein, card_only: true, context: "…", text: "Schau mal, hier ist ___ {noun}!", slot: {pos: noun, fields: [<todos los campos del léxico>]}}`; revisar todas sus instancias con `node tools/german_texts.mjs | grep tpl-nom-hier` y `python3 tools/lt_check.py`.
- [ ] **Step 4:** En `grupo.js`, pasar `srs` al estado de `applyCommit` (todas sus llamadas, también `closeSaved`) y guardar `srs` en el mismo `store.update`.
- [ ] **Step 5:** `bash tools/check.sh` en verde; commit `Tarjetas en los grupos y SRS al confirmar`.

### Task 5: Dictado, lugar de escucha y armado de extras

**Files:**
- Create: `js/core/dictation.js`, `js/core/checks/dictation.js`, `js/exercises/dictation.js`, `js/core/extras.js`, `tests/dictation.test.js`, `tests/extras.test.js`
- Modify: `js/core/checks/index.js`, `js/exercises/index.js`, `js/core/runner.js` (`applyCommit`: dictado suelto), `js/core/progress.js` (`generated()` prefiere lemas en aprendizaje), `js/ui/grupo.js`, `sw.js`

**Interfaces:**
- Consumes: `wrongWords`, `matchAnswer`; `reviewDue`, `reviewWord` (Task 2); `pickCards` (Task 4).
- Produces:
  - `dictationPool(units, templates, lexicon) → [{text, lemmas: string[]}]`: frases de hasta 8 palabras sin `___` de las respuestas aceptadas de `transform`/`translate`, `sentences` del detective, burbujas sin huecos de `situation`, más instancias de generadores rellenadas; `lemmas` = lemas del léxico cuyo lema o plural aparece como palabra (sin distinguir mayúsculas).
  - `pickDictation(pool, srs, {rng, exclude}) → {id: 'dict:<n>', type: 'dictation', text, lemmas, review: true} | null` — prefiere frases con lemas en nivel 1–2.
  - Check de `dictation`: `ok = matchAnswer(answer, [text], {orthographic: false}).ok`; si falla, `wrong = wrongWords(...)` y `given`; `lemmaOk: {[lemma]: boolean}` (correcto si ninguna palabra subrayada es ese lema o su plural); `tag: null`.
  - `applyCommit`: para un `dictation` sin `vocab`, `reviewDue` por cada lema de `lemmaOk`; con `vocab` (nivel 3 escuchando), `reviewWord` con `lemmaOk[vocab.lemma]`.
  - `pickListening(units, progress, topicId, {now}) → situation | null`: una situación ya vista (`seen`) del tema o de uno anterior en la unidad, la de `seen` más viejo; devuelve una copia con `listen: true` (y `review: true` si es de otro tema).
  - `buildExtras(group, {srs, now, rng, unit, units, progress, lexicon, templates, mastery, curriculum, pool, audio}) → group` (en `grupo.js` se llama después de `addWords` del glosario, así una palabra que entra hoy ya puede volver como tarjeta en el mismo grupo, spec §5.2): suma `pickCards` (escalones 1–4) y, en los escalones 2–4 con `audio`, un ítem de escucha (`pickDictation` o `pickListening`, alternando con `rng`), intercalados con `interleave`; nunca más de 4 ítems extra.
  - `generated(topic, templates, lexicon, rng, skip, prefer?: Set<string>)`: las instancias cuyo `noun` está en `prefer` primero (spec §5.3). `buildGroup` recibe `preferLemmas` en sus opciones y lo pasa; `grupo.js` le da los lemas de la SRS en nivel 1 o 2.
  - `pickCards` (Task 4), nivel 3 con `mode: 'listen'`: un `dictation` de `pickDictation` restringido a frases que contienen el lema, con `vocab`; si no hay ninguna, sale leyendo.
- [ ] **Step 1: Tests que fallan:** pool sin frases con `___` ni de más de 8 palabras; `lemmaOk` con *Wir sind im Zimmer.* escrito *Wir sind im Zimer* → `{Zimmer: false}`; dictado suelto no cambia `rung`; `buildExtras` con `audio: false` no agrega escucha; con 5 vencidas y escalón 3 agrega exactamente 4 extras; escalón 5 no agrega nada; `pickListening` sin situaciones vistas → `null`.
- [ ] **Step 2:** `node --test` → FAIL.
- [ ] **Step 3:** Implementar. UI del dictado: 🔊 a 0,8× (y botón "1×"), `answerInput`, y al responder el texto original + subrayado (`segments`) en el feedback. En `grupo.js`, llamar a `buildExtras` después de `buildGroup` con `audio: tts.supported()` y el pool armado una vez por carga.
- [ ] **Step 4:** `bash tools/check.sh` en verde; commit `Dictado y lugar de escucha en los grupos`.

### Task 6: Situación en modo escucha y "Ahora no puedo escuchar"

**Files:**
- Modify: `js/exercises/situation.js`, `js/exercises/card.js`, `js/exercises/dictation.js`, `js/ui/grupo.js`, `js/core/runner.js`, `js/core/log.js`, `tests/runner.test.js`, `tests/log.test.js`

**Interfaces:**
- Produces:
  - `skipExercise(group, {now}) → {group, entry}` en `runner.js`: avanza `index` sin resultado y devuelve `{t: 'skip-audio', item, at}`.
  - `group.audioOff: boolean`; con `true`, `runExercise` renderiza `card` en `mode: 'read'`, `situation` con `listen: false`, y saltea `dictation` con `skipExercise`.
  - `opts.onNoAudio()` que reciben los renders de `card`, `dictation` y `situation` con `listen`.
  - Situación con `listen: true`: las burbujas `who: 'them'` se muestran como 🔊 sin texto; después de responder, el feedback (`situationReplay`) muestra el texto completo.
  - Aviso una sola vez (`meta.audioHintSeen`): "Si no suena, sacá el modo silencio del iPhone."
- [ ] **Step 1: Tests que fallan:** `skipExercise` avanza `index`, no agrega `results`, y `scoreGroup` del grupo da el mismo `pct` con o sin el ítem salteado; `mastery` y `srs` no cambian.
- [ ] **Step 2:** `node --test` → FAIL; implementar; PASS.
- [ ] **Step 3:** Probar en el navegador a 375×812 (preview `app`; borrar service worker y cachés antes): tocar "Ahora no puedo escuchar" en una tarjeta de escucha → sale la de lectura y el resto del grupo no tiene audio.
- [ ] **Step 4:** Commit `Modo escucha y "Ahora no puedo escuchar"`.

### Task 7: Escuchar la frase al acertar

**Files:** Modify `js/core/runner.js`, `js/ui/grupo.js`, `tests/runner.test.js`

**Interfaces:**
- Produces: `correctSentence(ex, answer, results) → string | null` en `runner.js`: si todos los resultados del ejercicio son `ok` y el tipo es `transform`, `translate` u `order` (la respuesta del usuario), `choice` con opción de frase (texto de la opción), o `gap` (el `text` con el hueco relleno); si no, `null`.
- [ ] **Step 1: Tests que fallan:** `correctSentence` devuelve `null` con un resultado fallado; devuelve *Hier ist die Dusche.* para un `gap` acertado con `ist`.
- [ ] **Step 2:** Implementar; en `closedFeedback`, si hay frase, `listenButton(frase)` después de "Bien". PASS; commit `Escuchar la frase al acertar`.

### Task 8: Imágenes OpenMoji

**Files:**
- Create: `images/openmoji/<código>.svg` (solo los usados), `data/credits.json` (generado), `tests/` del validador
- Modify: `content-src/lexicon.yaml` (campo opcional `image`), `tools/build_content.py`, `tools/validate.py`, `tests/validate_test.py`, `js/exercises/card.js`, `js/ui/glosario.js`, `css/app.css`, `sw.js`, `tests/sw.test.js` (incluir `images/`)

**Interfaces:**
- Produces: `word.image` (código OpenMoji, por ejemplo `1F511`) → `<img src="images/openmoji/1F511.svg" alt="<es>">`; `data/credits.json`: `[{file, source: 'OpenMoji', license: 'CC BY-SA 4.0', url}]`.
- [ ] **Step 1: Tests que fallan** (`tests/validate_test.py`): un lema con `image` cuyo SVG no existe → error; un SVG sin entrada en `credits.json` → error.
- [ ] **Step 2:** Implementar en `validate.py` y `build_content.py`; PASS.
- [ ] **Step 3:** Elegir a mano los pictogramas de los lemas concretos (solo los claros; sin imagen buena, sin `image`), copiar los SVG del release de OpenMoji en el estilo elegido en Task 1, y mostrar la imagen en la tarjeta (nivel 1 y 2 leyendo) y en el glosario según el estilo elegido. `alt` en español, nunca la palabra alemana.
- [ ] **Step 4:** `bash tools/check.sh` en verde; ver en el navegador a 375×812 sin conexión (DevTools offline no está: verificar que todos los SVG estén en `SHELL`); commit `Imágenes OpenMoji en tarjetas y glosario`.

### Task 9: Plan actualizado, revisión final y PR

**Files:** Modify `docs/PLAN.md` (§5: nueva iteración 2 y corrimiento de las siguientes, según spec §3; regla 10 con la definición de "conocida")

- [ ] **Step 1:** Actualizar `docs/PLAN.md`.
- [ ] **Step 2:** `bash tools/check.sh` en verde.
- [ ] **Step 3:** Recorrido en el navegador a 375×812 con datos en blanco y con la carga inicial: un grupo del escalón 3 del tema 1 con tarjetas, una tarjeta de escucha, un dictado, "Ahora no puedo escuchar", y el fin de grupo con el mismo puntaje que sin extras.
- [ ] **Step 4:** Commit `PLAN: iteración 2 vocabulario + escucha`; push y PR solo con el OK del usuario.
