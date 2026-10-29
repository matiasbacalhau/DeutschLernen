#!/usr/bin/env bash
# Punto de entrada único: lo mismo corre en local y en la CI.
# Desde la iteración 1 se suman build_content.py (y su git diff), validate.py y el chequeo del contenido.
set -euo pipefail
cd "$(dirname "$0")/.."

node --test tests/
python3 tools/lt_check.py
