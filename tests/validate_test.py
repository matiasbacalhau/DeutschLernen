import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from validate import count_items, validate  # noqa: E402

MINIMOS = {1: 10, 2: 14, 3: 14, 4: 12}


def gap(i, tag='a1.nom.mask', **kw):
    return {'id': f'g{i}', 'type': 'gap', 'tag': tag, 'context': 'x', 'text': 'Das ist ___.',
            'answers': ['der'], 'reviewed': True, **kw}


def step(n, items, **kw):
    if n == 5:
        ex = [{'id': f'w{i}', 'type': t, 'reviewed': True} for i, t in
              enumerate(['writing-guided', 'writing-guided', 'writing-free'])]
    else:
        ex = [gap(f'{n}-{i}') for i in range(items)]
    return {'n': n, 'name': 's', 'scene': {'title': 't', 'context': 'c'}, 'exercises': ex, **kw}


def minimo():
    steps = [step(n, MINIMOS.get(n, 0)) for n in range(1, 6)]
    return {
        'curriculum': {
            'levels': ['A1'],
            'topics': [{'id': 'a1.u1.t1', 'level': 'A1', 'unit': 'a1.u01', 'title': 'T'}],
            'tags': {
                'a1.nom.mask': {'title': 'Nom m', 'requires': [], 'orthographic': False},
                'a1.akk.mask': {'title': 'Akk m', 'requires': ['a1.nom.mask'], 'orthographic': False},
            },
        },
        'lexicon': [{'lemma': 'Löffel', 'pos': 'noun', 'article': 'der', 'plural': 'Löffel',
                     'es': 'cuchara', 'field': 'kueche', 'freq': 2, 'level': 'A1'}],
        'ltMap': {'rules': {'R': {'tag': 'a1.nom.mask', 'es': 'x'}}, 'categories': {}, 'notice_categories': []},
        'templates': [],
        'units': {'a1.u01': {'id': 'a1.u01', 'topics': [
            {'topic': 'a1.u1.t1', 'tags': ['a1.nom.mask'], 'steps': steps}]}},
    }


def ejercicios(d, n):
    return d['units']['a1.u01']['topics'][0]['steps'][n - 1]['exercises']


class ValidateTest(unittest.TestCase):
    def assertError(self, d, *needles):
        errs = validate(d)
        self.assertTrue(any(all(n in e for n in needles) for e in errs), errs)

    def test_ok(self):
        self.assertEqual(validate(minimo()), [])

    def test_tag_inexistente(self):
        d = minimo()
        ejercicios(d, 1)[0]['tag'] = 'a1.zzz'
        self.assertError(d, 'a1.zzz')

    def test_requires_ciclo(self):
        d = minimo()
        d['curriculum']['tags']['a1.nom.mask']['requires'] = ['a1.akk.mask']
        self.assertError(d, 'ciclo')

    def test_sin_reviewed(self):
        d = minimo()
        del ejercicios(d, 1)[0]['reviewed']
        self.assertError(d, 'reviewed')

    def test_id_repetido(self):
        d = minimo()
        ejercicios(d, 2)[0]['id'] = ejercicios(d, 1)[0]['id']
        self.assertError(d, 'repetido', 'g1-0')

    def test_order_respuesta_con_chunk_ajeno(self):
        d = minimo()
        ejercicios(d, 2)[0] = {'id': 'o1', 'type': 'order', 'tag': 'a1.nom.mask', 'reviewed': True,
                               'chunks': ['Die', 'Katze'], 'answers': [['Die', 'Hund']]}
        self.assertError(d, 'o1', 'Hund')

    def test_escalon_sin_items_suficientes(self):
        d = minimo()
        del ejercicios(d, 2)[9:]
        self.assertError(d, 'escalón 2', '14')

    def test_reserva_no_cuenta(self):
        d = minimo()
        ejercicios(d, 2)[0]['reserve'] = True
        self.assertError(d, 'escalón 2', '14')

    def test_generated_suma(self):
        d = minimo()
        s = d['units']['a1.u01']['topics'][0]['steps'][2]
        del s['exercises'][10:]
        s['generated'] = 4
        self.assertEqual(validate(d), [])

    def test_draft_saltea_minimos(self):
        d = minimo()
        t = d['units']['a1.u01']['topics'][0]
        t['draft'] = True
        t['steps'] = []
        self.assertEqual(validate(d), [])

    def test_escalon_5_escrituras(self):
        d = minimo()
        ejercicios(d, 5)[0]['type'] = 'writing-free'
        self.assertError(d, 'escalón 5')

    def test_ltmap_tag_inexistente(self):
        d = minimo()
        d['ltMap']['rules']['R']['tag'] = 'a1.nada'
        self.assertError(d, 'a1.nada')

    def test_lexico_sin_campo(self):
        d = minimo()
        del d['lexicon'][0]['field']
        self.assertError(d, 'field')

    def test_lexico_sustantivo_sin_articulo(self):
        d = minimo()
        del d['lexicon'][0]['article']
        self.assertError(d, 'article')

    def test_mas_de_3_choice(self):
        d = minimo()
        for i in range(4):
            ejercicios(d, 2)[i] = {'id': f'c{i}', 'type': 'choice', 'tag': 'a1.nom.mask', 'reviewed': True,
                                   'prompt': 'p', 'options': [{'text': 'a', 'correct': True}, {'text': 'b'}]}
        self.assertError(d, 'choice')

    def test_tag_dentro_de_situation_y_reading(self):
        d = minimo()
        ejercicios(d, 2)[0] = {'id': 's1', 'type': 'situation', 'reviewed': True,
                               'scene': {}, 'bubbles': [], 'gaps': [{'tag': 'a1.malo', 'answers': ['x']}]}
        ejercicios(d, 2)[1] = {'id': 'r1', 'type': 'reading', 'reviewed': True, 'title': 't', 'text': 't',
                               'questions': [{'tag': 'a1.peor', 'answers': ['x']}]}
        self.assertError(d, 'a1.malo')
        self.assertError(d, 'a1.peor')


class CountItemsTest(unittest.TestCase):
    def test_conteos(self):
        self.assertEqual(count_items({'type': 'gap'}), 1)
        self.assertEqual(count_items({'type': 'situation', 'gaps': [{}, {}]}), 2)
        self.assertEqual(count_items({'type': 'reading', 'questions': [{}, {}, {}]}), 3)
        self.assertEqual(count_items({'type': 'detective', 'apply': [{}, {}]}), 3)
        self.assertEqual(count_items({'type': 'writing-free'}), 1)


if __name__ == '__main__':
    unittest.main()
