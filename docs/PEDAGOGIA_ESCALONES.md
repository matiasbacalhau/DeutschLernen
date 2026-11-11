# Análisis Pedagógico y Fundamentación Cognitiva: Secuencia de Escalones de Aprendizaje

**Documento:** `docs/PEDAGOGIA_ESCALONES.md`  
**Proyecto:** DeutschLernen (A1–C1 Vanilla JS PWA)  
**Fecha:** 2026-11-10  
**Estado:** Aprobado / En implementación (Milestone 1)

---

## 1. Resumen Ejecutivo y Diagnóstico

El diseño curricular original de DeutschLernen estructuraba el progreso temático en una escalera de 5 escalones (o etapas de aprendizaje):
1. **Escalón 1:** Descubrir (*detective*, ficha inductiva, *choice*)
2. **Escalón 2:** Reconocer (*order*, *choice*, *spot-error* elemental)
3. **Escalón 3:** Producir guiado (*situation* dialógica, *transform* oracional, *gap* sintético con glosario temático)
4. **Escalón 4:** Detectar y usar (*reading* contextualizado, *spot-error* en mensajes auténticos, *translate*)
5. **Escalón 5:** Redactar (*writing-guided*, *writing-free* con LanguageTool)

Un análisis cognitivo, psicolingüístico y de adquisición de segundas lenguas (SLA) evidencia una inversión contraproducente en los escalones centrales (3 y 4): **"Producir guiado" impone una carga intrínseca, una demanda de memoria de evocación libre y un nivel de abstracción sintáctico-morfológica estrictamente superiores a los de "Detectar y usar"**.

Al ubicar "Producir guiado" en el Escalón 3, el alumno se veía forzado a sintetizar oraciones completas, reestructurar sintagmas respetando la regla del verbo en segunda posición (V2) y generar morfemas flexivos aislados *antes* de haber consolidado la percepción de dichos patrones en textos contextualizados extensos (*reading*) y antes de afinar la sensibilidad receptiva para discriminar desvíos en contexto comunicativo (*spot-error*).

**Decisión Pedagógica Adoptada:**  
Intercambiar el orden de los escalones 3 y 4. La progresión definitiva queda establecida como:
- **Stufe 1 — Entdecken (Descubrir):** Inducción guiada antes de la regla formal.
- **Stufe 2 — Erkennen (Reconocer):** Discriminación y ordenamiento de formas morfosintácticas elementales.
- **Stufe 3 — Im Kontext anwenden (Detectar y usar):** Comprensión contextualizada, detección de errores en textos verosímiles y traducción guiada.
- **Stufe 4 — Angeleitet produzieren (Producir guiado):** Producción dialógica guiada, transformación sintáctica activa y generación morfológica con apoyo de vocabulario temático (`field`).
- **Stufe 5 — Freies Schreiben (Redactar):** Composición comunicativa abierta, evaluada con LanguageTool y motor de reglas.

---

## 2. Marco Teórico y Dimensiones Cognitivas

### 2.1. Teoría de la Carga Cognitiva (Sweller, 1988; Paas, Renkl & Sweller, 2003)

La Teoría de la Carga Cognitiva clasifica las demandas mentales en:
- **Carga intrínseca:** inherente a la complejidad del material y al grado de interactividad de sus elementos.
- **Carga extrínseca:** originada por el diseño pedagógico y la presentación de la interfaz.
- **Carga germana:** esfuerzo cognitivo dirigido a la construcción y automatización de esquemas mentales.

El contraste entre las tipologías de ambos escalones evidencia una marcada asimetría en la carga intrínseca:

