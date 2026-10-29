"""Chequeo de alemán contra un LanguageTool propio (Docker), nunca contra la API pública.

Iteración 0: solo verifica que el servidor responda y detecte errores.
Desde la iteración 1 recorre todo el alemán del contenido (§4 del plan).
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

LT_URL = os.environ.get('LT_URL', 'http://localhost:8010/v2')
DOCKER = 'docker run -d --rm -p 8010:8010 erikvl87/languagetool'


def check(text):
    data = urllib.parse.urlencode({'text': text, 'language': 'de-DE'}).encode()
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


def main():
    wait_ready()
    if not check('Ich habe ein Fehler gemacht.'):
        sys.exit('LanguageTool no detectó un error obvio: revisar el servidor.')
    matches = check('Ich habe einen Fehler gemacht.')
    if matches:
        sys.exit(f'LanguageTool marcó errores en una frase correcta: {matches}')
    print('LanguageTool OK')


main()
