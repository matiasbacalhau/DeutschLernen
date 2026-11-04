# Progreso

Qué anda, cómo se comprobó y qué falta probar. Se actualiza al cerrar cada tarea. Lo que dice "no probado" no está probado, aunque los tests pasen.

Qué tiene que hacer la app: [docs/PLAN.md](docs/PLAN.md). Detalle de la iteración 1: [la spec](docs/superpowers/specs/2026-10-30-iteracion-1-design.md).

## Dónde estamos

- **Iteración 0:** cerrada y probada en el iPhone el 2026-10-30.
- **Iteración 1:** en `main` desde el 2026-11-03 (PR #4), con arreglos y mejoras en los PR #5, #7, #8 y #9. Publicada en Pages. Ya se usó: un backup del 3/11 trae 65 respuestas y 8 fallos, y los PR #7 a #9 salen de auditarlo. **La lista de pruebas en el iPhone sigue sin hacerse** (ver "No probado").
- **Iteración 2** (test de nivel y A1 u. 2–4): no empezada.

## Anda

Comprobado el 2026-11-04 sobre `main` (`f13a8d1`).

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
  - El reloj de cada ejercicio se pausa con la app en segundo plano.
  - 🔊 en el ejemplo del feedback, el glosario y el modelo de la escritura, con la voz predeterminada.
  - Generador de *sein* × persona: 24 huecos en los escalones 3 y 4 del tema 1, con un diagnóstico que nombra la persona de lo escrito.
- Escritura: corregida con LanguageTool y `lt-map`. Sin red, queda pendiente.
- Corrector de gramática con LLM (`proxy/`, Claude Haiku 5.5):
  - El Worker está publicado. Un GET sin origen recibe 403, como corresponde.
  - El bench dio 0 falsos positivos en 22 textos correctos y detectó 21 de 21 errores, con 3,3 s de latencia máxima (según el PR #4; no se volvió a correr).
- UI: inicio, mapa, tema, grupo, ficha, glosario, escritura y ajustes, con la identidad A1 "cuaderno sereno". Se revisó con web-design-guidelines.
- Tests: 220 de JS y 26 de Python pasan en local. La CI de `main` (con LanguageTool sobre los 827 textos en alemán del contenido) dio verde el 2026-11-04.

## No probado

- **Las pruebas de la iteración 1 en el iPhone:**
  - recorrer un grupo entero, respondiendo bien y mal;
  - que el progreso sobreviva a cerrar la app y a un export/import;
  - la escritura con red (la corrección tiene que llegar en menos de 5 s);
  - la escritura en modo avión (tiene que quedar pendiente y corregirse al volver la red);
  - que suene el 🔊 nuevo y que aparezcan los huecos generados de *sein* al rehacer un escalón.
- **El corrector con Gemini:** se puede activar con `PROVIDER`, pero nunca se probó contra la API real.
- **Límites conocidos:**
  - El tiempo del grupo entero sigue contando lo que pasa con la app en segundo plano (el de cada ejercicio ya no).
  - W-Fragen evalúa el orden, no una palabra, así que su feedback siempre muestra su regla, aunque el error esté en otra palabra.
  - El generador de *sein* no usa *sie*/*Sie* como sujeto, porque al comienzo de la frase son ambiguos.
  - LanguageTool no marca errores de artículo en Akkusativ (*Ich habe ein Hund.*). Los cubre el corrector con LLM; si el Worker no responde, ese error pasa.

## Cómo comprobarlo

```bash
docker run -d --rm -p 8010:8010 erikvl87/languagetool
tools/check.sh
```

`check.sh` es lo mismo que corre la CI: arma `data/`, valida el contenido, corre los tests de Python y de JS, y pasa el alemán por LanguageTool.

Sin Docker, solo los tests:

```bash
node --test tests/
python3 -m unittest discover -s tests -p '*_test.py'
```

En el navegador: `python3 -m http.server 8000` y abrir `http://localhost:8000` con ancho de iPhone (375×812). El panel de navegador de Claude no registra el service worker, así que el modo avión solo se prueba en el teléfono.

## Siguiente

1. Probar la iteración 1 en el iPhone con la lista de "No probado" y anotar acá el resultado.
2. Después, empezar la iteración 2 con brainstorming.
