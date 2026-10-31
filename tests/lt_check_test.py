import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from lt_check import batches, locate  # noqa: E402

TEXTS = [{'where': 'a: text', 'text': 'Ich habe ein Hund.'},
         {'where': 'b: text', 'text': 'Das ist gut.'},
         {'where': 'c: text', 'text': 'Wir gehen.'}]


class LtCheckTest(unittest.TestCase):
    def test_batches_de_a_50(self):
        items = [{'where': str(i), 'text': 't'} for i in range(120)]
        self.assertEqual([len(b) for b in batches(items)], [50, 50, 20])

    def test_locate_reparte_offsets(self):
        joined = '\n\n'.join(t['text'] for t in TEXTS)
        second = joined.index('Das')
        matches = [{'offset': 4, 'length': 4, 'rule': {'id': 'R1'}, 'message': 'm1'},
                   {'offset': second + 4, 'length': 3, 'rule': {'id': 'R2'}, 'message': 'm2'},
                   {'offset': joined.index('Wir'), 'length': 3, 'rule': {'id': 'R3'}, 'message': 'm3'}]
        got = [(t['where'], m['rule']['id']) for t, m in locate(TEXTS, matches)]
        self.assertEqual(got, [('a: text', 'R1'), ('b: text', 'R2'), ('c: text', 'R3')])

    def test_match_en_el_separador_va_al_texto_anterior(self):
        joined = '\n\n'.join(t['text'] for t in TEXTS)
        m = {'offset': len(TEXTS[0]['text']) + 1, 'length': 1, 'rule': {'id': 'X'}, 'message': ''}
        self.assertEqual(locate(TEXTS, [m])[0][0]['where'], 'a: text')


if __name__ == '__main__':
    unittest.main()
