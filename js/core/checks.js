// Comprobaciones de la pantalla "Pruebas del iPhone". Cada una devuelve { ok, text } y recibe lo que necesita, para poder testearla sin navegador.

const result = (ok, yes, no) => ({ ok, text: ok ? yes : no });
const voiceName = (voice, fallback) => (voice ? voice.name : fallback);

export function installCheck(standalone) {
  return result(standalone, 'sí', 'no (abierta en el navegador)');
}

export async function persistCheck(storage) {
  const persisted = (await storage?.persisted?.()) ?? false;
  return result(persisted, 'sí', 'no');
}

export async function dbCheck(store, probe) {
  try {
    await store.set('probe', probe);
    return result((await store.get('probe')) === probe, 'funciona', 'no devuelve lo guardado');
  } catch (e) {
    return { ok: false, text: e.message };
  }
}

export function offlineCheck(controlled, cached) {
  return result(Boolean(controlled && cached), 'lista', 'todavía no (recargá una vez)');
}

export function voicesCheck(supported, voices) {
  if (!supported) return { ok: false, text: 'este navegador no tiene síntesis de voz' };
  return result(voices.length > 0, `${voices.length} voz/voces`, 'no hay voces alemanas');
}

export async function speakCheck(speak, voice) {
  try {
    await speak('Guten Tag! Ich lerne Deutsch.', { rate: 0.9, voice });
    return { ok: true, text: `suena (${voiceName(voice, 'predeterminada')})` };
  } catch (e) {
    return { ok: false, text: `error con ${voiceName(voice, 'la predeterminada')}: ${e.message}` };
  }
}

export async function ltCheck(check) {
  try {
    const matches = await check('Ich habe ein Fehler gemacht.');
    return result(matches.length > 0, `responde (${matches.length} error detectado)`, 'responde, pero no detectó el error');
  } catch (e) {
    return { ok: false, text: `bloqueado o sin red: ${e.message}` };
  }
}
