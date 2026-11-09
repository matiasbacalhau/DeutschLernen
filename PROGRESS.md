# Progreso

Qué anda, cómo se comprobó y qué falta probar. Se actualiza al cerrar cada tarea. Lo que dice "no probado" no está probado, aunque los tests pasen.

Qué tiene que hacer la app: [docs/PLAN.md](docs/PLAN.md). Detalle de la iteración 1: [la spec](docs/superpowers/specs/2026-10-30-iteracion-1-design.md). Detalle de la iteración 2: [la spec](docs/superpowers/specs/2026-11-04-vocabulario-escucha-design.md).

## Dónde estamos

- **Iteración 0:** cerrada y probada en el iPhone el 2026-10-30.
- **Iteración 1:** en `main` desde el 2026-11-03 (PR #4), con arreglos y mejoras en los PR #5, #7, #8 y #9. Publicada en Pages. Ya se usó: un backup del 3/11 trae 65 respuestas y 8 fallos, y los PR #7 a #9 salen de auditarlo. **La lista de pruebas en el iPhone sigue sin hacerse** (ver "No probado").
- **Iteración 2** (vocabulario + escucha): implementada en `spec/vocabulario-escucha` (SRS con `ts-fsrs`, escalera de 3 niveles por palabra, tarjetas en los grupos, dictado con TTS, situaciones en modo escucha, botón "Ahora no puedo escuchar", 🔊 al acertar e imágenes OpenMoji). **Falta publicar en `main` y probar en el iPhone.**
- **Iteración 3** (test de nivel y A1 u. 2–4): no empezada.

## Anda

Comprobado el 2026-11-08 sobre `spec/vocabulario-escucha`.

**Iteración 0** (probado en el iPhone el 2026-10-30)
- La app se instala desde el ícono y el almacenamiento es persistente.
- Funciona en modo avión.
- La voz alemana suena con la voz predeterminada del sistema. Si se fuerza otra voz de la lista, iOS puede dar `synthesis-failed`. En modo silencio no suena y no da error.
- LanguageTool responde desde el teléfono. Sin red da "Load failed", y eso es lo esperado.

**Iteración 1** (comprobado con tests y CI, no en el iPhone)
- Contenido: temas 1 a 3 de A1 u. 1 (*sein* y W-Fragen, Artikel und Genus, Akkusativ), con la escalera de 5 escalones. `tools/validate.py` da ok y `data/` está al día con `content-src/`.
- Motor: chequeo de ítems cerrados, feedback que nombra la regla sin mostrar la forma, mastery y scheduler.
- Arreglos y mejoras del uso real (PR #7 a #9; probados en la app local a 375×812, no en el iPhone):
  - Las respuestas aceptan la ü compuesta y la descompuesta. El registro guarda el texto de las respuestas escritas falladas.
  - Si el error está en otra palabra, el feedback no culpa al tema: dice que lo que practica el ejercicio está bien y subraya lo que difiere, en todas las frases escritas.
  - En el buscador de errores, tocar una palabra correcta muestra la regla del ítem.
  - El reloj de cada ejercicio se pausa con la app en segundo plano, y el cierre del grupo registra además `activeMs` (tiempo neto sin segundo plano).
  - 🔊 en el ejemplo del feedback, el glosario y el modelo de la escritura, con la voz predeterminada.
  - Generador de *sein* × persona: 24 huecos en los escalones 3 y 4 del tema 1, con un diagnóstico que nombra la persona de lo escrito.
- Escritura: corregida con LanguageTool y `lt-map`. Sin red, queda pendiente.
- Corrector de gramática con LLM (`proxy/`, Claude Haiku 5.5):
  - El Worker está publicado (`ALLOWED_ORIGINS` incluye GitHub Pages y `http://localhost:8000`). Un GET sin origen recibe 403, como corresponde.
  - El bench dio 0 falsos positivos en 22 textos correctos y detectó 21 de 21 errores, con 3,3 s de latencia máxima (según el PR #4; no se volvió a correr).
- UI: inicio, mapa, tema, grupo, ficha, glosario, escritura y ajustes, con la identidad A1 "cuaderno sereno". Se revisó con web-design-guidelines.

**Iteración 2** (comprobado con tests, LanguageTool local y humo E2E en Chromium a 375×812; no en el iPhone)
- SRS de vocabulario (`ts-fsrs` vendorizado, esquema de backup v2 y carga inicial `seedSrs` del campo `hostel`).
- Escalera de 3 niveles por palabra (reconocer, producir con artículo/infinitivo, usar en contexto con diagnóstico de persona en verbos y caso/género en sustantivos).
- Tarjetas intercaladas en los grupos (hasta 3 vencidas en escalones 1–4, respetando la regla 1 y excluyendo las del glosario del mismo grupo).
- Escucha: dictado con TTS (reconociendo sustantivos, plurales y formas verbales conjugadas del léxico), situaciones ya vistas en modo escucha, botón "Ahora no puedo escuchar" y 🔊 de la frase al acertar un ítem cerrado.
- Imágenes OpenMoji (56 SVG con crédito CC BY-SA 4.0 en `data/credits.json` y en Ajustes; copiadas a `_site/` en la CI y cacheadas en `sw.js`).
- Tests: 290 de JS, 31 de Python, humo E2E headless (`node tools/e2e_smoke.mjs`, 146 archivos en caché del SW, 0 errores y 0 404) y `tools/check.sh` en verde.

## No probado

- **Las pruebas de las iteraciones 1 y 2 en el iPhone:**
  - recorrer un grupo entero, respondiendo bien y mal;
  - que el progreso sobreviva a cerrar la app y a un export/import (v1 → v2);
  - la escritura con red (la corrección tiene que llegar en menos de 5 s);
  - la escritura en modo avión (tiene que quedar pendiente y corregirse al volver la red);
  - que suenen las tarjetas de escucha, los dictados, las situaciones en modo escucha y el 🔊 al acertar;
  - que "Ahora no puedo escuchar" apague el audio del resto del grupo sin bajar el puntaje;
  - que las imágenes OpenMoji carguen en modo avión.
- **El corrector con Gemini:** se puede activar con `PROVIDER`, pero nunca se probó contra la API real.
- **Límites conocidos:**
  - `ms` del grupo sigue guardando el tiempo total de pared (`end - start`), pero ahora `activeMs` guarda aparte la suma neta sin segundo plano.
  - W-Fragen evalúa el orden, no una palabra, así que su feedback siempre muestra su regla, aunque el error esté en otra palabra.
  - El generador de *sein* y el de verbos de nivel 3 no usan *sie*/*Sie* sueltos como sujeto, porque al comienzo de la frase son ambiguos (la tercera del plural usa *Tom und Lea*).
  - LanguageTool no marca errores de artículo en Akkusativ (*Ich habe ein Hund.*). Los cubre el corrector con LLM; si el Worker no responde, ese error pasa.

## Cómo comprobarlo

```bash
docker run -d --rm -p 8010:8010 erikvl87/languagetool
tools/check.sh
node tools/e2e_smoke.mjs
```

`check.sh` es lo mismo que corre la CI: arma `data/`, valida el contenido, corre los tests de Python y de JS, y pasa el alemán por LanguageTool. `e2e_smoke.mjs` abre la PWA en Chromium headless a 375×812 y comprueba el Service Worker y las rutas principales.

Sin Docker, solo los tests:

```bash
node --test tests/
python3 -m unittest discover -s tests -p '*_test.py'
```

En el navegador: `python3 -m http.server 8000` y abrir `http://localhost:8000` con ancho de iPhone (375×812). El panel de navegador de Claude no registra el service worker, así que el modo avión solo se prueba en el teléfono.

## Siguiente

1. Mergear `spec/vocabulario-escucha` a `main`, redesplegar el Worker (`cd proxy && npm run deploy` para habilitar `localhost:8000`) y probar las iteraciones 1 y 2 en el iPhone con la lista de "No probado".
2. Después, empezar la iteración 3 (test de nivel y A1 u. 2–4) con brainstorming.
