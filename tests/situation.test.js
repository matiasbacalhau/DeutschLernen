import { test } from 'node:test';
import assert from 'node:assert/strict';

const sit = {
  id: 's1', type: 'situation', scene: {title: 'Hostel', context: 'Llegás.'},
  bubbles: [{who: 'them', text: 'Wie heißt du?'}, {who: 'me', text: 'Ich ___ Ana.'}],
  gaps: [{answers: ['heiße']}],
};

test('UI situación: sin listen ni con listen sin onNoAudio no se agregan hijos undefined/false/null', async () => {
  // DOM mínimo: alcanza para que h() arme elementos y registre los hijos que recibe append.
  const mk = (tag) => ({tag, children: [], value: '', textContent: '', append(...c) { this.children.push(...c); }, setAttribute() {}, addEventListener() {}, querySelector: () => mk('x'), querySelectorAll: () => []});
  globalThis.document = {createElement: mk, createTextNode: (t) => ({text: t})};
  globalThis.window = {};
  try {
    const {render} = await import('../js/exercises/situation.js');
    for (const ex of [sit, {...sit, listen: true}]) {
      const el = mk('div');
      render(ex, el, {submit() {}});
      assert.ok(el.children.length > 0 && el.children.every((c) => c !== null && c !== undefined && c !== false));
    }
    const el = mk('div');
    render({...sit, listen: true}, el, {submit() {}, onNoAudio() {}});
    assert.ok(el.children.some((c) => c.tag === 'button'));
  } finally {
    delete globalThis.document; delete globalThis.window;
  }
});
