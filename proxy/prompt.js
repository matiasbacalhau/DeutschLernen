// Un único prompt para todos los proveedores: instrucciones, catálogo cerrado de categorías y esquema de salida.
// Al modelo van solo los ids y las descripciones en inglés (`hint`); los textos en español los pone la app.

export function buildPrompt(text, catalog) {
  const ids = Object.keys(catalog);
  const system = [
    'You check short texts written in German by Spanish-speaking A1 learners.',
    'Report only grammar errors that belong to one of the categories below, and only when you are certain.',
    'A correct text gets an empty list. Never report spelling, punctuation, capitalization, word choice or style.',
    'For each error give:',
    '- quote: the shortest exact substring of the text that is wrong (usually the article or the verb), copied character by character;',
    '- occurrence: which appearance of that substring in the text it is (1 for the first);',
    '- noun: for an article error, the noun that article belongs to, exactly as written in the text; an empty string otherwise;',
    '- category: one id from the list. For article errors, first decide the grammatical gender of that noun, then pick the category of that gender.',
    'Never include a correction.',
    '',
    'Categories:',
    ...ids.map(id => `${id}: ${catalog[id].hint}`),
  ].join('\n');
  const user = `<text>\n${text}\n</text>`;
  const schema = {
    type: 'object',
    properties: {
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            quote: {type: 'string'},
            occurrence: {type: 'integer'},
            noun: {type: 'string'},
            category: {type: 'string', enum: ids},
          },
          required: ['quote', 'occurrence', 'noun', 'category'],
          additionalProperties: false,
        },
      },
    },
    required: ['errors'],
    additionalProperties: false,
  };
  return {system, user, schema};
}
