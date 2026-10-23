'use client';

// Lectura en voz alta: voz de Gemini (/api/tts) con caché en el navegador y, si no está
// disponible, la voz del propio dispositivo.

const CACHE_NAME = 'tl-voz-v1';
const PLAYBACK_RATE = 0.9; // un poco más despacio que lo normal, para aprender
const BACKOFF_MS = 60_000; // tras un fallo (p. ej. cupo agotado), un minuto con la voz del dispositivo

// WAV vacío y diminuto: se reproduce durante el primer toque para "desbloquear" el audio en iPhone.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

let audio = null;
let unlocked = false;
let disabledUntil = 0;
let lastRequest = 0;
const memory = new Map(); // texto -> object URL (sesión actual)

function getAudio() {
  if (!audio && typeof Audio !== 'undefined') audio = new Audio();
  return audio;
}

// En iPhone solo se puede reproducir audio que empezó con un toque del usuario. Como la voz
// llega tras una petición, desbloqueamos el elemento de audio en el primer toque de la página.
function unlock() {
  if (unlocked) return;
  const el = getAudio();
  if (!el) return;
  unlocked = true;
  el.src = SILENT_WAV;
  el.play().catch(() => { unlocked = false; });
}
if (typeof window !== 'undefined') {
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));
}

function speakWithDevice(text, lang, rate) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang.speech;
  utterance.rate = rate;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang.code));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

async function getVoiceUrl(text, lang) {
  const key = `${lang.code}:${text}`;
  if (memory.has(key)) return memory.get(key);

  // La Cache Storage persiste entre visitas: cada frase solo se pide a Gemini una vez.
  const cacheKey = `/__voz?l=${encodeURIComponent(lang.code)}&t=${encodeURIComponent(text)}`;
  let cache = null;
  try { cache = await caches.open(CACHE_NAME); } catch { /* sin Cache Storage (p. ej. http en el móvil) */ }

  let response = cache ? await cache.match(cacheKey) : undefined;
  if (!response) {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    response = res;
    if (cache) await cache.put(cacheKey, res.clone()).catch(() => {});
  }

  const url = URL.createObjectURL(await response.blob());
  memory.set(key, url);
  return url;
}

export async function speak(text, lang, { rate = PLAYBACK_RATE } = {}) {
  if (!text || typeof window === 'undefined') return;

  const el = getAudio();
  el?.pause();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  if (!el || Date.now() < disabledUntil) return speakWithDevice(text, lang, rate);

  // Si el usuario pulsa otra frase mientras esta carga, solo suena la última.
  const requestId = ++lastRequest;
  try {
    const url = await getVoiceUrl(text, lang);
    if (requestId !== lastRequest) return;
    el.src = url;
    el.playbackRate = rate;
    await el.play();
  } catch (error) {
    if (requestId !== lastRequest) return;
    console.warn('Voz de Gemini no disponible, uso la del dispositivo:', error?.message ?? error);
    // Si solo fue el bloqueo de reproducción automática del navegador, no penalizamos a Gemini.
    if (error?.name !== 'NotAllowedError') disabledUntil = Date.now() + BACKOFF_MS;
    speakWithDevice(text, lang, rate);
  }
}
