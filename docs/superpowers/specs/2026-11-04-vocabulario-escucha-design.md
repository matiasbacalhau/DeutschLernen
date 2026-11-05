# Iteración 2: vocabulario + escucha — diseño

Fecha: 2026-11-04. Sale del brainstorming con el usuario, después de la auditoría con su backup del 3/11.

- Complementa `docs/PLAN.md` y el diseño de la iteración 1 (`2026-10-30-iteracion-1-design.md`). Cuando este documento cambia
  algo del plan, lo dice explícitamente.
- Al implementarlo, también se actualiza `docs/PLAN.md`.

Marcas:
- **[usuario]**: lo decidió el usuario.
- **[mi decisión]**: lo decidí yo; el usuario puede cambiarlo al revisar.

## 1. Intención

El usuario abre la app en tiempos muertos (casa, transporte público, salas de espera), de 10 a 20 minutos, y usa auriculares
**[usuario]**. Las sesiones se cortan sin aviso.

Hoy la app tiene un hueco grande: el glosario del escalón 3 presenta palabras y después ningún ejercicio las pide. Se olvidan.
Esta iteración hace dos cosas, con el mismo peso **[usuario]**:

1. **Que las palabras no se olviden.** Una repetición espaciada (SRS) por palabra, con imagen y audio.
2. **Que se entienda el alemán hablado.** Ejercicios de escucha con la voz del sistema (TTS).

**El vocabulario es parte del recorrido, no una sección aparte** **[usuario]**. No hay un modo "repasar palabras" que se olvida
cuando se pasa a la gramática o a la escucha: las tarjetas aparecen dentro de los grupos, y las palabras que se están aprendiendo
vuelven en los huecos generados, en los dictados y en las situaciones.

**Una palabra no está "aprendida" o "no aprendida": sube una escalera** **[usuario]**. Leerla es lo más básico; escribirla con el
artículo declinado como corresponde es más difícil; y escucharla es una dificultad mayor dentro de cada nivel.

**La app no penaliza por no poder escuchar** **[usuario]**.

## 2. Objetivos, no-objetivos y anti-objetivos

**Objetivos**
- SRS de vocabulario con la escalera de §4, un estado FSRS por lema, tarjetas intercaladas en los grupos.
- Imágenes de un solo objeto (OpenMoji) en las tarjetas y en el glosario, para las palabras concretas.
- Dictado y situaciones en modo escucha.
- Botón "Ahora no puedo escuchar" en todo ejercicio con audio.
- Al acertar un ítem cerrado de frase, se puede escuchar la frase completa.

**No-objetivos (en esta iteración)**
- Test de nivel y A1 u. 2–4: pasan a la iteración siguiente (§3).
- Audio real (DW, YouTube), reconocimiento de voz, estado de palabras al estilo Lute, glosario al tocar palabras.
- Grupos más cortos y color por género en el glosario: se evalúan después, con datos.
- Convertir el contador de palabras vistas (`words`) en estado de SRS: la SRS arranca de cero **[mi decisión]**.

**Anti-objetivos (fracasos aunque funcione)**
- Que el vocabulario se sienta como una sección aparte o como un mazo de tarjetas suelto **[usuario]**.
- Que no poder escuchar baje el puntaje, el mastery o la SRS **[usuario]**.
- Que una tarjeta o una ayuda revele lo que evalúa otro ítem del mismo grupo (regla 1 del plan).
- Que una imagen confusa o forzada acompañe una palabra: sin imagen buena, va sin imagen.
- Que un grupo pase de 20 minutos por sumar tarjetas.

## 3. Cambios respecto de `docs/PLAN.md`

1. **Nueva iteración 2: "vocabulario + escucha"** (este documento). La iteración 2 del plan (test de nivel, A1 u. 2–4, léxico
   desde german-nouns y kaikki, estado Lute, divisor de compuestos) pasa a ser la 3, y las siguientes se corren un número.
2. **Se adelantan** de la vieja iteración 2 la SRS (ts-fsrs, vendorizado con su LICENSE), y de la vieja iteración 3 el dictado
   con TTS y las imágenes (solo OpenMoji y solo para vocabulario; `image-choice`, `hotspot`, realia, etc. siguen donde estaban).
