# Iteración 1: porción vertical A1 u. 1 — diseño

Fecha: 2026-10-30. Sale del brainstorming con el usuario.

- Complementa `docs/PLAN.md`. Cuando este documento cambia algo del plan, lo dice explícitamente.
- Al implementarlo, también se actualiza `docs/PLAN.md`.

Marcas:
- **[usuario]**: lo decidió el usuario.
- **[mi decisión]**: lo decidí yo; el usuario puede cambiarlo al revisar.

## 1. Intención

El usuario hizo B1 hace tiempo y olvidó mucho. Usa la app en el iPhone en tiempos muertos (en casa, en el transporte, en salas
de espera) **[usuario]**.

Una sesión valió la pena si al cerrarla piensa "claro, tiene sentido que sea así" o "qué buena onda". Para eso:
- las explicaciones tienen que ser lógicas y agradables **[usuario]**;
- los ejercicios no pueden sentirse mecánicos **[usuario]**.

**Un tema se aprende subiendo una escalera** **[usuario]**: el mismo tema vuelve varias veces, cada vez más difícil y con otros
tipos de ejercicio, desde descubrir la regla hasta escribir libremente. Nueve respuestas sueltas no alcanzan para aprender algo.

La iteración 1 es **chica a propósito**: tres temas con la escalera completa, para usarla de verdad y sacar conclusiones del uso
antes de crecer **[usuario]**.
- El test de nivel A1–A2 queda para la iteración 2, como en el plan **[usuario]**.
- Que A1 le resulte fácil al usuario es aceptable: lo que se prueba es el formato.

La app se va a ir cambiando con el uso, así que se pueden probar formas nuevas de ejercitar **[usuario]**.

## 2. Objetivos, no-objetivos y anti-objetivos

**Objetivos**
- Se puede usar a diario en el iPhone, offline, desde el primer día.
- Tres temas de A1 u. 1 con su escalera completa de 5 escalones. Cada escalón es un grupo de 10 a 20 minutos.
- Hay una lectura corta con preguntas **[usuario]**.
- Hay un glosario en el escalón de producción guiada, armado con la mezcla 30/40/30 **[usuario]** (ver §5.4).
- Las escrituras se corrigen con LanguageTool **[usuario]** (ver §5.5).
- Ante un error, el feedback es "incorrecto → regla → ejemplo distinto → siguiente", sin la solución.
- Mastery y scheduler básicos deciden el siguiente grupo sugerido y el repaso dentro de los grupos.
- La identidad visual es A1, "cuaderno sereno" **[usuario]**.
- Queda un registro de uso local y exportable, para sacar conclusiones.

**No-objetivos (en esta iteración)**
- No entran: test de nivel, SRS de vocabulario, audición, léxico desde Wiktionary, glosario al
  tocar palabras con estados al estilo Lute, ni biblioteca personal. Cada uno llega en la iteración que fija el plan.
- No hay otros niveles ni unidades. El mapa muestra los temas de A1; los que no tienen contenido aparecen como "próximamente" y no
  se abren **[mi decisión]**.

**Anti-objetivos (fracasos aunque la app funcione)**
- Que se sienta como un formulario de huecos sueltos, sin situación.
- Que la app controle el tiempo: nada de cronómetros, metas de minutos ni "te quedan 3 minutos" **[usuario]**.
- Que un grupo dure más de 20 minutos **[usuario]**.
- Que muestre la solución de un ítem cerrado **[usuario]**.
- Que se pierda el progreso si se interrumpe en medio de un grupo.
- Explicaciones secas, solo con la tabla y sin el porqué.

## 3. Cambios respecto de `docs/PLAN.md`

1. **Ya no hay sesión de duración elegida (5/15/30/45 min)** **[usuario]**.
   - La unidad de uso es el **grupo**: un escalón de la escalera de un tema, de 10 a 20 minutos, con repaso intercalado.
   - Al terminar un grupo, la app sugiere el siguiente y hay un mapa de temas para elegir otro **[usuario]**.
   - Esto reemplaza en el plan §3 "Sesión diaria de duración variable" y la sesión de 5/15/30 min de la iteración 1 en §5.
