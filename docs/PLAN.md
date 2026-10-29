# Plan: App privada para aprender alemán A1 → C1 (lectoescritura + audición) en iPhone

## Contexto
App personal y no comercial para ir de cero (A1) a C1 inclusive. El foco está en lectura y escritura y,
como extra, en audición con recursos gratuitos. Se usa en **iPhone** como PWA: Safari → Compartir →
"Agregar a pantalla de inicio" la abre a pantalla completa como si fuera una app.

**Decisiones tomadas con el usuario**
- Stack: web estática (HTML + CSS + JavaScript con módulos ES, **sin build en el código**; el contenido YAML se compila a JSON y ese JSON se commitea). Hosting en **GitHub Pages**, con repo público: el progreso vive solo en el iPhone.
- Corrección de la escritura libre con la **API pública gratuita de LanguageTool** (`de-DE`).
- Audición con la voz alemana del iPhone (TTS) más **YouTube/DW embebidos**.
- Interfaz y explicaciones en español. **Contenido original**: se aprende de las fuentes y se crean ejercicios propios o parafraseados, siempre verificados gramaticalmente.
- **Test de nivel** inicial y repetible.
- **Ante un error (ítems cerrados):** se marca como incorrecto, se muestra la regla gramatical a tener en cuenta (sin la solución) y **se pasa al siguiente ejercicio**. No se reintenta el mismo ítem: no vuelve en la misma sesión y, en sesiones posteriores, solo si no queda otro ítem del mismo par. Las tareas abiertas (escritura, dictado) son la excepción explícita: después de enviar se ve el modelo o el texto original y reescribir es opcional. La app registra *qué regla* y *qué tipo de ejercicio* fallaste, y la regla de decisión es **aumentar la probabilidad de que esa combinación aparezca en el futuro**, con ítems distintos.
- **Sesión de duración variable**: se elige al empezar (5 / 15 / 30 / 45+ min).

### Cambios de la revisión crítica (respecto del borrador anterior)
1. **El cuello de botella real es el volumen de contenido** (A1–C1 son unas 70 unidades y miles de ítems). Por eso se agrega un **motor morfológico y generador de ejercicios**: declinaciones, conjugaciones, artículos, preposiciones y transformaciones salen de un léxico verificado, dan práctica casi infinita y son correctos por construcción. Los textos y las tareas comunicativas siguen siendo redactados a mano.
2. **Diagnóstico de errores automático en lugar de patrones a mano.** El motor compara la respuesta con el paradigma ("usaste la forma de Akkusativ; este verbo pide otro caso") sin dar la respuesta.
3. **Currículo como grafo de prerrequisitos.** Si fallás Wechselpräpositionen y el diagnóstico apunta al Dativ, se refuerza el Dativ.
4. **Lectura auténtica legal para B2–C1:** Wikipedia en alemán (CC-BY-SA) y **dominio público vía Wikisource-DE / gutenberg.org** (Kafka, Zweig, Schnitzler, Thomas Mann, Musil…), con nuestras preguntas.
5. **Primero una porción vertical usable en el iPhone** (una unidad de punta a punta) y después se amplía en horizontal.
6. **Tests automáticos** del motor (`node --test`, sin dependencias) y **CI en GitHub Actions** que valida el contenido antes de publicar.
7. Diseño explícito de la **sesión diaria**, recordatorio de backup y límites honestos de LanguageTool.

### Cambios de la segunda revisión (2026-10-29)
1. **Legal:** fuera Hesse (protegido hasta 2033 en DE y AR) y Projekt Gutenberg-DE (solo uso privado). Entran Thomas Mann (libre desde 2026), Musil, Joseph Roth, Rilke, Storm y Tucholsky. Nada de transcripciones no libres guardadas en el repo.
2. **Prensa y revistas reales desde A2**, con 3 niveles según la licencia de cada artículo (§1).
3. **LanguageTool propio en Docker para la CI:** la API pública pide no mandar requests automatizados. La app sigue usando la API pública cuando el usuario escribe.
4. **El JSON generado se commitea:** el servidor local funciona sin build y la CI verifica que esté al día.
5. **Contradicciones resueltas:** sesión de 5 min sin material nuevo como única excepción; piso de mantenimiento en el scheduler; excepciones declaradas para tareas abiertas; tolerancia que no borra lo que se evalúa; FSRS solo para vocabulario; orden de iteraciones coherente.
6. **Reglas operativas nuevas**, numeradas y verificables, en §7.
7. **Biblioteca personal (uso privado):** los textos que no se pueden publicar (Hesse, Projekt Gutenberg-DE, prensa sin CC) se importan en el iPhone y nunca entran al repo (§1, §3 Lectura, regla 21). Cambiar de host no resolvía la licencia: el límite es publicar, no dónde se publica.

---

## 1. Fuentes investigadas

