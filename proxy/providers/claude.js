// Adaptador de Claude (Messages API, SDK oficial). Haiku 5.5 no acepta temperature: el determinismo lo dan el esquema y validate.js.
// clientFor(env) devuelve el cliente del SDK; los tests pasan uno falso.
export const makeClaude = clientFor => ({
  key: 'ANTHROPIC_API_KEY',
  async correct({system, user, schema}, env) {
    const model = env.CLAUDE_MODEL ?? 'claude-haiku-5-5';
    const res = await clientFor(env).messages.create({
      model,
      max_tokens: 4096, // incluye el thinking adaptativo de Haiku 5.5
      system,
      messages: [{role: 'user', content: user}],
      output_config: {format: {type: 'json_schema', schema}, ...(env.EFFORT ? {effort: env.EFFORT} : {})},
    }, {timeout: 12000, maxRetries: 0}); // sin reintentos acá: la cola de la app reintenta
    if (res.stop_reason !== 'end_turn') throw Object.assign(new Error(`stop_reason ${res.stop_reason}`), {stopReason: res.stop_reason});
    const text = res.content.find(b => b.type === 'text')?.text;
    return {model: res.model ?? model, errors: JSON.parse(text).errors};
  },
});