3. **Regla 10 del plan (FSRS solo para vocabulario):** se mantiene, con una precisión. "Conocida" se define acá como **haber
   llegado al nivel 3 de la escalera** (§4), en lugar de "estabilidad FSRS por encima de un umbral" **[mi decisión]**.
4. **Las palabras entran a la SRS al aparecer en un glosario** (§5.1), no al estudiarlas aparte.

## 4. La escalera de una palabra [usuario: los niveles; mi decisión: la mecánica]

| Nivel | Leyendo | Escuchando (más difícil) |
|---|---|---|
| 1. Reconocer | Ves *der Schlüssel* (con imagen si hay) y elegís el significado entre 4 | La oís y elegís el significado entre 4 |
| 2. Producir con artículo | Ves la imagen (o "llave" si no hay) y escribís *der Schlüssel* | La oís y la escribís con artículo |
| 3. Usar en contexto | Hueco con el artículo declinado: *Ich brauche ___ Schlüssel* | Dictado de una frase corta que la contiene |

**Estado por lema:** una tarjeta FSRS (ts-fsrs, retención pedida 0.9 por defecto) más el nivel actual (`rung`, 1–3). Un solo
estado por palabra, no uno por formato **[mi decisión]**.

**Cómo se sube y se baja** **[mi decisión]**:
- Acierto → FSRS `Good`. Si después del repaso la estabilidad pasa el umbral del nivel, sube un nivel. Umbrales de partida:
  4 días para pasar de 1 a 2 y 10 días para pasar de 2 a 3 (ajustables con datos).
- Error → FSRS `Again` y baja un nivel (mínimo 1). No vuelve al principio.
- Dentro de un nivel, la variante de escucha se habilita después de un acierto leyendo en ese nivel; desde ahí, leyendo y
  escuchando se alternan. Si el audio no está disponible o el usuario lo pidió (§6.3), sale la variante de lectura.

**Verbos** (18 de 189 lemas): en el nivel 2 se escribe el infinitivo. El nivel 3 de un verbo es completar la forma conjugada en
contexto (`present()` de `morph.js`) y solo se habilita cuando el tag `a1.praesens.regular` está desbloqueado; hasta entonces un
verbo se queda en el nivel 2 y cuenta como conocido al tener estabilidad ≥ 10 días en el nivel 2 **[mi decisión]**.

**Sustantivos en el nivel 3:** usa los generadores existentes. El de artículos (`articulo-caso`) se usa si alguna plantilla tiene
lugar para el lema; si no, una plantilla genérica en *Nominativ* que sirve para cualquier sustantivo (por ejemplo, *Hier ist ___
{noun}.* con artículo definido o indefinido según la consigna), que cuenta para el tag `a1.nom.<género>` del lema y solo se usa
cuando ese tag está desbloqueado **[mi decisión]**. Las plantillas de *Akkusativ* solo cuando los tags `a1.akk.*`
están desbloqueados (gating del grafo, regla 7). Un acierto o error en el nivel 3 cuenta para la SRS **y** para el mastery del
tag de gramática, porque es el mismo hueco generado de siempre.

**Conocida** = llegó al nivel 3 (o, para verbos sin nivel 3 habilitado, la regla de arriba).

## 5. Vocabulario dentro del recorrido

### 5.1 Cuándo entra una palabra
Cuando el glosario del escalón 3 la muestra, entra a la SRS con estado nuevo (nivel 1), automáticamente **[usuario: de acuerdo]**.
Las demás palabras del léxico no entran solas.

**Carga inicial, una sola vez** **[usuario]**: el glosario no se guardaba, así que lo ya hecho no dejó registro. Al actualizar, por
cada tema cuyo escalón 3 ya tiene un intento, entran a la SRS en nivel 1 los lemas del campo (`field`) de ese escalón. Para el
usuario real son los 30 del campo `hostel` (tema 1). Entran como nuevas y salen de a 2 o 3 por grupo, como cualquier tarjeta.
Una marca en el store (`meta.srsSeeded`) evita repetir la carga. No usa el contador `words`.

### 5.2 Tarjetas en los grupos
- **2 o 3 tarjetas por grupo** en los escalones 1 a 4, intercaladas como el repaso actual (`interleave`). El escalón 5 (escrituras)
  no lleva tarjetas **[mi decisión]**.