2. **Escalera por tema** **[usuario]**: ver §5.3. Es nuevo en el plan.
3. **Tipos de ejercicio de la iteración 1** (detalle en §5.5):
   - `detective`, `order`, `choice`, `situation`, `transform`, `translate`, `spot-error`, `reading`, `writing-guided`,
     `writing-free` y `gap` generado.
   - Salen `image-choice` y `match` **[mi decisión]**.
4. **Feedback de acierto:** "Bien" y, a veces, un dato curioso **[usuario]**.
5. **Grupo superado:** con el 80 % de aciertos o más **[usuario: por porcentaje; 80 % es mi decisión]**.
6. **La corrección de escritura con LanguageTool se adelanta de la iteración 4 a la 1** **[usuario]**. Esto incluye `lt-map`
   para los tags de los 3 temas y para los errores frecuentes de ortografía y de A1 que aparecen fuera del tema, y la cola
   offline. Un error sin entrada en `lt-map` muestra la categoría de LanguageTool traducida al español, no el nombre ni el
   mensaje de la regla, porque esos revelan la forma **[usuario]**.
   La iteración 4 se queda con picture-story, describe y el resto de su lista.
7. **Glosario 30/40/30** en la producción guiada **[usuario]**. Pide más datos por palabra (campo semántico y frecuencia), así que
   el léxico a mano pasa de unos 50 sustantivos a unas 150 palabras **[mi decisión]**.
8. **Sigue igual que en el plan:**
   - `curriculum.json` con todos los niveles y su grafo.
   - `morph.js` con artículos y presente.
   - el generador `articulo-caso`;
   - el botón ⚑ con cuarentena (regla 4) **[mi decisión: se mantiene]**.

## 4. Didáctica (del cuestionario)

| Tema | Decisión |
|---|---|
| Punto de partida | B1 olvidado. Compara con inglés y portugués. **[usuario]** |
| Regla nueva | Según el tema: se descubre con ejemplos si el patrón es deducible; se da directa si es arbitraria (géneros). **[usuario]** |
| Terminología | En alemán con aclaración: "Akkusativ (objeto directo)". **[usuario]** |
| El porqué | Comparación con inglés y portugués, historia de la palabra, tablas para ver el patrón. **[usuario]** |
| Ficha | Corta (una pantalla) y "ver más" con detalle, excepciones y porqué. **[usuario]** |
| Tono | Con humor, en las explicaciones y en las frases; ningún chiste tapa la regla. **[usuario]** |
| Ejercicios | Variados, de mecánicos a creativos; lo mecánico siempre dentro de una situación. **[usuario]** |
| Escribir vs. tocar | Mayormente escribir, con teclas ä ö ü ß a mano. **[usuario]** |
| Error | Incorrecto → regla → ejemplo distinto → siguiente. Nunca la solución ni un reintento. **[usuario]** |
| Acierto | "Bien" y a veces un dato curioso. **[usuario]** |
| Grupo | Tema y repaso mezclados; la app sugiere el siguiente; se supera por porcentaje; dura de 10 a 20 min. **[usuario]** |
| Progreso | Mapa de temas: nuevo, en curso, dominado o para reforzar. Sin racha ni contadores. **[usuario]** |

## 5. Comportamiento

### 5.1 Inicio

- Un saludo en serif: "Guten Morgen", "Guten Tag" o "Guten Abend" según la hora.
  - Debajo, una línea con humor sacada del estado real, por ejemplo "El Akkusativ te viene esquivando".
  - El nombre del usuario se pide una vez en Ajustes **[mi decisión]**.
- Una tarjeta "Siguiente grupo" con el tema, el escalón, la escena y el botón **Empezar**.
  - Si hay un grupo a medias, el botón dice **Seguir** y lo retoma.
- El mapa de temas de A1 con el estado de cada tema.

### 5.2 Ítem

