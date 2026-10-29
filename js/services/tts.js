// Voz alemana del sistema (speechSynthesis). En iOS solo suena después de un toque del usuario.
export const supported = () => 'speechSynthesis' in window;

// Las voces cargan de forma asíncrona: se espera "voiceschanged" o un timeout.
export function germanVoices(timeout = 2000) {
  const pick = () => speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('de'));
  return new Promise(resolve => {
    if (pick().length) return resolve(pick());
    const done = () => resolve(pick());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, timeout);
  });
}

export function speak(text, { rate = 1, voice } = {}) {
  // En Safari, cancel() justo antes de speak() puede hacer fallar la frase nueva.
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = rate;
  if (voice) u.voice = voice;
  return new Promise((resolve, reject) => {
    u.onend = resolve;
    u.onerror = e => reject(new Error(e.error));
    speechSynthesis.speak(u);
  });
}