- Se eligen las vencidas (FSRS `due ≤ ahora`), primero las más atrasadas. **Si no hay vencidas, no se fuerzan**.
- Una palabra que entró hoy vuelve en el mismo grupo o el siguiente en otro formato (regla 10 del plan), sin repetir la misma
  tarjeta en el grupo.
- **Regla 1:** una tarjeta no puede mostrar un lema cuyo artículo o forma evalúa otro ítem del mismo grupo, ni el glosario puede
  mostrarlo (ya existe `hides` por tema; se extiende a las tarjetas). **En los grupos de un tema con `hides: [article]`**
  (Artikel und Genus) **no hay tarjetas de sustantivos**, porque todas muestran o piden el artículo; sí de verbos
  **[mi decisión]**.
- Una tarjeta de nivel 3 cuyo tag de gramática es del tema del grupo no entra en ese grupo: duplicaría lo que el escalón ya
  evalúa **[mi decisión]**.
- Las tarjetas suman ítems al grupo: el armado tiene que mantener el grupo en 10 a 20 minutos. Con los tiempos del backup
  (mediana de 20 a 50 s por ítem), 3 tarjetas son ~1 minuto.
- **El puntaje del escalón** (80 % para superarlo) **no incluye las tarjetas**: miden vocabulario, no el tema del escalón
  **[mi decisión]**.

### 5.3 Las palabras en el resto de los ejercicios
- Los generadores (`articulo-caso`, `sein`) eligen primero lemas que están en la SRS en nivel 1 o 2.
- El dictado (§6.1) elige frases que contienen palabras en aprendizaje.
- Cuando un ejercicio que no es tarjeta contiene una palabra en aprendizaje y se acierta, **no** cuenta como repaso FSRS (sería
  ruido: la palabra no era lo evaluado) **[mi decisión]**. Solo el dictado y las tarjetas mueven la SRS.

## 6. Escucha

### 6.1 Dictado
- Se oye una frase corta (hasta 8 palabras) a 0,8×, con 🔊 para repetirla y la opción 1×. Se escribe.
- Se corrige con `matchAnswer` contra la frase (más sus variantes aceptadas si las hay) y, si falla, se subraya con
  `wrongWords`. Después de responder se muestra el texto original (tarea abierta, regla 2 del plan).
- **Frases:** del contenido ya controlado (respuestas aceptadas de `transform`/`translate`, frases del detective, burbujas de
  situación sin huecos, ejemplos del currículo) y de las instancias de los generadores. Todas pasan hoy por `lt_check`.
- **En los grupos:** 1 ítem de escucha por grupo en los escalones 2 a 4: un dictado o una situación ya vista en modo escucha
  (§6.2), además del dictado como variante de escucha del nivel 3 **[mi decisión]**. Tag: ninguno de gramática.
- **Cómo mueve la SRS un dictado suelto** **[mi decisión]**: cada palabra en aprendizaje de la frase se juzga sola (correcta si
  `wrongWords` no la subraya). Solo cuentan las que están vencidas: correcta → `Good`, subrayada → `Again`. Un dictado suelto
  **no cambia el nivel** de ninguna palabra; el nivel solo lo mueven las tarjetas (incluido el dictado como variante de escucha
  del nivel 3, que se juzga por su palabra).
- Mayúsculas y ß/umlauts con la tolerancia de siempre (no ortográfico, con aviso).

### 6.2 Situaciones en modo escucha
- Una situación **que ya se vio una vez** vuelve en modo escucha: las burbujas del otro personaje suenan y su texto aparece
  recién después de responder **[mi decisión]**. Los huecos del usuario se completan como siempre.
- Hoy una situación vista casi nunca vuelve (el repaso solo toma ítems de un hueco y el reintento pone primero lo no visto). Por
  eso se elige aparte, para el lugar de escucha del grupo (§6.1): una situación vista del mismo tema o de uno anterior, la que
  hace más tiempo que no se ve. Cuenta para el puntaje y el mastery como cualquier situación, salvo que se toque "Ahora no puedo
  escuchar" (§6.3).
- La primera vez que se ve una situación, siempre es con texto.

### 6.3 "Ahora no puedo escuchar" [usuario: no penalizar]
- Todo ejercicio con audio (tarjeta de escucha, dictado, situación en modo escucha) tiene el botón.
- Tocarlo apaga el audio **por el resto del grupo** **[mi decisión]**: las tarjetas salen en su variante de lectura, la situación
  sale con texto y el dictado se reemplaza por otro ítem del grupo (o se saltea).
