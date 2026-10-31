"""Compila content-src/*.yaml a data/*.json (que se commitea). Sin argumentos, desde cualquier carpeta."""
import json
import os
import re

import yaml

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'content-src')
OUT = os.path.join(ROOT, 'data')

# Claves de un ejercicio cuyo valor es alemán (para calcular `words`).
CLAVES_DE = {'text', 'de', 'answers', 'chunks', 'tokens', 'corrections', 'options', 'bubbles', 'gaps',
             'questions', 'sentences', 'apply', 'source', 'context'}
# Claves que son español o explicación: no se recorren.
CLAVES_ES = {'rule', 'rules', 'errors', 'es', 'prompt', 'instruction', 'scene', 'title', 'dims', 'tag', 'tags'}


def leer(path, vacio):
    p = os.path.join(SRC, path)
    if not os.path.exists(p):
        return vacio
    with open(p, encoding='utf-8') as f:
        return yaml.safe_load(f) or vacio


def escribir(path, data):
    p = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(data, f, sort_keys=False, ensure_ascii=False, indent=1)
        f.write('\n')


def textos_de(x, clave=None):
    """Strings alemanes de un ejercicio."""
    if isinstance(x, str):
        yield x
    elif isinstance(x, list):
        for v in x:
            yield from textos_de(v, clave)
    elif isinstance(x, dict):
        for k, v in x.items():
            if k in CLAVES_ES or (clave is None and k not in CLAVES_DE):
                continue
            if k == 'source' and x.get('from') == 'es':
                continue
            yield from textos_de(v, k)


def palabras(ex):
    return {w.lower() for t in textos_de(ex) for w in re.findall(r'\w+', t)}


def agregar_words(ex, lexico):
    ws = palabras(ex)
    ex['words'] = [w['lemma'] for w in lexico
                   if w['lemma'].lower() in ws or (w.get('plural') and w['plural'].lower() in ws)]


def cargar_unidad(dir_unidad, lexico):
    unit = leer(f'{dir_unidad}/unit.yaml', {})
    topics = []
    for t in unit['topics']:
        topic = leer(f'{dir_unidad}/{t["file"]}', None) or {'topic': t['id'], 'draft': True, 'steps': []}
        for step in topic.get('steps', []):
            for ex in step.get('exercises', []):
                agregar_words(ex, lexico)
        topics.append(topic)
    return {'id': unit['id'], 'level': unit['level'], 'title': unit['title'], 'topics': topics}


def main():
    cur = leer('curriculum.yaml', {})
    lexico = leer('lexicon.yaml', [])
    escribir('curriculum.json', cur)
    escribir('lexicon.json', lexico)
    escribir('templates.json', leer('templates.yaml', []))
    escribir('lt-map.json', leer('lt-map.yaml', {'rules': {}, 'categories': {}, 'notice_categories': []}))
    for u in sorted({t['unit'] for t in cur['topics'] if t.get('unit')}):
        nivel, num = u.split('.')
        unit = cargar_unidad(f'{nivel}/{num}', lexico)
        escribir(f'levels/{nivel}/unit-{num[1:]}.json', unit)


if __name__ == '__main__':
    main()