| Dimensión Cognitiva | Detectar y usar (Stufe 3) | Producir guiado (Stufe 4) |
|---|---|---|
| **Interactividad de elementos** | **Baja a moderada:** Los elementos sintácticos y léxicos ya están integrados en el texto fuente. El alumno procesa compatibilidades locales. | **Alta:** El alumno debe coordinar simultáneamente el lema, el género, el caso gramatical, la declinación del determinante y la posición del verbo conjugado (V2). |
| **Mecanismo de memoria primario** | **Reconocimiento con indicios (*Cued Recognition*):** La solución o el error están anclados en el estímulo visible. | **Evocación activa libre (*Active Recall*):** Requiere recuperar paradigmas flexivos de la memoria a largo plazo sin soporte textual directo. |
| **Operación sintáctica primaria** | **Decodificación / Monitoreo:** Evaluar cohesión y concordancia de un texto ya articulado (`reading`, `spot-error`). | **Reestructuración / Ensamblaje:** En `transform`, el alumno debe inhibir la oración fuente, sustituir un argumento y reordenar sintácticamente la cláusula. |
| **Saturación de memoria de trabajo** | **Baja:** El andamiaje contextual mantiene los significados en pantalla. | **Crítica:** Si el vocabulario o la flexión no están automatizados, se produce sobrecarga cognitiva (*cognitive overload*). |

Exigir `transform` y `situation` en el Escalón 3 genera un colapso prematuro en la memoria de trabajo del aprendiz de nivel inicial (A1), quien gasta sus recursos atencionales intentando recordar el lema o la flexión en vez de asimilar la regla estructural del tema.

---

### 2.2. Taxonomía Revisada de Bloom (Anderson & Krathwohl, 2001)

La taxonomía jerárquica de objetivos educativos postula que los procesos cognitivos inferiores proporcionan el andamiaje necesario para sustentar los procesos superiores:
1. Recordar (*Remember*)
2. Comprender (*Understand*)
3. Aplicar (*Apply*)
4. Analizar (*Analyze*)
5. Evaluar (*Evaluate*)
6. Crear / Sintetizar (*Create*)

Mapeo de los ejercicios de cada escalón en la taxonomía:

#### Tipologías de "Detectar y usar":
- `reading`: Niveles **Comprender** (interpretar, inferir, resumir) y **Aplicar** (seleccionar respuestas con base en el texto).
- `spot-error`: Niveles **Analizar** (discriminar partes del discurso, contrastar la forma con la norma gramatical) y **Aplicar** (corregir el token desviado).
- `translate`: Nivel **Aplicar** (transferir estructuras formuláicas familiares de L1 a L2 con restricciones fijas).

#### Tipologías de "Producir guiado":
- `situation`: Niveles **Aplicar** y **Crear/Sintetizar** (adoptar un rol comunicativo interactivo, evaluar la réplica del interlocutor, inferir la persona gramatical y formular la respuesta sintáctica apropiada).
- `transform`: Niveles **Analizar** y **Crear/Sintetizar** (descomponer la estructura proposicional original, aplicar una nueva restricción sintáctica y reconstruir una oración morfosintácticamente impecable respetando la posición V2).
- `gap`: Nivel **Aplicar** con generación morfológica activa.

**Conclusión taxonómica:**  
El análisis receptivo y la comprensión contextualizada (niveles 2 y 4 de Bloom) deben preceder lógicamente a la síntesis y transformación estructural activa (niveles 3 a 6). La secuencia original invertía esta jerarquía.

---

### 2.3. Teorías de Adquisición de Segundas Lenguas (SLA)

#### 1. Hipótesis del Input Comprensible ($i+1$) (Krashen, 1982, 1985)
Krashen demostró que los aprendices adquieren morfología gramatical de manera incidental y duradera cuando procesan input comprensible contextualizado. "Detectar y usar" sitúa al alumno ante textos verosímiles y comunicativos (un correo del hostel, una nota de convivencia en la cocina, una lista de compras), proporcionando el input indispensable para que el rasgo gramatical sea percibido en uso real antes de exigir producción forzada.

#### 2. Hipótesis de la Notoriedad (*Noticing Hypothesis*) (Schmidt, 1990, 2001)
Schmidt postuló que nada se convierte en *intake* (material lingüístico integrado en la interlengua) sin haber sido previamente objeto de atención consciente (*noticing*).
- Los ejercicios de `spot-error` y `reading` constituyen mecanismos directos de *noticing*: entrenan el ojo del alumno para detectar micro-variaciones (p. ej., terminaciones acusativas *-en*, alternancia *sein*/*bist*/*sind*) en textos continuos.
- Al aprender a "notar" estas formas en el input, el estudiante internaliza las condiciones de uso que luego necesitará recuperar en la producción.

