"""Chequeo de alemán contra un LanguageTool propio (Docker), nunca contra la API pública.

Prueba de humo del servidor y después todo el alemán del contenido (tools/german_texts.mjs).
"""
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request

LT_URL = os.environ.get('LT_URL', 'http://localhost:8010/v2')
DOCKER = 'docker run -d --rm -p 8010:8010 erikvl87/languagetool'


# Reglas de estilo entre oraciones consecutivas: al agrupar textos sueltos en un request
# dispararían falsos positivos (p. ej. tres frases seguidas que empiezan con "Ich").
BATCH_DISABLED = 'GERMAN_WORD_REPEAT_BEGINNING_RULE'


def check(text, disabled=None):
    params = {'text': text, 'language': 'de-DE'}
    if disabled:
        params['disabledRules'] = disabled
    data = urllib.parse.urlencode(params).encode()
    with urllib.request.urlopen(f'{LT_URL}/check', data, timeout=30) as res:
        return json.load(res)['matches']


def wait_ready(seconds=90):
    deadline = time.time() + seconds
    while True:
        try:
            return check('Test.')
        except OSError as e:
            if time.time() > deadline:
                sys.exit(f'LanguageTool no responde en {LT_URL} ({e}).\nLevantalo con: {DOCKER}')
            time.sleep(3)


def batches(texts, size=50):
    return [texts[i:i + size] for i in range(0, len(texts), size)]


def split_multi(texts):
    """(multi, single): los de varias oraciones se chequean de a uno y con todas las reglas."""
    return [t for t in texts if t.get('multi')], [t for t in texts if not t.get('multi')]


def locate(batch, matches):
    """Asigna cada match al texto del lote que lo contiene (textos unidos con \n\n)."""
    starts, pos = [], 0
    for t in batch:
        starts.append(pos)
        pos += len(t['text']) + 2
    found = []
    for m in matches:
        i = max(i for i, s in enumerate(starts) if s <= m['offset'])
        found.append((batch[i], m))
    return found


def content_texts():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    out = subprocess.run(['node', os.path.join(root, 'tools', 'german_texts.mjs')],
                         check=True, capture_output=True, text=True, cwd=root).stdout
    return json.loads(out)


def main():
    wait_ready()
    if not check('Ich habe ein Fehler gemacht.'):
        sys.exit('LanguageTool no detectó un error obvio: revisar el servidor.')
    matches = check('Ich habe einen Fehler gemacht.')
    if matches:
        sys.exit(f'LanguageTool marcó errores en una frase correcta: {matches}')
    texts = [t for t in content_texts() if 'ignore' not in t]
    multi, single = split_multi(texts)
    failures = 0
    runs = [([t], None) for t in multi] + [(b, BATCH_DISABLED) for b in batches(single)]
    for batch, disabled in runs:
        for t, m in locate(batch, check('\n\n'.join(x['text'] for x in batch), disabled)):
            failures += 1
            print(f"FAIL {t['where']} [{m['rule']['id']}] {m['message']} -> {t['text']}")
    if failures:
        sys.exit(f'{failures} problema(s) de alemán en el contenido.')
    print(f'LanguageTool OK ({len(texts)} textos)')


if __name__ == '__main__':
    main()