Un **ítem** es una respuesta que la app corrige como bien o mal **[mi decisión]**. Es lo que cuentan el porcentaje del grupo, el
mastery y el registro de uso.

- Un ejercicio (una pantalla) puede tener varios ítems: una situación con 2 huecos son 2 ítems.
- Cada ítem tiene un tag fino (por ejemplo `a1.akk.mask`) y su respuesta, o el conjunto completo de respuestas válidas (regla 11).
- Una escritura (`writing-guided` o `writing-free`) se corrige y cuenta como **1 ítem** para el tema del escalón **[mi decisión]**.
  - Es correcta solo si no tiene **ningún** error de gramática, ortografía o puntuación, sea o no del tema **[usuario]**.
    Así un error de otro tema no pasa sin consecuencia justo donde más se escribe.
  - Las sugerencias de estilo de LanguageTool (categorías de estilo y tipografía) se muestran como aviso, pero no hacen
    incorrecta la escritura **[mi decisión]**.
  - Cada error baja además el mastery de su propio tag, como mucho una vez por tag por texto (regla 5).
  - **Error sin entrada en `lt-map`** **[usuario]**:
    - Cuenta para la escritura (la deja incorrecta), pero no toca el mastery, porque la app no sabe a qué tag pertenece.
    - Se subraya la palabra y se muestra la **categoría** de LanguageTool traducida al español (por ejemplo
      *Leicht zu verwechselnde Wörter* → "palabras fáciles de confundir"). Las categorías son pocas y se traducen una vez.
    - Nunca se muestran el nombre ni el mensaje de la regla: verificado contra el LanguageTool local, en
      *Ich glaube, das er morgen kommt.* el nombre es *'das' anstatt 'dass'* y el mensaje *Meinten Sie „dass"?*; los dos
      revelan la forma (regla 3).
    - Se guarda en el registro de uso con el id de la regla, para sumar a `lt-map` las que más se repiten.

### 5.3 La escalera de un tema

Cada tema tiene 5 escalones. Cada escalón es un **grupo fijo con nombre y escena** **[usuario]**, de 10 a 20 minutos y nunca más
de 20 **[usuario]**. Los tipos de ejercicio salen de la propuesta del usuario y de la mía:

| Escalón | Para qué | Tipos | Ítems |
|---|---|---|---|
| 1. Descubrir | Ver el patrón antes de la regla | `detective`, después la ficha, `choice` | 10–12 |
| 2. Reconocer | Distinguir lo correcto | `order`, `choice`, `spot-error` fácil | 14–18 |
| 3. Producir guiado | Producir con apoyo | `situation`, `transform`, `gap`, con glosario 30/40/30 | 14–18 |
| 4. Detectar y usar | Usarlo en contexto | `spot-error`, `translate`, `reading` | 12–16 |
| 5. Redactar | Escribir algo propio | `writing-guided` (2 consignas), `writing-free` (1) y 4–6 ítems de repaso | 3 escrituras + 4–6 |