- No toca puntaje, mastery ni SRS. Queda una entrada en el log (`t: 'skip-audio'`).
- La pantalla de audio explica, la primera vez, que con el iPhone en silencio el TTS no suena.

### 6.4 Al acertar, escuchar la frase
Después de acertar un ítem cerrado cuya respuesta es una frase (`choice` de frase, `order`, `transform`, `translate`, hueco
completado), aparece 🔊 con la frase correcta. Nunca después de un error (sería mostrar la solución, regla 2). No suena sola
**[mi decisión]**.

### 6.5 Voz
`speak()` de `js/services/tts.js` con la voz alemana predeterminada (en iOS, forzar una voz de la lista falla; ver memoria del
proyecto). La velocidad 0,8× y 1× se pasa por `rate`.

## 7. Imágenes

- **Qué imagen:** un pictograma simple de un solo objeto, sin escena **[mi decisión, el usuario no tenía preferencia]**.
- **Fuente:** OpenMoji (CC BY-SA 4.0). Se copian al repo solo los SVG usados, con su crédito en `data/credits.json`.
- **Cuáles palabras:** solo las concretas con un pictograma claro. El léxico suma un campo opcional `image` (el código de
  OpenMoji). Sin imagen buena, la palabra va sin imagen; nunca una forzada.
- **Dónde:** en las tarjetas (niveles 1 y 2) y en el glosario.
- **Regla 1:** la imagen no puede revelar lo evaluado (por ejemplo, ningún color por género en un ítem de género). El `alt` va en
  español y no contiene la palabra alemana.
- **Estilo visual: antes de programar, dos propuestas A/B** (taste-skill y awesome-design-md), porque cambia el aspecto de la app.
  Incluye: color o monocromo de OpenMoji sobre el fondo oscuro de "cuaderno sereno", tamaño, marco y cómo se ve la tarjeta.
- Offline: los SVG van en el SHELL del service worker.

## 8. Datos

- **Store:** nueva clave `srs: {[lemma]: {card, rung, listenUnlocked: {1?: true, 2?: true, 3?: true}, addedAt}}`, con `card` en
  el formato serializable de ts-fsrs.
- **Backup:** `SCHEMA_VERSION` 2, con una migración que agrega `srs: {}` a los backups de la versión 1.
- **Log:** `{t: 'v', lemma, rung, mode: 'read'|'listen', ok, ms, at}` por tarjeta y por palabra repasada en un dictado;
  `{t: 'skip-audio', item, at}`. Los dictados fallados guardan `text`, como las demás respuestas escritas.
- **Determinismo:** RNG y reloj inyectables en la SRS, como en `scheduler.js` y `mastery.js` (regla 9).

## 9. Cómo se sabe que funcionó

- **En el iPhone:** con auriculares, tarjetas y dictados suenan; "Ahora no puedo escuchar" apaga el audio del grupo sin bajar el
  puntaje; las imágenes cargan sin conexión.
- **Con el backup después de una semana de uso** **[mi decisión: los números]**:
  - acierto ≥ 80 % en las tarjetas vencidas de niveles 1 y 2 (retención);
  - al menos la mitad de las palabras del primer glosario llegaron al nivel 2;
  - acierto de dictado en subida entre la primera y la segunda mitad de la semana.
- `tools/check.sh` en verde, con tests de: transiciones de nivel, selección de tarjetas (vencidas, máximo 3, regla 1), migración
  del backup, dictado (corrección y subrayado), y que ningún ejercicio con audio toque mastery o SRS al saltearse.

## 10. Lo que queda para quien construye

- Los distractores del nivel 1 (sugerencia: mismo campo del léxico, misma clase de palabra).
- La forma exacta de alternar leer/escuchar dentro de un nivel, siempre que respete §4.
- La plantilla genérica de *Nominativ* del nivel 3 y su texto, con el criterio de `templates.yaml` (toda instancia tiene que ser
  algo que una persona diría; se revisan todas con `node tools/german_texts.mjs`).
- Qué palabras del léxico tienen un pictograma OpenMoji claro (se elige a mano y se revisa).
- El diseño de las pantallas, después de elegir entre las dos propuestas A/B.
- Ajustar los umbrales de §4 si el uso muestra que suben demasiado rápido o demasiado lento.
