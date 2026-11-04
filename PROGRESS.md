# Progreso

Qué anda, cómo se comprobó y qué falta probar. Se actualiza al cerrar cada tarea. Lo que dice "no probado" no está probado, aunque los tests pasen.

Qué tiene que hacer la app: [docs/PLAN.md](docs/PLAN.md). Detalle de la iteración 1: [la spec](docs/superpowers/specs/2026-10-30-iteracion-1-design.md).

## Dónde estamos

- **Iteración 0:** cerrada y probada en el iPhone el 2026-10-30.
- **Iteración 1:** en `main` desde el 2026-11-03 (PR #4 y el arreglo de feedback del PR #5). Publicada en Pages. **No consta que se haya probado en el iPhone.**
- **Iteración 2** (test de nivel y A1 u. 2–4): no empezada.

## Anda

Comprobado el 2026-11-03 sobre `main` (`8b45207`).

**Iteración 0** (probado en el iPhone el 2026-10-30)
- La app se instala desde el ícono y el almacenamiento es persistente.
- Funciona en modo avión.
- La voz alemana suena con la voz predeterminada del sistema. Si se fuerza otra voz de la lista, iOS puede dar `synthesis-failed`. En modo silencio no suena y no da error.
- LanguageTool responde desde el teléfono. Sin red da "Load failed", y eso es lo esperado.

**Iteración 1** (comprobado con tests y CI, no en el iPhone)
- Contenido: temas 1 a 3 de A1 u. 1 (*sein* y W-Fragen, Artikel und Genus, Akkusativ), con la escalera de 5 escalones. `tools/validate.py` da ok y `data/` está al día con `content-src/`.
- Motor: chequeo de ítems cerrados, feedback que nombra la regla sin mostrar la forma, mastery y scheduler.
- Escritura: corregida con LanguageTool y `lt-map`. Sin red, queda pendiente.
- Corrector de gramática con LLM (`proxy/`, Claude Haiku 5.5):
  - El Worker está publicado. Un GET sin origen recibe 403, como corresponde.
  - El bench dio 0 falsos positivos en 22 textos correctos y detectó 21 de 21 errores, con 3,3 s de latencia máxima (según el PR #4; no se volvió a correr).
- UI: inicio, mapa, tema, grupo, ficha, glosario, escritura y ajustes, con la identidad A1 "cuaderno sereno". Se revisó con web-design-guidelines.
- Tests: 210 de JS y 26 de Python pasan en local. La CI de `main` (con LanguageTool sobre todo el alemán del contenido) dio verde el 2026-11-03.

## No probado

- **Toda la iteración 1 en el iPhone:**
  - recorrer un grupo entero, respondiendo bien y mal;
  - que el progreso sobreviva a cerrar la app y a un export/import;
  - la escritura con red (la corrección tiene que llegar en menos de 5 s);
  - la escritura en modo avión (tiene que quedar pendiente y corregirse al volver la red).
- **El corrector con Gemini:** se puede activar con `PROVIDER`, pero nunca se probó contra la API real.
- **Límite conocido:** LanguageTool no marca errores de artículo en Akkusativ (*Ich habe ein Hund.*). Los cubre el corrector con LLM; si el Worker no responde, ese error pasa.

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
