import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'tools'))
from build_content import agregar_words, creditos  # noqa: E402

LEX = [{'lemma': 'Löffel', 'plural': 'Löffel'}, {'lemma': 'Tasche', 'plural': 'Taschen'}, {'lemma': 'Hund'}]


class WordsTest(unittest.TestCase):
    def test_lema_y_plural_sin_mayusculas(self):
        ex = {'type': 'gap', 'context': 'Im Laden', 'text': 'Ich brauche zwei taschen und ___.', 'answers': ['einen Löffel']}
        agregar_words(ex, LEX)
        self.assertEqual(ex['words'], ['Löffel', 'Tasche'])

    def test_ignora_español_y_reglas(self):
        ex = {'type': 'choice', 'prompt': 'Hund', 'options': [{'text': 'Das ist ein Hund', 'rule': 'Tasche'}]}
        agregar_words(ex, LEX)
        self.assertEqual(ex['words'], ['Hund'])

    def test_translate_desde_español(self):
        ex = {'type': 'translate', 'from': 'es', 'source': 'el Hund', 'answers': ['Der Löffel']}
        agregar_words(ex, LEX)
        self.assertEqual(ex['words'], ['Löffel'])


class CreditosTest(unittest.TestCase):
    def test_una_entrada_por_svg_ordenada_y_sin_repetir(self):
        lex = [{'lemma': 'b', 'image': '1F511'}, {'lemma': 'a', 'image': '1F392'}, {'lemma': 'c', 'image': '1F511'}, {'lemma': 'd'}]
        self.assertEqual(creditos(lex), [
            {'file': '1F392.svg', 'source': 'OpenMoji', 'license': 'CC BY-SA 4.0', 'url': 'https://openmoji.org/library/emoji-1F392/'},
            {'file': '1F511.svg', 'source': 'OpenMoji', 'license': 'CC BY-SA 4.0', 'url': 'https://openmoji.org/library/emoji-1F511/'},
        ])


if __name__ == '__main__':
    unittest.main()
