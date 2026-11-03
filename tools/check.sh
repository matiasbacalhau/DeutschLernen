#!/usr/bin/env bash
# Punto de entrada único: lo mismo corre en local y en la CI.
# Desde la iteración 1 se suman build_content.py (y su git diff), validate.py y el chequeo del contenido.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 tools/build_content.py
git diff --exit-code -- data/ || { echo "data/ no está al día: corré tools/build_content.py y commiteá"; exit 1; }
python3 tools/validate.py
python3 -m unittest discover -s tests -p '*_test.py'
node --test tests/*.test.js
python3 tools/lt_check.py
