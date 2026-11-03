// Adaptador de Gemini (generateContent, REST). responseSchema no acepta additionalProperties: se quita del esquema común.
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export const makeGemini = fetch => ({
  key: 'GEMINI_API_KEY',
  async correct({system, user, schema}, env) {
    const model = env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
    const res = await fetch(`${API}/${model}:generateContent`, {
      method: 'POST',
      headers: {'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY},
      body: JSON.stringify({
        systemInstruction: {parts: [{text: system}]},
        contents: [{role: 'user', parts: [{text: user}]}],
        generationConfig: {temperature: 0, responseMimeType: 'application/json', responseSchema: withoutAdditional(schema)},
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw Object.assign(new Error(`Gemini respondió ${res.status}`), {status: res.status});
    const text = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text;
    return {model, errors: JSON.parse(text).errors};
  },
});

function withoutAdditional(s) {
  if (Array.isArray(s) || typeof s !== 'object' || s === null) return s;
  return Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'additionalProperties').map(([k, v]) => [k, withoutAdditional(v)]));
}
