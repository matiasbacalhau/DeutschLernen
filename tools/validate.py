"""Valida el contenido compilado (data/*.json): tags, ids, mínimos por escalón y léxico."""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
MINIMOS = {1: 10, 2: 14, 3: 14, 4: 12}
LEXICO_CAMPOS = ['lemma', 'pos', 'es', 'field', 'freq', 'level']


def count_items(ex):
    """Ítems que aporta un ejercicio (tabla de la Tarea 6)."""
    t = ex.get('type')
    if t == 'situation':
        return len(ex.get('gaps', []))
    if t == 'reading':
        return len(ex.get('questions', []))
    if t == 'detective':
        return 1 + len(ex.get('apply', []))
    return 1


def tags_de(ex):
    """Todos los tags que usa un ejercicio, incluidos los de gaps y preguntas internas."""
    out = [ex['tag']] if ex.get('tag') else []
    for sub in ex.get('gaps', []) + ex.get('questions', []):
        if sub.get('tag'):
            out.append(sub['tag'])
    return out


def hay_ciclo(tags):
    estado = {}

    def visita(t):
        if estado.get(t) == 1:
            return True
        if estado.get(t) == 2 or t not in tags:
            return False
        estado[t] = 1
        if any(visita(r) for r in tags[t].get('requires', [])):
            return True
        estado[t] = 2
        return False

    return any(visita(t) for t in tags)


def validar_curriculum(cur, errs):
    tags = cur.get('tags', {})
    for t, info in tags.items():
        for r in info.get('requires', []):
            if r not in tags:
                errs.append(f'curriculum: {t} requiere un tag inexistente: {r}')
    if hay_ciclo(tags):
        errs.append('curriculum: ciclo en los requires')


def validar_lexico(lex, errs):
    for i, w in enumerate(lex):
        nombre = w.get('lemma', f'#{i}')
        campos = LEXICO_CAMPOS + (['article', 'plural'] if w.get('pos') == 'noun' else [])
        for c in campos:
            if c not in w:
                errs.append(f'lexicon: {nombre} no tiene {c}')


def validar_imagenes(lex, images, credits, errs):
    """Cada `image` del léxico tiene su SVG, y cada SVG copiado tiene su crédito (OpenMoji pide atribución)."""
    for w in lex:
        if w.get('image') and f'{w["image"]}.svg' not in images:
            errs.append(f'lexicon: {w["lemma"]} usa la imagen {w["image"]}, pero falta images/openmoji/{w["image"]}.svg')
    creditados = {c.get('file') for c in credits}
    for f in sorted(f for f in set(images) - creditados if f.endswith('.svg')):  # LICENSE.txt no es una imagen
        errs.append(f'images/openmoji/{f} no tiene entrada en credits.json')


def validar_ltmap(lt, tags, errs):
    for rid, r in lt.get('rules', {}).items():
        if r.get('tag') and r['tag'] not in tags:
            errs.append(f'lt-map: la regla {rid} usa un tag inexistente: {r["tag"]}')
    for cid, c in lt.get('llm_categories', {}).items():
        if c.get('tag') and c['tag'] not in tags:
            errs.append(f'lt-map: la categoría {cid} usa un tag inexistente: {c["tag"]}')
        for campo in ('es', 'hint'):
            if not c.get(campo):
                errs.append(f'lt-map: la categoría {cid} no tiene {campo}')


def validar_ejercicio(ex, tags, ids, errs):
    eid = ex.get('id')
    if not eid:
        errs.append(f'ejercicio sin id (tipo {ex.get("type")})')
    elif eid in ids:
        errs.append(f'id repetido: {eid}')
    ids.add(eid)
    if ex.get('reviewed') is not True:
        errs.append(f'{eid}: falta reviewed: true')
    for t in tags_de(ex):
        if t not in tags:
            errs.append(f'{eid}: tag inexistente: {t}')
    if ex.get('type') == 'order':
        chunks = ex.get('chunks', [])
        for ans in ex.get('answers', []):
            for c in ans:
                if c not in chunks:
                    errs.append(f'{eid}: la respuesta usa "{c}", que no está en chunks')


def validar_escalon(tid, s, errs):
    n = s.get('n')
    exs = s.get('exercises', [])
    if n in MINIMOS:
        items = sum(count_items(e) for e in exs if not e.get('reserve')) + s.get('generated', 0)
        if items < MINIMOS[n]:
            errs.append(f'{tid}: escalón {n} tiene {items} ítems sin reserva y necesita {MINIMOS[n]}')
        if sum(e.get('type') == 'choice' for e in exs) > 3:
            errs.append(f'{tid}: escalón {n} tiene más de 3 choice (spec §5.5)')
    elif n == 5:
        tipos = [e.get('type') for e in exs]
        if tipos.count('writing-guided') != 2 or tipos.count('writing-free') != 1:
            errs.append(f'{tid}: escalón 5 necesita 2 writing-guided y 1 writing-free')


def validar_unidades(units, tags, errs):
    ids = set()
    for uid, unit in units.items():
        for topic in unit.get('topics', []):
            tid = topic.get('topic')
            for t in topic.get('tags', []):
                if t not in tags:
                    errs.append(f'{tid}: tag inexistente: {t}')
            for s in topic.get('steps', []):
                for ex in s.get('exercises', []):
                    validar_ejercicio(ex, tags, ids, errs)
                if not topic.get('draft'):
                    validar_escalon(tid, s, errs)
            if not topic.get('draft') and len(topic.get('steps', [])) != 5:
                errs.append(f'{tid}: necesita 5 escalones')


def validate(data):
    errs = []
    cur = data.get('curriculum', {})
    tags = cur.get('tags', {})
    validar_curriculum(cur, errs)
    validar_lexico(data.get('lexicon', []), errs)
    if 'images' in data:
        validar_imagenes(data.get('lexicon', []), data['images'], data.get('credits', []), errs)
    validar_ltmap(data.get('ltMap', {}), tags, errs)
    validar_unidades(data.get('units', {}), tags, errs)
    return errs


def cargar(path):
    with open(os.path.join(ROOT, 'data', path), encoding='utf-8') as f:
        return json.load(f)


def main():
    cur = cargar('curriculum.json')
    units = {}
    for t in cur['topics']:
        u = t.get('unit')
        if u and u not in units:
            nivel, num = u.split('.')
            units[u] = cargar(f'levels/{nivel}/unit-{num[1:]}.json')
    errs = validate({'curriculum': cur, 'lexicon': cargar('lexicon.json'), 'ltMap': cargar('lt-map.json'),
                     'templates': cargar('templates.json'), 'units': units,
                     'credits': cargar('credits.json'), 'images': sorted(os.listdir(os.path.join(ROOT, 'images', 'openmoji')))})
    for e in errs:
        print(e)
    if errs:
        sys.exit(1)
    print('validate: ok')


if __name__ == '__main__':
    main()
