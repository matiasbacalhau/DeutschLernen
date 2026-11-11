// reading: texto y preguntas (escritas o de opción). answer = (string | índice)[].
import { h, rich } from '../ui/dom.js';
import { answerInput } from '../ui/inputs.js';
import { onceButton, shuffledIndexes } from './common.js';

export function render(ex, el, { submit }) {
  const answers = ex.questions.map(() => null);
  const btn = onceButton('Prüfen', () => submit(answers.map(a => (typeof a === 'function' ? a() : a))),
    () => answers.every(a => (typeof a === 'function' ? a().trim() !== '' : a !== null)));
  const questions = ex.questions.map((q, n) => {
    if (!q.options) {
      const input = answerInput({ label: q.prompt });
      input.lang = 'de';
      answers[n] = () => input.value();
      input.addEventListener('input', btn.refresh);
      return input;
    }
    const opts = shuffledIndexes(q.options.length).map(i => h('button', {
      type: 'button', class: 'secondary option', 'aria-pressed': 'false',
      onclick: e => {
        answers[n] = i;
        opts.forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
        btn.refresh();
      },
    }, rich(q.options[i].text)));
    return h('fieldset', { class: 'question' }, h('legend', { lang: 'de' }, q.prompt), opts);
  });
  el.append(
    h('div', { class: 'card reading', lang: 'de' }, h('h2', {}, ex.title), ...ex.text.trim().split('\n').map(p => h('p', {}, p))),
    ...questions, btn,
  );
}