#### 3. Teoría del Procesamiento del Input (*Input Processing*) (VanPatten, 2004)
El *Principio de Primacía del Significado* (*Primacy of Meaning Principle*) de VanPatten sostiene que los estudiantes procesan el input buscando significado antes que forma lingüística. Si se los confronta con producción sintáctica antes de haber comprendido el significado contextual de las formas, recurren a estrategias de traducción mecánica palabra por palabra. Colocar "Detectar y usar" antes de "Producir guiado" orienta al alumno a vincular significado y forma en un entorno discursivo auténtico.

#### 4. Hipótesis del Output Comprensible (*Pushed Output*) (Swain, 1985, 1995)
Swain argumentó que el output estimula el procesamiento sintáctico profundo al forzar al aprendiz a pasar de una comprensión semántica abierta a una codificación morfosintáctica rigurosa. Sin embargo, Swain enfatiza que la producción opera de modo óptimo como consolidación y refinamiento de formas previamente percibidas y contrastadas. "Producir guiado" funciona de manera ideal como el andamiaje inmediatamente previo a la redacción libre (Stufe 5), no como un salto prematuro tras la discriminación aislada de Stufe 2.

#### 5. Modelo de Producción del Habla de Levelt (1989)
La arquitectura de Levelt divide la producción lingüística en tres módulos sucesivos:
1. *Conceptualizador* (determina la intención comunicativa).
2. *Formulador* (selecciona el lema del léxico mental, asigna marcas diacríticas de caso/género/número y ejecuta la codificación fonológica/ortográfica).
3. *Articulador / Ensamblador Sintáctico* (aplica las reglas de orden oracional).

En "Producir guiado" (`situation`, `transform`), el aprendiz debe activar la cadena completa de Levelt en tiempo real bajo severas restricciones sintácticas alemanas. En "Detectar y usar", en cambio, el armazón oracional ya viene codificado por el hablante nativo; el alumno actúa como monitor y evaluador, reduciendo la fricción psicológica de la producción prematura.

---

## 3. La Nueva Escalera Curricular de 5 Escalones (Stufen)

A partir de este análisis, la secuencia canónica por tema en DeutschLernen se define de la siguiente manera:

| Stufe | Denominación Canónica (Alemán / Español) | Propósito Pedagógico y Cognitivo | Tipologías de Ejercicio Principales | Mínimo de Ítems Requerido |
|---|---|---|---|---|
| **Stufe 1** | **Entdecken**<br>(Descubrir) | Descubrimiento inductivo guiado del patrón o paradigma gramatical antes de la explicación teórica formal. | `detective`, ficha inductiva, `choice` inicial. | **10** |
| **Stufe 2** | **Erkennen**<br>(Reconocer) | Discriminación y reconocimiento formal de elementos sintácticos y morfológicos aislados. | `order` (orden V2/oracional), `choice` formal, `spot-error` elemental. | **14** |
| **Stufe 3** | **Im Kontext anwenden**<br>(Detectar y usar) | Comprensión lectora contextualizada en situaciones comunicativas auténticas, detección y corrección de desvíos en textos verosímiles, y traducción guiada. | `reading` (comprensión lectora con preguntas), `spot-error` contextual, `translate`. | **12** |
| **Stufe 4** | **Angeleitet produzieren**<br>(Producir guiado) | Producción sintáctica activa guiada, diálogos interactivos situacionales, transformaciones oracionales y completado de huecos con apoyo de vocabulario temático (`field`). | `situation` (diálogos situacionales interactivos), `transform` (reestructuración oracional), `gap` (morfología activa generada). | **14** |
| **Stufe 5** | **Freies Schreiben**<br>(Redactar) | Composición escrita comunicativa guiada y abierta, evaluada de forma determinista mediante LanguageTool y el motor pedagógico sin revelación de respuestas directas. | `writing-guided` (textos con consigna estructurada), `writing-free` (escritura abierta). | **3** escrituras (+ 4–6 de repaso) |