### Lectoescritura y gramática (se estudian como modelo; no se copian)
- Goethe "Deutsch für dich" (A1–C2): https://goethe.de/dfd · Ejercicios gratis: https://goethe.de/ins/ca/en/spr/ueb.html
- **Lingolia Alemán en español** https://deutsch.lingolia.com/es/ : gramática por temas, ejercicios A1–C1, lectura y audición con transcripción, ortografía y escuela de escritura. *No es de licencia libre* (Lingolia Plus es pago, el primer ejercicio de cada tema es gratis). Sirve de modelo y de enlace "leer más" desde las fichas.
- grammatiktraining.de (más de 800 ejercicios A2–C1): https://grammatiktraining.de/uebungen.html
- Deutsch im Alltag (Sprachbausteine B1–C1, C1-Trainer): https://www.deutsch-im-alltag.com/deutsch-interaktiv
- Deutsch mit Anna: https://deutsch-mit-anna.de/uebungen/ · Deutschlernerblog (A1–C1): https://deutschlernerblog.de/deutsch-online-lernen-uebungen-deutsch-uebungen-online/
- ZUM Deutsch lernen: https://deutsch-lernen.zum.de/wiki/Interaktive_%C3%9Cbungen · Sprachschule Aktiv Wien: https://www.sprachschule-aktiv-wien.at/uebungen-zur-deutschen-grammatik-deutsch-kostenlos-online-lernen/
- iQ Lingua (libros A1–B2): https://www.iq-lingua.de/en/free-online-german-books/ · Lingua.com (lecturas A1–B2)
- Referencias gramaticales: syllabus C1/C2 de Freiburg (https://www.sli.uni-freiburg.de/deutsch/kurse/Syllabi-Kursbeschreibungen/syllabi-deutsch-g-kurse/syllabus-deutsch-g-grammatik-fuer-fortgeschrittene), índice de Deutsche Grammatik 2.0 (https://deutschegrammatik20.de/wp-content/Deutsche-Grammatik20-Uebungsbuch-Band-2-Inhaltsverzeichnis.pdf), Klett *Kontext Grammatik* (clasificación por nivel) y, para verificar, Duden online, Wiktionary y DWDS, que son gratuitos.

### OER adaptables (verificar la licencia CC de cada uno)
*Grenzenlos Deutsch*, *Willkommen: Deutsch für alle* (U. Alberta), *Deutsch im Blick* (UT Austin), *A Foundation Course in Reading German* (UW–Madison), Wikibooks German, CoERLL (CC-BY). Directorio: https://oer.bmcc.cuny.edu/oer-by-subject/german/

### Currículo y exámenes (para fijar contenidos y formatos)
GER/Kann (https://www.goethe.de/ins/de/de/uun/dln/ger.html), Profile deutsch 2.0, Rahmencurricula ÖIF
[A1](https://www.integrationsfonds.at/fileadmin/user_upload/A1_Rahmencurriculum.pdf) y [C1](https://www.integrationsfonds.at/fileadmin/user_upload/C1_Rahmencurriculum.pdf),
anexo Goethe B1–C2 (https://www.goethe.de/resources/files/pdf236/serbien-rahmencurriculum-anhang17-18.pdf), listas de vocabulario Goethe A1/A2/B1,
**Modellsätze Goethe A1–C2** (https://goethe.de/en/spr/prf/vor.html) y descargas gratuitas de telc (https://www.telc.net/verlagsprogramm/lernende-pruefungsteilnehmende/kostenlose-downloads.html).

### Datos lingüísticos reutilizables
- **Wiktionary vía kaikki.org** (CC-BY-SA): género, plural, declinación y conjugación para construir y verificar el léxico — https://kaikki.org/dictionary/German/
- **Traducciones al español:** sección *Übersetzungen* de Wiktionary DE (CC-BY-SA, vía la extracción del Wiktionary alemán en kaikki). Lo que falte se traduce a mano y se revisa. german-nouns trae definiciones en alemán y kaikki EN glosas en inglés, así que ninguno sirve solo.
- **Tatoeba** (pares alemán–español, CC-BY / CC0) para frases de ejemplo — https://tatoeba.org/downloads. Sus frases pasan por el mismo control de calidad que el alemán redactado (§4).
- **DWDS** (frecuencia y colocaciones, solo consulta) para priorizar el vocabulario B2–C1 y los Funktionsverbgefüge.
- **Lectura auténtica legal:** Wikipedia en alemán (CC-BY-SA, con atribución), Wikisource-DE y gutenberg.org (dominio público), Wikinews en alemán. **No** Projekt Gutenberg-DE en el repo: sus condiciones solo permiten uso privado (sí en la biblioteca personal).
- **Literatura de dominio público** (en DE y AR, 70 años *post mortem*): Thomas Mann (*Tonio Kröger*, *Der Tod in Venedig*; libre desde 2026, verificar si ya está en Wikisource-DE), Musil (*Törleß*), Joseph Roth (*Die Legende vom heiligen Trinker*, *Hiob*), Rilke (*Briefe an einen jungen Dichter*), Storm (*Immensee*), Kafka, Zweig, Schnitzler y Tucholsky (ironía, C1). Hesse sigue protegido hasta 2033: en el repo solo enlace "leer más", sin guardar el texto; se puede leer desde la biblioteca personal.

### Prensa y revistas
La licencia se revisa artículo por artículo (bpb, por ejemplo, mezcla licencias) y se guarda en `data/texts/*.json` (`license`, `modified`).
- **CC BY / BY-SA / BY-NC-SA** (netzpolitik.org, revista *LUXEMBURG* de la Rosa-Luxemburg-Stiftung, parte de bpb): se guardan y se pueden acortar o adaptar, con atribución.
- **CC BY-NC-ND** (la mayoría de bpb, libros de la Rosa-Luxemburg-Stiftung): se guardan solo sin modificar. Preguntas y glosario van aparte.
- **Sin CC** (Spiegel, Zeit, taz, nachrichtenleicht.de): solo enlace más preguntas propias. No funcionan offline.
- NC no es problema porque la app no es comercial. Por nivel: A2–B1 nachrichtenleicht y bpb en lenguaje simple; B2–C1 netzpolitik, *LUXEMBURG* y dossiers de bpb.

### Biblioteca personal (uso privado)
Para lo que no se puede publicar: Hesse, Projekt Gutenberg-DE, artículos de Spiegel o Zeit guardados, libros propios. El repo y la URL pública nunca los contienen; respetar igual las condiciones de cada sitio.
- **A — Importar en el teléfono (base):** el usuario importa un archivo (txt, html o epub) desde Archivos y queda solo en IndexedDB. La app arma lo que puede sin revisión: glosario desde el léxico, estado de palabras, envío al SRS y un resumen abierto que LanguageTool corrige cuando el usuario toca "corregir". No hay preguntas de comprensión. Las palabras sin entrada en el léxico se muestran "sin traducción".
- **B — Paquete preparado en la compu (para los textos que valgan la pena):** `tools/pack_text.py` toma el texto y sus preguntas, corre `validate` y LanguageTool local (Docker) y genera un `.json` que se importa en el iPhone. Queda con la misma calidad que el contenido público. Los paquetes se guardan en `privado/` (en `.gitignore`).

### Audición (gratis)
DW: Nicos Weg (A1–B1), "Deutsch – warum nicht?" (A1–A2), Top-Thema mit Vokabeln (B1–B2, **con manuscrito**), Langsam gesprochene Nachrichten (B2–C1, **con manuscrito**) ·
YouTube: Easy German (A2–C1), Learn German with Jenny / Deutsch mit Marija (A1–B2), tagesschau in 100 Sekunden y logo! (B2–C1) ·
Podcasts: Coffee Break German (A1–B1), Slow German (B1–B2, con transcripciones) · audios de los Modellsätze Goethe.
Nada de esto es de licencia libre: se enlaza o se embebe, nunca se rehostea ni se guarda la transcripción.

### Lecciones de proyectos open source en GitHub
| Proyecto | Qué es | Qué adoptamos |
|---|---|---|
| [LibreLingo](https://github.com/kantord/LibreLingo) (AGPL, 2.6k★, archivado) | Alternativa libre a Duolingo: Svelte, PouchDB y SRS | **Cursos en YAML compilados a JSON**, contenido separado del código, local-first. Escribimos unidades en YAML (comentarios y textos multilínea cómodos) y `tools/build_content.py` las compila a JSON en la CI. El código de la app sigue sin build. No copiamos código (la AGPL no conviene). |
| [Lute v3](https://github.com/LuteOrg/lute-v3) / LWT (MIT) | Aprender leyendo: cada palabra tiene un estado | **Modelo de palabras conocidas en la lectura:** estado por palabra (nueva → 1–5 → conocida / ignorar), **términos padre** (lema: *ging* → *gehen*), **términos multipalabra** (clave en alemán: verbos separables *fängt … an*, Funktionsverbgefüge *zur Sprache bringen*) y "marcar el resto como conocido". Sirve para estimar tu vocabulario frente a la meta del nivel (650 → 8.000) y para mandar palabras al SRS desde la lectura. |
| [german-nouns](https://github.com/gambolputty/german-nouns) (CC-BY-SA 4.0) | Unos 100.000 sustantivos de Wiktionary DE con género y las 8 formas de caso, más un divisor de compuestos | Fuente principal de **sustantivos** del léxico y de los tests de `morph.js`. El **divisor de compuestos** va al glosario: tocar *Vermögensbildung* muestra *Vermögen + Bildung*. |
| kaikki.org (Wiktionary EN) | Verbos y adjetivos con sus formas | Fuente de **verbos y adjetivos**: Präteritum, Partizip, auxiliar haben/sein, comparación. |
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) (MIT) | Implementación oficial de FSRS (el algoritmo moderno de Anki) | Se **vendoriza** su build ESM en `js/vendor/` (con su LICENSE) en lugar de escribir un "FSRS-lite" propio: está probado y mejor calibrado. Se usa **solo para vocabulario**; la gramática va por pares (tag, tipo). |
| [satzbau](https://github.com/TimoBechtel/satzbau) (MIT) | Generador de lenguaje natural en alemán: declina, no conjuga | Valida nuestro enfoque de generador. Adoptamos una **notación compacta de diccionario** para el YAML, la de los diccionarios para estudiantes, **con genitivo**: `der Tisch, -(e)s, -e`, `der Junge, -n, -n`. Sin el genitivo no se puede expresar la n-Deklination. |
| german-declension-driller / Deklinator | Drills de frases nominales aleatorias | Confirma que funciona el drill generado de "artículo + adjetivo + sustantivo en caso X". Se suma la variante de **colorear terminaciones** en el feedback. |
| LanguageTool (`grammar.xml` de alemán, LGPL) | Reglas de LT con id y categoría | Base para armar `data/lt-map.json`: ids reales de reglas alemanas → nuestros tags. |
| dual-sub-replay | Subtítulos dobles con toque para repetir | En el reproductor de video: **"repetir esta frase"** con tiempos propios (inicio y fin cargados a mano, sin guardar el texto), además de "−5 s". Los manuscritos de DW no traen tiempos. |
| Mazos Anki por nivel (vía [awesome-german](https://github.com/willianpaixao/awesome-german)) | Vocabulario B1/B2 | Solo como **referencia** para contrastar la cobertura de nuestro léxico. La licencia no es clara y no se importan. |

**Descartados:** varios repos con apariencia de spam o contenido autogenerado (descripciones llenas de emojis, forks clonados el mismo día, licencias "NOASSERTION"). No se usan.

---

## 2. Contenidos mínimos por nivel
En la iteración 1 pasan a `docs/curriculum.md` y a `data/curriculum.json`, donde cada punto tiene **id**, nivel,
descripción y **`requires`** (prerrequisitos), formando un grafo. Vocabulario aproximado según Goethe y Profile deutsch.

### A1 (unas 650 palabras)
- **Temas:** presentarse, familia, números, hora y fecha, comida y compras, vivienda, rutina, tiempo libre, ciudad y orientación, transporte, cuerpo y salud, ropa, clima.
- **Lectura (Kann):** carteles, horarios, menús, formularios, anuncios cortos, SMS y emails breves; extraer datos (hora, precio, lugar).
- **Escritura (Kann):** formularios, SMS y notas, postal o email de unas 30 palabras (saludar, invitar, pedir).
- **Textsorten:** formulario, SMS, nota, postal, anuncio, menú, horario, cartel.
- **Gramática:** alfabeto y grafías (ä/ö/ü/ß/ei/ie/ch/sch); pronombres personales; presente regular e irregular (e→i, a→ä); sein, haben, möchten; V2, pregunta sí/no, W-Fragen; artículos definidos, indefinidos y negativos; género y plural (reglas orientativas); Nominativ y Akkusativ (el Dativ aparece solo como chunks: *im*, *am*, *mit dem Bus*, *in der Stadt*, sin diagnóstico de caso); posesivos; nicht/kein; modales können/müssen/wollen/dürfen; verbos separables; Imperativ; preposiciones de tiempo (am/um/im) y de lugar básicas; und/aber/oder/denn; Perfekt de verbos frecuentes (introducción).
- **Ortografía:** mayúscula en sustantivos, Sie/Ihr formal, ß/ss básico.

### A2 (unas 1.300)
- **Temas:** trabajo, formación, viajes, médico, servicios (banco, correo, oficinas), fiestas, medios, mudanza y alquiler, relaciones.
- **Lectura:** emails personales, avisos, blogs y folletos, instrucciones simples, noticias muy sencillas; idea principal.
- **Escritura:** email informal de 40 a 60 palabras (invitar, aceptar, rechazar, disculparse, contar experiencias), notas con motivos.
- **Gramática:** Perfekt completo (haben/sein; participios regulares, irregulares, separables, inseparables); Präteritum de sein/haben/modales; Dativ (artículos, pronombres, verbos con Dativ); preposiciones con Akk/Dat y Wechselpräpositionen (stellen/stehen, legen/liegen…); reflexivos; comparativo y superlativo; adjetivo tras artículo definido e indefinido; subordinadas con weil/dass/wenn/ob/W-Wort; deshalb/trotzdem; Konjunktiv II de cortesía; man/jemand/etwas/nichts; verbos con preposición frecuentes; werden + Infinitiv; genitivo -s en nombres propios.
- **Ortografía:** coma antes de subordinadas.

### B1 (unas 2.400)
- **Temas:** postulación y entrevista, educación, medio ambiente, salud, medios y tecnología, consumo, cultura, convivencia, reclamos de viaje.
- **Lectura:** prensa sencilla, foros, cartas formales, reglamentos, relatos breves; hechos frente a opiniones, argumentación simple.
- **Escritura:** email formal e informal de unas 80 palabras (consulta, reclamo, disculpa), opinión en foro, experiencias y planes, CV y carta de presentación simples.
- **Gramática:** Präteritum (regular, irregular, mixto); Plusquamperfekt; Futur I; Konjunktiv II presente (deseos, consejos, irreal); Passiv Präsens y Präteritum; relativas (Nom/Akk/Dat, con preposición, wo/was); declinación adjetival completa; Genitiv y wegen/während/trotz; zu + Infinitiv; um…zu/damit; obwohl, während, bevor, nachdem, seit, bis, als/wenn; conectores dobles (nicht nur…sondern auch, sowohl…als auch, entweder…oder, weder…noch); da-/wo-compuestos; n-Deklination (introducción); lassen; brauchen + zu.
- **Ortografía:** comas con infinitivos y relativas, das/dass.

### B2 (unas 4.000–5.000)
- **Temas:** política, economía y trabajo moderno, ciencia y tecnología, migración, ética, arte y literatura, psicología, globalización, universidad.
- **Lectura:** prensa y reportajes, columnas de opinión, divulgación especializada, literatura contemporánea breve; postura del autor, implícitos, tono.
- **Escritura:** Erörterung de 150 a 200 palabras, carta formal de reclamo o solicitud, comentario, resumen, descripción de gráficos.
- **Gramática:** Passiv en todos los tiempos y con modales; Zustandspassiv; alternativas al Passiv (man, sich lassen, sein + zu, -bar/-lich); Konjunktiv II pasado y modales con doble infinitivo; Konjunktiv I (introducción al discurso indirecto); Futur II de suposición; je…desto, zwar…aber, einerseits…andererseits; indem, sodass, falls, sofern, (an)statt/ohne dass/zu, als ob; n-Deklination completa; adjetivos y participios sustantivados; Partizip I/II como adjetivo; Nomen-Verb-Verbindungen; preposiciones con genitivo (aufgrund, innerhalb, statt, infolge); modales subjetivos (sollen/wollen); partículas modales (doch, ja, mal, eben, halt).
- **Estilo:** registro formal frente al informal, conectores textuales (außerdem, folglich, dennoch).

### C1 (unas 8.000 o más)
- **Temas:** academia, derecho y administración, economía y finanzas, filosofía y ética, discurso público, literatura, ciencia, trabajo especializado.
- **Lectura:** textos largos académicos y técnicos, comentario con ironía, literatura; matices, estructura argumentativa, registro.
- **Escritura:** ensayo de 250 o más palabras (tesis, argumentos, contraargumentos, conclusión), resumen académico, informe, carta formal compleja, reformulación de estilo.
- **Gramática:** nominalización ↔ verbalización (weil → wegen/aufgrund, obwohl → trotz, wenn → bei, nachdem → nach…); Partizipialattribute extendidos ↔ relativas; Gerundiv; Konjunktiv I completo y discurso indirecto en todos los tiempos; Funktionsverbgefüge; es gilt zu, sein/haben + zu, -bar, sich lassen; zufolge, angesichts, hinsichtlich, mittels, ungeachtet; orden del Mittelfeld (TeKaMoLo, pronombres, nicht); modales subjetivos (dürfte, müsste, soll, will); correlatos (es, darauf…, dass); Nominalstil frente a Verbalstil; Vorfeld y Ausklammerung para dar énfasis.
- **Ortografía y estilo:** puntuación avanzada, mayúsculas en nominalizaciones (das Beste, im Allgemeinen), coherencia y cohesión.

---

## 3. Arquitectura

### Principios
**Terminología:** *tag* = id del currículo. Es la unidad que usan mastery, scheduler, test y estadísticas. "Regla" es lo que se le muestra al usuario sobre ese tag.

1. **Contenido = datos** (YAML fuente → JSON generado y commiteado). Agregar contenido no toca el código. Los generadores son código; sus plantillas y ranuras son datos.
2. **Tipos de ejercicio como plugins:** `js/exercises/<tipo>.js` exporta `{type, render(item, el, ctx)}` (UI) y `js/core/checks/<tipo>.js` exporta `check(item, answer) → Promise<{ok, diagnoses}>` (lógica pura y testeable, que delega en `diagnose.js`). Es asíncrono porque `writing` consulta LanguageTool. Un tipo nuevo son dos archivos más una línea en el registro.
3. **Todo etiquetado con ids del currículo** (grafo con `requires`). Mastery, test, SRS y estadísticas usan esos mismos ids.
4. **Lógica pura separada de la UI** (`js/core/*` no toca el DOM), así se puede testear con `node --test`.
5. **Persistencia con migraciones** (IndexedDB más `schemaVersion`), `navigator.storage.persist()`, export/import JSON y **recordatorio de backup cada 7 días**.
6. **El código de la app no tiene build ni dependencias** (solo `ts-fsrs` vendorizado). El contenido sí se compila de YAML a JSON; el JSON se commitea y la CI recompila y falla si hay diferencias. Las herramientas Python declaran sus dependencias en `tools/requirements.txt` (PyYAML, Pillow). iOS Safari 16.4 o posterior; se publica con `git push`, que dispara la CI (compilar, validar y testear) y después Pages.

### Estructura
```
index.html, manifest.webmanifest, sw.js, icons/
css/app.css                      # mobile-first, safe-area, modo oscuro, tipografía grande legible
js/app.js                        # arranque, router por hash
js/ui/*.js                       # home/sesión, mapa, unidad, ficha, lectura, escritura, audición, test, vocab, ajustes
js/core/store.js                 # IndexedDB, migraciones, export/import
js/core/content.js               # carga diferida de packs por nivel
js/core/morph.js                 # MOTOR MORFOLÓGICO: artículos, declinación (sust./adj./pron.), conjugación, Partizip, comparación
js/core/generators/*.js          # generadores parametrizados por tag (ver abajo)
js/core/diagnose.js              # compara respuesta ↔ paradigma → regla rota (sin revelar la solución)
js/core/mastery.js               # dominio por tag y por par; penaliza el prerrequisito diagnosticado
js/core/scheduler.js             # arma la sesión: vocabulario vencido + débiles + nuevo, intercalado y cooldown (RNG y reloj inyectables)
js/core/srs.js                   # wrapper sobre ts-fsrs (js/vendor/ts-fsrs.mjs, MIT), solo vocabulario
js/core/words.js                 # estado por palabra al estilo Lute (nueva/1–5/conocida/ignorar), lemas y multipalabra
js/core/normalize.js             # tolerancia: ae/oe/ue/ss, espacios, puntuación, sin borrar el rasgo evaluado (§7); alternativas aceptadas
js/core/checks/*.js              # check() puro por tipo de ejercicio
js/services/languagetool.js      # cliente LT: límites, cola offline, mapeo de reglas
js/services/tts.js               # speechSynthesis de-DE
js/services/youtube.js           # IFrame API: fragmentos, repetir, 0.75×
js/exercises/*.js                # gap, choice, order, match, truefalse, image-choice, hotspot, realia, odd-one-out,
                                 # picture-story, describe, chart, declension, conjugation, transform, dictation, writing, reading
data/curriculum.json             # grafo de ids
data/lexicon/{nouns,verbs,adjectives}.json  # léxico curado por nivel (género, plural, formas, traducción, frecuencia)
data/levels/<nivel>/unit-NN.json # unidad: can-do, fichas, lectura, ítems escritos a mano, generadores habilitados, escritura, media
data/grammar/<id>.json           # fichas: regla, tablas, ejemplos, errores típicos de hispanohablantes, ejemplos alternativos
data/placement/items.json        # banco del test
data/lt-map.json                 # regla LT → tag y explicación en español
data/media.json, data/texts/*.json (lecturas auténticas con fuente y licencia), data/credits.json
content-src/**/*.yaml            # unidades, fichas y léxico escritos en YAML (fuente editable)
tools/build_content.py           # YAML → data/*.json (corre en la CI y localmente)
tools/build_lexicon.py           # german-nouns + kaikki.org → léxico chico solo con nuestras palabras
tools/validate.py, tools/lt_check.py, tools/check_media.py, tools/optimize_images.py
tools/check.sh                   # punto de entrada único: build → validate → lt_check → tests (igual en local y en la CI)
tools/requirements.txt           # dependencias de las herramientas (PyYAML, Pillow)
tests/*.test.js                  # morph, diagnose, mastery, scheduler, normalize, srs, checks (node --test)
.github/workflows/ci.yml         # check.sh con LanguageTool en Docker como servicio → deploy de Pages
LICENSE, LICENSE-data            # código MIT; datos derivados de Wiktionary CC-BY-SA 4.0
docs/curriculum.md, docs/content-guide.md
```

### Motor morfológico y generadores (clave para escalar y para no copiar)
- `morph.js` implementa reglas como tablas: artículos y pronombres por caso, género y número; declinación fuerte, débil y mixta del adjetivo; n-Deklination; presente, Präteritum, Perfekt (con haben o sein), Konjunktiv I y II, Imperativ, Passiv; comparación. Las irregularidades vienen del **léxico**, cuyas formas se sacan de Wiktionary y se verifican.
- **Variantes:** `morph.js` devuelve el conjunto de formas válidas (*des Tischs / des Tisches*, *Pizzas / Pizzen*), no una sola.
- **Tests:** cada conjunto generado se compara con las tablas de Wiktionary para todo el léxico. Como las irregularidades salen de Wiktionary, ese test solo prueba de verdad las formas regulares; las irregulares se contrastan además con Duden o DWDS en una muestra. Esto garantiza la morfología del contenido generado, no su sentido: de eso se ocupan las plantillas con ranuras tipadas.
- **Generadores por tag**, por ejemplo: `articulo-caso` (A1–A2), `perfekt-hilfsverb`, `adj-endung`, `wechselpraep`, `verb-praeposition`, `konj2-umformung`, `passiv-umformung`, `relativsatz`, `nominalisierung` (C1, con pares curados como *weil … steigt* → *wegen des Anstiegs*), `partizipialattribut`. Cada uno combina plantillas de frase con huecos tipados (sujeto animado, objeto en Dativ…) y léxico del nivel, para que las frases tengan sentido. Cada consigna generada fija la restricción que vuelve única la respuesta (por ejemplo "artículo definido", porque en *Ich sehe ___ Hund* valen den/einen/keinen/meinen), o el generador entrega el conjunto completo de respuestas válidas. En `order` se aceptan todos los órdenes V2 válidos.
- Frases plantilla nuevas: se escriben a mano, pasan por LanguageTool y revisión, y después el generador solo varía las palabras dentro de ranuras seguras.

### Feedback de errores y refuerzo (núcleo pedagógico)
- **Flujo ante un error (sin reintento):** (1) se marca **"Incorrecto"**; (2) se muestra la **regla** que había que aplicar, sin la solución: `diagnose.js` identifica qué forma usaste ("es Akkusativ masculino", "usaste haben") y la contrasta con la regla ("*helfen* rige Dativ"). Nombra la regla, nunca la forma correcta (*dem*); (3) se muestra un **ejemplo distinto** generado con la misma regla, que difiere en la dimensión evaluada (otro género o número) para no revelar la forma, y un enlace a la ficha; (4) botón **"Siguiente"**. El ítem fallado no vuelve en la misma sesión: lo que vuelve es *la regla en ese tipo de ejercicio*, con otro ítem y más adelante.
- **Qué se aprende de cada fallo:** se registra el par **(regla, tipo de ejercicio)**. Por ejemplo, fallar Dativ en `gap` no es lo mismo que fallarlo en `writing` o `hotspot`. El mastery se guarda por regla y también por par regla × tipo.
- Ítems escritos a mano (lectura, realia): el autor anota los distractores con su regla (`errors: [{answer, rule, hint}]`); el resto cae en la regla principal.
- **Escritura con LanguageTool:** se subraya la zona y **se ocultan las sugerencias de reemplazo** de LT. `lt-map.json` traduce la regla de LT a nuestro tag y explicación; las no mapeadas muestran solo la categoría y no cuentan. Cada error mapeado suma al par (tag, `writing`), con como máximo una penalización por tag por texto. Reescribir el texto es opcional; no es un paso obligatorio.
- **Mastery:** por tag, un valor de 0 a 1 tipo media móvil exponencial, con peso según dificultad y fallos recientes con decaimiento temporal. Cuando un error se diagnostica en un prerrequisito (Dativ dentro de un ejercicio de Wechselpräp.), **ese** tag recibe la penalización completa y el tag del ítem una parcial (×0.5), para que también vuelva el contexto. Si un par no tiene datos se usa el mastery del tag; si el tag tampoco tiene, la semilla del test de nivel o 0.
- **Regla de decisión del scheduler:** el próximo ejercicio se elige por muestreo aleatorio ponderado sobre pares (tag, tipo), con `peso = base × max(0.1, 1 − mastery del par) × factor de olvido`. Los errores recientes ya están dentro del mastery y no se cuentan dos veces. Cada fallo **sube la probabilidad** de ese par y cada acierto la baja de a poco, hasta el piso de mantenimiento (0.1) cuando se domina, así lo dominado nunca desaparece del todo. Solo se samplean pares que tienen ítems o generador, y un tag entra como nuevo recién cuando sus `requires` superan el umbral de mastery. Hay cooldown por ítem (nunca el mismo ítem en la misma sesión), un máximo de 2 seguidos del mismo tag y un mínimo de material nuevo en cada sesión de 15 min o más, para que el refuerzo no tape el avance. Como los generadores crean ítems nuevos, se repite la **regla en ese formato**, no la pregunta.

### Sesión diaria de duración variable
El usuario elige 5 / 15 / 30 / 45+ min. El scheduler llena el tiempo con un tiempo estimado por tipo de ejercicio:
- **5 min:** solo repasos (vocabulario vencido en FSRS y tags débiles). Es la única sesión sin material nuevo.
- **15 min:** repasos, un bloque nuevo de la unidad actual y una micro-escritura (en A1, 1–2 frases), porque el foco es la lectoescritura.
- **30 min:** lo anterior más lectura o audición, con prioridad a la lectura.
- **45+ min:** lo anterior más una tarea de escritura completa.

Cada iteración arma la sesión solo con lo que ya existe (ver §5).

Al final se muestra un resumen: reglas trabajadas, reglas débiles, racha y minutos.

### Lectura
- Niveles A1–B1: textos propios (realia, emails, blogs, relatos), con glosario al tocar una palabra (traducción, artículo, plural y partes del compuesto; desde el léxico). El glosario oculta lo que evalúa el ítem actual: en una pregunta de vocabulario no traduce esa palabra. Desde A2 se suma prensa real en lenguaje simple (§1, Prensa y revistas).
- **Estado de palabras al estilo Lute:** al leer, cada palabra se muestra resaltada según su estado (nueva, aprendiendo, conocida). Tocarla permite cambiar el estado o mandarla al SRS, y al terminar el texto se puede marcar el resto como conocido. Se reconocen lemas (*ging* → *gehen*) y términos multipalabra (verbos separables, Funktionsverbgefüge). El dashboard muestra "palabras conocidas frente a la meta del nivel".
- Niveles B2–C1: además, **textos auténticos con licencia libre** (Wikipedia en alemán, Wikinews, prensa CC, literatura de dominio público), guardados con su fuente y licencia y con preguntas propias (idea principal, postura, inferencias, vocabulario en contexto, estructura argumentativa).
- Estrategias de lectura explícitas por nivel: escaneo de datos (A1), idea principal (A2/B1), opinión e intención (B2), implícitos y registro (C1).
- **Biblioteca personal** (§1): los textos importados (A) se leen con glosario y estado de palabras, sin ítems cerrados, así que no mueven el mastery; solo el SRS y el resumen. Los paquetes (B) traen preguntas revisadas y cuentan como cualquier lectura. Los textos A se marcan "sin revisar" en la app.

### Escritura
Consigna tipo Goethe/telc, contador de palabras, teclas ä ö ü ß, LanguageTool, checklist de criterios por nivel (cumplimiento de la tarea, coherencia, conectores, variedad, registro) y **texto modelo** que se ve después de enviar (excepción declarada: es una tarea abierta). Para B2–C1 incluye la reescritura de estilo (nominal ↔ verbal). Los errores de LT mapeados alimentan el mastery; un error de ortografía en una palabra del léxico baja además la tarjeta FSRS de esa palabra.
**Límite honesto:** LanguageTool detecta gramática y ortografía, pero no la coherencia, el contenido ni el estilo C1. Esas dimensiones se cubren con el checklist de autoevaluación y la comparación con el modelo.

### Audición
- TTS: dictados de nuestros textos a 0.7, 0.9 o 1.0 de velocidad, con comparación palabra por palabra y el mismo feedback por regla. Al terminar se muestra el texto original (tarea abierta).
- YouTube/DW embebidos (`youtube-nocookie`, `playsinline`) en fragmentos, con repetir 5 s, 0.75× y subtítulos on/off. **Preguntas de comprensión solo para material con transcripción verificable** (DW Top-Thema y LGN tienen manuscrito, Slow German y Goethe también). El resto lleva una tarea abierta de resumen corregida con LT. `check_media.py` detecta videos caídos.

### Imágenes
Tipos `image-choice`, `hotspot` (escenas SVG propias para preposiciones y casos), `realia` (documentos falsos hechos en HTML/SVG), `picture-story`, `describe` (Bildbeschreibung A2–C1), `chart` (gráficos SVG generados, B2–C1) y `odd-one-out`.
Fuentes de imágenes: Wikimedia Commons, Openverse, Unsplash, Pexels, OpenMoji y SVG propios. Se guardan como WebP de unos 80 KB, con créditos en `data/credits.json`, `alt` en español sin la respuesta y caché por nivel.

### Test de nivel
Banco de unos 15 ítems por nivel (gramática generada, lectura, realia, mini-dictado y una autoevaluación con can-do). Es adaptativo: con 70 % o más sube de nivel, entre 50 % y 69 % ese nivel queda "en curso" y con menos de 50 % se detiene. Durante el test no hay feedback. Para que repetirlo no sea memorizar, la gramática es generada y las lecturas rotan entre 2 formas como mínimo. Devuelve un perfil por habilidad y siembra el mastery por tag. Se repite como **examen de salida** de cada nivel (simulacro con formato Goethe en lectura y escritura), que se aprueba con 60 % por módulo, como en Goethe.

### Detalles de iOS
- Meta tags de PWA y `apple-touch-icon`, safe-area, pantalla con las instrucciones de instalación.
- La voz solo arranca tras un toque y las voces cargan de forma asíncrona. Se explica cómo descargar la voz alemana mejorada en Ajustes del iPhone.
- Service worker con versión de caché y aviso de actualización.
- Safari puede borrar datos de sitios no instalados; instalada en la pantalla de inicio más `persist()` el riesgo baja, y el recordatorio de backup lo cubre.
- CORS de LanguageTool: verificar en la iteración 0. El plan B es un proxy gratuito con Cloudflare Worker. Nota: el texto que se corrige se envía a los servidores de LanguageTool.

---

## 4. Control de calidad del contenido
1. **Original:** se estudia el formato en las fuentes y se redacta uno nuevo; nunca se copia. Los textos auténticos solo vienen de fuentes con licencia libre o de dominio público, con atribución, y se respeta la licencia de cada artículo (§1, Prensa y revistas). Un solo `data/credits.json` para imágenes, textos y datos.
2. `validate.py`: esquema, ids existentes, `requires` sin ciclos, respuestas y alternativas presentes, imágenes y créditos. Rechaza textos sin campo `license` y textos ND con `modified: true`.
3. `lt_check.py`: todo el alemán que entra a la app debe dar **0 errores** en LanguageTool o tener una excepción justificada. Eso incluye enunciados (con el hueco relleno), textos, respuestas correctas, modelos, instancias de las plantillas (no la plantilla con huecos) y frases de Tatoeba. Los textos con ortografía anterior a 1996 (*daß*) llevan `orthography: pre1996`, excepción en LT y un aviso en la app. En la CI corre contra un LanguageTool propio en Docker, porque la API pública pide no mandar requests automatizados.
4. `tests/morph.test.js`: el conjunto de formas del motor coincide con Wiktionary en el 100 % del léxico.
5. **Revisión de cada ítem y plantilla escritos a mano (Claude, al crearlos):** se comprueba que la respuesta aceptada cumple la regla de la ficha, que **no existan otras respuestas correctas sin aceptar** (para que la app no marque como error algo válido) y que los distractores sean realmente incorrectos. Se contrasta con fuentes gratuitas consultables: Duden online, Wiktionary, DWDS y Lingolia. Al terminar, el ítem queda marcado `reviewed: true`. En los ítems generados, la misma garantía la da la regla de respuesta única (§3, generadores).
6. La CI corre `tools/check.sh` (pasos 2 a 4, más la verificación de que el JSON commiteado está al día) y bloquea el deploy si hay ítems o plantillas escritos a mano sin `reviewed: true`.
7. **Reporte desde la app:** cada ejercicio tiene un botón "⚑ Creo que esto está mal". Guarda el ítem y tu respuesta en una lista que se exporta en un archivo aparte (sin el progreso) y Claude la revisa en la iteración siguiente. El archivo nunca se commitea en el repo público. Mientras no se revisa, el ítem queda en cuarentena: su resultado no cuenta para el mastery.

---

## 5. Iteraciones (cada una termina publicada y probada en el iPhone)
| It. | Entrega |
|---|---|
| **0 — Esqueleto** | Repo con LICENSE (código MIT, datos CC-BY-SA), CI (`check.sh` con LanguageTool en Docker) y Pages; PWA instalable; router; store con export/import; prueba en el iPhone de instalación, offline, TTS alemán y CORS de LanguageTool. |
| **1 — Porción vertical** | `curriculum.json` (todos los niveles, con grafo), `morph.js` (artículos, presente) con tests de tablas propias, léxico mínimo a mano (~50 sustantivos A1), generador `articulo-caso`, tipos gap/choice/order/image-choice, `diagnose` + feedback "incorrecto → regla → siguiente" (sin solución ni reintento), mastery y scheduler básicos, sesión variable de 5/15/30 min (sin SRS ni audición), **A1 unidad 1 completa** (ficha, lectura, ejercicios, escritura corta con checklist y modelo, todavía sin LT). Ya se usa a diario. |
| **2 — Test de nivel + A1 u. 2–4** | Test adaptativo con banco A1–A2, dashboard, SRS de vocabulario (ts-fsrs), léxico A1 desde german-nouns y kaikki (desde acá los tests de morph son contra Wiktionary), glosario con estado de palabras al estilo Lute y divisor de compuestos. |
| **3 — A1 completo** | Unidades 5–12, hotspot (preposiciones con Akk y chunks de Dativ)/realia/odd-one-out, dictado TTS, reproductor YouTube, primeros videos A1, Perfekt en morph, biblioteca personal A (importar texto, glosario y estado de palabras). |
| **4 — Escritura + A2 (1.ª mitad)** | Módulo de escritura con LT y `lt-map`, picture-story y describe, declinación adjetival y Dativ en morph, examen de salida de A1. |
| **5 — A2 completo** | Generadores wechselpraep, verb-praeposition, konj2; examen de salida de A2. |
| **6–7 — B1** | Präteritum, Passiv y relativas en el generador, lecturas B1, simulacro Goethe B1. |
| **8–9 — B2** | Textos auténticos (Wikipedia, prensa CC, dominio público; verificar si Thomas Mann ya está en Wikisource-DE), Erörterung, `chart`, Konj. I, simulacro B2, biblioteca personal B (`tools/pack_text.py` e importación de paquetes). |
| **10–11 — C1** | Nominalización, Partizipialattribut, Funktionsverbgefüge, ensayo C1, literatura de dominio público, simulacro C1. |
| **Continuo** | Ajustes según los datos de uso: qué tags fallan más y qué tiempos reales lleva cada ejercicio. |

## 6. Verificación (en cada iteración)
- `tools/check.sh` en verde (build, validate, lt_check y tests); la CI también en verde.
- Local: `python3 -m http.server` (sin build previo, porque el JSON está commiteado) y navegador integrado en 375×812. Recorrer las vistas nuevas y responder bien y mal.
- Feedback: con una respuesta equivocada en un ítem cerrado se ve "Incorrecto", la regla, un ejemplo distinto y "Siguiente". **Nunca se ve la solución ni hay reintento.** El glosario y el ejemplo no revelan la forma evaluada.
- Scheduler (test automático, con RNG y reloj fijos): simular 30 respuestas con errores forzados en un par (tag, tipo). La frecuencia de ese par debe subir y bajar al acertar, sin repetir el mismo ítem en la sesión ni más de 2 seguidos del mismo tag. Un error diagnosticado en un prerrequisito debe penalizar ese prerrequisito (completo) y el tag del ítem (parcial). Un par dominado sigue apareciendo con el peso del piso.
- Tests de reglas: morph acepta todas las variantes; normalize no borra el rasgo del tag ortográfico; un ítem en cuarentena no cambia el mastery; `validate.py` rechaza un texto sin licencia y uno ND modificado.
- Biblioteca personal: un texto importado sobrevive a un export/import y no cambia el mastery. `git ls-files privado/` sale vacío y ningún archivo publicado en Pages contiene un texto de la biblioteca.
- iPhone: instalar desde la URL de Pages y probar modo avión, TTS, YouTube y LanguageTool. El progreso tiene que persistir al cerrar la app y sobrevivir a un export/import.

---

## 7. Reglas operativas
Resumen verificable de las reglas que ya están repartidas en el plan. Ante una duda, manda esta lista.

### Feedback y ayudas
1. **Ninguna ayuda revela lo que se evalúa.** Glosario, TTS, `alt`, ejemplo alternativo, color de terminaciones y hints ocultan la dimensión que mide el ítem actual.
2. **Cerrado vs abierto.** Ítems cerrados: nunca la solución, nunca reintento. Tareas abiertas (escritura, dictado, resumen): después de enviar se ve el modelo o el texto original, y reescribir es opcional.
3. **El diagnóstico nombra la regla, nunca la forma.** "*helfen* rige Dativ" vale; "dem" no.
4. **Cuarentena de reportes.** Un ítem marcado con ⚑ no cuenta para el mastery hasta que se revisa.
5. **LanguageTool → mastery con tope.** Solo cuentan las reglas mapeadas en `lt-map`, con a lo sumo una penalización por tag por texto.

### Scheduler y mastery
6. **Piso de mantenimiento:** `peso = base × max(0.1, 1 − mastery) × olvido`. Los errores recientes se cuentan una sola vez, dentro del mastery.
7. **Gating por grafo.** Un tag entra como nuevo recién cuando sus `requires` superan el umbral. Solo se samplean pares (tag, tipo) con ítems o generador.
8. **Prerrequisitos:** el tag diagnosticado recibe la penalización completa y el tag del ítem una parcial (×0.5). Sin datos del par se usa el tag; sin datos del tag, la semilla del test o 0.
9. **Determinismo:** RNG y reloj inyectables en `scheduler.js` y `mastery.js`.
10. **FSRS solo para vocabulario (lema).** Una tarjeta puede volver en la misma sesión, pero en otro formato (de→es, es→de, artículo, plural). "Conocida" tiene una sola definición: estado Lute 5 o estabilidad FSRS por encima de un umbral fijo.

### Respuestas y calidad
11. **Respuesta única o conjunto completo.** Las consignas generadas fijan la restricción; `order` acepta todos los órdenes V2 válidos; morph devuelve conjuntos de variantes.
12. **La normalización nunca borra el rasgo evaluado.** ß, umlaut, mayúscula y coma se exigen si el tag es ortográfico. En el resto se aceptan con aviso ("ojo: ß"). Los inputs van con autocapitalize y autocorrect apagados.
13. **Todo el alemán que publica la app pasa por el control de calidad** (la biblioteca personal A es la excepción, ver regla 21): ítems, plantillas (por instancias), Tatoeba y textos (con excepción marcada para la ortografía anterior a 1996).
14. **Test de nivel:** 50–69 % = nivel "en curso"; sin feedback durante el test; formas rotativas; el examen de salida aprueba con 60 % por módulo.

### Build, repo y licencias
15. **El JSON generado se commitea** y la CI falla si no está al día. Punto de entrada único: `tools/check.sh`.
16. **Dependencias:** ninguna en runtime (ts-fsrs vendorizado con su LICENSE). Las herramientas usan `tools/requirements.txt`. `build_lexicon.py` corre en local y su salida se commitea.
17. **Licencias:** código MIT y datos derivados de Wiktionary CC-BY-SA 4.0. La licencia de cada texto se registra por artículo.
18. **Contenido no libre** (DW, Easy German, audios Goethe, Lingolia, prensa sin CC, Hesse): en el repo solo enlace o embed, nunca rehost ni transcripción guardada. Para uso privado, la biblioteca personal (regla 21).
19. **Nada personal en el repo público:** ni progreso, ni reportes, ni textos de la biblioteca personal.

### Iteraciones
20. **Cada iteración usa solo lo que ya existe.** La sesión, los tipos de ejercicio y los tests se arman con los componentes entregados hasta esa iteración. En A1 el Dativ va como chunks; se vuelve productivo en A2.

### Biblioteca personal
21. **Lo privado vive en el dispositivo.** Los textos de uso privado solo entran por importación (A: archivo suelto, sin revisar, sin ítems cerrados ni efecto en el mastery; B: paquete revisado en la compu con LanguageTool local). Nunca se commitean, nunca se publican y nunca se mandan a la CI.
