# Alemán A1 → C1

App privada (PWA para iPhone) para aprender alemán de A1 a C1, con foco en lectoescritura y, como extra, audición.

- Plan completo: [docs/PLAN.md](docs/PLAN.md)
- Estado: **iteración 0 cerrada** (2026-10-30): PWA instalable, router, backup export/import, pantalla de pruebas del iPhone y CI. Probada en el iPhone: instalación, almacenamiento persistente, offline, voz alemana y LanguageTool.
- Próximo paso: **iteración 1** (porción vertical A1 u. 1).

## Correr en local
```bash
python3 -m http.server 8000
```
Abrir http://localhost:8000. No hace falta build.

## Chequeos (los mismos que la CI)
```bash
docker run -d --rm -p 8010:8010 erikvl87/languagetool
tools/check.sh
```
`check.sh` corre los tests (`node --test`) y el chequeo de alemán contra el LanguageTool local.

## Licencias
Código: MIT ([LICENSE](LICENSE)). Contenido y datos: ver [LICENSE-data](LICENSE-data).