---

## 4. Implicancias en la Arquitectura de Software

La implementación de este cambio curricular requiere la actualización coordinada de las siguientes capas:

1. **Constantes de Validación y Progreso:**
   - La cantidad mínima de ítems efectivos se actualiza simétricamente:
     - `MINIMOS` (`tools/validate.py` y `tests/validate_test.py`): `{1: 10, 2: 14, 3: 12, 4: 14}`.
     - `MIN_ITEMS` (`js/core/progress.js`): `{1: 10, 2: 14, 3: 12, 4: 14, 5: 3}`.
2. **Desacoplamiento del Glosario y SRS:**
   - En la versión original, la apertura del glosario temático y la siembra de lemas en el sistema de repetición espaciada (SRS / FSRS) estaban fijadas de forma rígida al número de escalón (`n === 3`).
   - El motor se desacopla para responder a la presencia explícita de `stepDef.field`:
     - En `js/ui/grupo.js`: `if (stepDef.field) { fresh.glossary = pickGlossary(...) }`.
     - En `js/core/srs.js`: `seedSrs` itera dinámicamente buscando el escalón con `field` (`step.field`) y comprobando los intentos en dicho escalón.
3. **Packs de Contenido Curricular:**
   - En `content-src/a1/u01/*.yaml` (`t1-sein.yaml`, `t2-genus.yaml`, `t3-akkusativ.yaml`), se invierten los bloques de los escalones 3 y 4 con su respectiva renumeración (`n: 3` para "Detectar y usar", `n: 4` para "Producir guiado").
   - El atributo `field` (`hostel`, `kueche`, `essen`) y los generadores morfológicos se mantienen asociados al escalón de producción guiada (ahora Stufe 4).
   - Se conservan intactos los identificadores de ejercicio originales para asegurar compatibilidad retroactiva absoluta con el almacenamiento de los usuarios y las suites de prueba.
4. **Inmersión Lingüística (R2):**
   - La terminología estructural en la interfaz pasa de "Escalón" a **"Stufe"**, consolidando el criterio de inmersión sin fricción documentado en el proyecto.

---

## 5. Referencias Bibliográficas

- **Anderson, L. W., & Krathwohl, D. R. (Eds.). (2001).** *A taxonomy for learning, teaching, and assessing: A revision of Bloom's taxonomy of educational objectives.* New York: Longman.
- **Krashen, S. D. (1982).** *Principles and Practice in Second Language Acquisition.* Oxford: Pergamon.
- **Krashen, S. D. (1985).** *The Input Hypothesis: Issues and Implications.* New York: Longman.
- **Levelt, W. J. M. (1989).** *Speaking: From Intention to Articulation.* Cambridge, MA: MIT Press.
- **Paas, F., Renkl, A., & Sweller, J. (2003).** Cognitive load theory and instructional design: Recent developments. *Educational Psychologist*, 38(1), 1-4.
- **Schmidt, R. (1990).** The role of consciousness in second language learning. *Applied Linguistics*, 11(2), 129-158.
- **Schmidt, R. (2001).** Attention. In P. Robinson (Ed.), *Cognition and second language instruction* (pp. 3-32). Cambridge: Cambridge University Press.
- **Swain, M. (1985).** Communicative competence: Some roles of comprehensible input and comprehensible output in its development. In S. Gass & C. Madden (Eds.), *Input in second language acquisition* (pp. 235-253). Rowley, MA: Newbury House.
- **Swain, M. (1995).** Three functions of output in second language learning. In G. Cook & B. Seidlhofer (Eds.), *Principle and practice in applied linguistics* (pp. 125-144). Oxford: Oxford University Press.
- **Sweller, J. (1988).** Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257-285.
- **VanPatten, B. (2004).** *Processing Instruction: Theory, Research, and Commentary.* Mahwah, NJ: Lawrence Erlbaum Associates.