- Si el tema es arbitrario (por ejemplo los géneros), el escalón 1 abre con la ficha en lugar del `detective` **[usuario: "según
  el tema"]**.
- Las cantidades de ítems son un punto de partida **[mi decisión]**. El registro de uso (§8) mide el tiempo real y con eso se
  ajustan para que cada grupo quede entre 10 y 20 minutos.
- Cerca del 20 % de los ítems de los escalones 2 a 4 son de repaso de tags débiles de otros temas **[mi decisión]**. Esos ítems
  mueven el mastery, pero **no cuentan para el porcentaje** del grupo.
- **Superar un escalón:**
  - En los escalones 1 a 4 hace falta el 80 % o más de los ítems del tema.
  - El escalón 5 se supera con al menos 2 de sus 3 escrituras correctas, es decir sin ningún error **[mi decisión]**.
- Si un escalón queda por debajo del 80 %, queda "para reforzar".
  - Cuando vuelve, es la misma escena con ítems no vistos.
  - Cada banco tiene alrededor de un 30 % de reserva, más los `gap` generados.
  - Si la reserva se agota, vuelven ítems vistos en otra sesión.
- **Siguiente grupo sugerido** **[mi decisión]**:
  1. Primero el escalón "para reforzar" más viejo.
  2. Si no hay, el siguiente escalón no superado del tema en curso.
  3. Si el tema está terminado, el escalón 1 del tema siguiente.
  - Desde el mapa se puede abrir cualquier escalón sin bloqueo, porque el usuario ya tuvo B1.
  - El gating por `requires` (regla 7) aplica solo a lo que elige el scheduler.
- La ficha se muestra la primera vez dentro del escalón 1 (o al principio, si el tema es arbitrario). Después queda accesible
  desde el feedback y desde el mapa.
- **Autoguardado** después de cada respuesta. Si se cierra la app, se retoma en el mismo ejercicio. Se puede salir con ✕ sin
  confirmar.

### 5.4 Glosario 30/40/30 (escalón 3) [usuario]

Antes de los ejercicios del escalón 3 aparece un glosario de unas 10 palabras, que después queda a mano en un botón:

- **30 % ya vistas e importantes:** palabras que aparecieron en ítems anteriores y que conviene fijar por su frecuencia de uso.
- **40 % nuevas y cercanas a esas:** del mismo campo semántico. Ejemplo del usuario para "restaurante": aperitivo, cena, almuerzo,
  cubiertos, cita, vino, carta, cuenta.
- **30 % nuevas del nivel:** palabras A1 de frecuencia alta que todavía no aparecieron.

Cómo funciona:

- Cada palabra muestra el lema con su artículo, el plural y la traducción.
- Para las palabras "ya vistas", la app consulta el registro de uso: una palabra está vista si apareció en un ítem respondido.
  Si todavía no hay suficientes, completa con palabras nuevas **[mi decisión]**.
- Por la regla 1, el glosario oculta la dimensión que evalúa el escalón. En el tema de géneros no muestra el artículo de las
  palabras que se preguntan **[mi decisión, aplica la regla 1]**.
- Las palabras del glosario aparecen en los ejercicios del escalón: el glosario sirve para usarse ahí mismo.
- Cada palabra del léxico lleva estos datos: lema, artículo, plural, traducción, campo semántico, frecuencia aproximada (rango
  A1) y nivel **[mi decisión]**.

### 5.5 Tipos de ejercicio

- **`detective`** (propuesta mía):
  - Muestra de 5 a 6 frases de una escena con el rasgo resaltado, por ejemplo *ein*/*einen*.
  - Primero se pregunta "¿qué cambia y cuándo?" con 3 o 4 reglas posibles en `choice`.
  - Después se aplica la regla elegida a 2 o 3 frases nuevas, escritas.
  - Si se elige la regla incorrecta, aparece la ficha.
- **`order`:** se ordenan bloques (chunks, no letras) tocándolos. Se aceptan todos los órdenes V2 válidos (regla 11). Es la
  excepción a "mayormente escribir" que pidió el usuario.
- **`choice`:** para distinguir significado o elegir la frase que suena bien. Como mucho 3 por grupo **[mi decisión]**.
- **`situation`:** una escena con título y contexto con humor (por ejemplo "In der Bäckerei · 7:40 · con hambre") y un chat de 2 a
  6 burbujas. Una o dos burbujas propias tienen huecos escritos.
- **`transform`** (propuesta mía): una frase y una sola instrucción ("ahora con *er*", "ahora con *ein*", "ahora negá con *kein*").
  Se escribe la frase completa.
- **`translate`** (propuesta mía): traducción inversa corta, del español o del inglés al alemán, de frases que son trampa para un
  hispanohablante. Acepta el conjunto completo de traducciones válidas, escrito a mano y verificado (regla 11).
- **`spot-error`:** un mensaje corto con exactamente un error.
  - Es correcto solo si se toca la palabra equivocada y además se escribe bien su corrección.
  - Si se toca una palabra que está bien, se muestra "Incorrecto: esa palabra está bien" y el nombre del tema, sin la regla puntual
    ni un ejemplo, para no delatar el error. Es una excepción declarada a §5.6.
  - En todos los casos penaliza el tag del ítem.
- **`reading`:** un texto A1 de 60 a 100 palabras con 3 a 5 preguntas de respuesta escrita corta o `choice`.
  - No tiene glosario al tocar (eso llega en la iteración 2).
  - El tema 1 usa el email del hostel con las reglas de la casa **[usuario: lectura corta; el texto es mi decisión]**.
- **`writing-guided`:** una consigna con restricciones y tips, por ejemplo "respondé el mensaje usando 2 sustantivos masculinos en
  Akkusativ y *möchten*".
  - Al enviar, LanguageTool corrige el texto **[usuario]**:
    - Se subraya cada error y debajo se muestra la regla en español, sacada de `lt-map`.
    - Las sugerencias de reemplazo de LanguageTool se ocultan, así se respeta la regla 3: se nombra la regla, nunca la forma.
    - Ejemplo del usuario, verificado contra el LanguageTool local: en *Ich habe zum Schule gegangen.* se marcan *habe*
      ("*gehen* es un verbo de movimiento: Perfekt con *sein*") y *zum* ("*Schule* es femenino: la contracción es otra").
  - Después se tilda el checklist de lo que LanguageTool no ve (si cumplió la consigna, la coherencia) y se muestra el modelo
    (regla 2). Reescribir es opcional y la reescritura se vuelve a corregir, pero no cambia el ítem.
  - **Sin red** (subte, hospital): el texto queda guardado y "pendiente de corrección", y el grupo sigue. Se corrige solo
    cuando vuelve la red, el resultado aparece en el inicio y recién ahí cuenta para el escalón **[mi decisión]**.
  - **Límite honesto:** LanguageTool encuentra gramática y ortografía, pero se le escapan errores de sentido y de estilo, y a
    veces algún error gramatical. Una escritura sin marcas no garantiza que esté perfecta.
  - Se usa la API pública de LanguageTool, que es la que eligió el plan para lo que escribe el usuario.
- **`writing-free`:** una consigna abierta del tema, con la misma corrección, el mismo checklist y el mismo modelo.
- **`gap`:** una frase generada por `articulo-caso`, siempre con un micro-contexto de una línea.

### 5.6 Feedback

- **Error:** etiqueta roja "Incorrecto"; la regla en una o dos frases, que nombra la regla y nunca la forma (regla 3); un ejemplo
  distinto en la dimensión evaluada; "ver ficha"; y el botón **Siguiente**.
- **Acierto:** "Bien". Más o menos en 1 de cada 4 aciertos se suma un dato curioso en serif verde, si existe para ese ítem o tag
  **[mi decisión de frecuencia]**.
- **Normalización (regla 12):** ß, umlaut y mayúsculas se exigen solo si el tag es ortográfico. En los demás casos se aceptan con
  un aviso. Los inputs van con `autocapitalize="off"`, `autocorrect="off"` y `spellcheck="false"`.

### 5.7 Fin de grupo

- El porcentaje de aciertos, si el grupo quedó superado o para reforzar, y la lista de reglas falladas por nombre, sin soluciones.
- El botón del siguiente grupo sugerido y otro para volver al inicio.

### 5.8 Mapa de temas

- Los temas de A1 con su estado: nuevo, en curso, dominado, para reforzar o próximamente.
- Al tocar un tema se ven su ficha y sus 5 escalones, cada uno con su estado.
- Un tema está "dominado" cuando sus 5 escalones están superados y el mastery mínimo de sus tags es 0.8 o más.
- Un tema está "para reforzar" si algún escalón quedó por debajo del 80 % en su último intento o si alguno de sus tags bajó de 0.5
  **[mi decisión de umbrales]**.

## 6. Contenido: A1 unidad 1 "Ankommen" (3 temas) [usuario: 3 temas; cuáles, mi decisión]

| Tema | Escenas (una por escalón) |
|---|---|
| 1. **Personalpronomen + sein + W-Fragen** | Llegada al hostel, recepción, compañeros de cuarto, email del hostel (lectura) y presentarse en el grupo de WhatsApp del hostel |
| 2. **Artikel und Genus (Nominativ)** | Inventario del departamento nuevo, mudanza, cocina compartida, aviso del dueño y carta a un amigo sobre el departamento |
| 3. **Akkusativ con haben, möchten y brauchen** | Panadería, súper, kiosco, lista de compras del compañero y pedido para una cena |

- El presente regular y V2 pasan a la unidad 2 **[mi decisión]**. Igual aparecen como chunks en los ejemplos.
- Volumen aproximado:
  - 3 temas × 5 escalones × unos 15 ítems, más un 30 % de reserva: unos **200–250 ítems escritos a mano**.
  - 3 fichas, unas 15 escenas, 9 escrituras con su modelo y unas 150 palabras de léxico.
- Todo el alemán pasa por `tools/check.sh` (LanguageTool en Docker) y por revisión (regla 13).

## 7. Identidad visual: A1 "cuaderno sereno" [usuario]

Viene de taste-skill, estilo "editorial greeting", con la maqueta aprobada en el brainstorming.

- **Tokens:**
  - `--ground #ffffff` y `--surface #f3f1ea` (papel piedra).
  - `--text #1f201d` y `--muted #636361`.
  - `--accent #1b6e66` (verde petróleo, menos del 2 % de la pantalla) y `--accent-tint #e3efed`.
  - `--negative #b42318` sobre `#fdecea`, solo para el error.
- **Tipografía:** Instrument Serif para el saludo y los datos curiosos; Instrument Sans (400/500/600) para todo lo demás.
  - Las dos se sirven desde la app en woff2 (licencia OFL) y el service worker las precachea, porque la app tiene que andar offline
    **[mi decisión]**.
- **Forma:** tarjetas con radio de 22 px, controles en píldora, sin sombras ni gradientes; márgenes de 16 px; botones de 44 px de
  alto como mínimo.
- **Chat:**
  - Burbujas ajenas en papel piedra y propias en verde pálido.
  - El hueco va subrayado y se pone rojo si está mal.
  - Los chunks de `order` son píldoras en papel piedra.
- **Modo oscuro:** tokens derivados con la misma lógica, que se revisan en el iPhone **[mi decisión]**.
- Reemplaza el estilo provisorio (azul marino y amarillo) de la iteración 0.
- Antes de la prueba en el iPhone se revisa con web-design-guidelines.

## 8. Registro de uso

- Por cada respuesta se guardan el ítem, el tag, el tipo, si fue correcta, el diagnóstico, cuánto tardó y la fecha.
- Por cada grupo se guardan el inicio, el fin, si se abandonó y la duración.
- Por cada error de escritura se guardan el id de la regla de LanguageTool y si tenía entrada en `lt-map`.
- Por cada palabra se guardan sus apariciones en ítems respondidos, que el glosario usa para las "ya vistas".
- Todo queda en IndexedDB, solo en el iPhone, y sale con el export de backup que ya existe. Nunca va al repo (regla 19).
  - Cada respuesta ocupa unos 100 bytes.
  - Importar un backup también reemplaza el registro **[mi decisión]**.
- Después de una o dos semanas de uso se exportan los datos y se miran juntos. Con eso se ajustan:
  - las cantidades de ítems por escalón, para que cada grupo dure de 10 a 20 minutos;
  - los umbrales;
  - los tipos de ejercicio;
  - las entradas nuevas de `lt-map`, empezando por los errores sin mapa más repetidos.

## 9. Lo que queda para quien construye

- La arquitectura sigue `docs/PLAN.md` §3:
  - checks puros en `js/core/checks/`;
  - UI en `js/exercises/`;
  - TDD en `js/core`;
  - YAML a JSON commiteado;
  - `tools/check.sh` como entrada única.
- El formato exacto del YAML de temas, escalones, ítems, fichas y léxico.
- La redacción de las fichas, las escenas y los ítems, siguiendo §4 a §6.
