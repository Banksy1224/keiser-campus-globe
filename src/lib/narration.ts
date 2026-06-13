// Lightweight wrapper around the browser's built-in Speech Synthesis API so
// the guided tour can *speak* each campus introduction — no backend, no network,
// no API key. Degrades silently where speech synthesis isn't available.

let cachedVoice: SpeechSynthesisVoice | null = null;

function supported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Prefer a natural-sounding English voice when the platform offers one. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (!supported()) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null; // not loaded yet; caller will retry
  const prefer = [
    "Google US English",
    "Samantha",
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
  ];
  cachedVoice =
    prefer.map((n) => voices.find((v) => v.name === n)).find(Boolean) ??
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    voices[0];
  return cachedVoice;
}

// Voices can load asynchronously; warm the cache when they arrive.
if (supported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

/** Speak the given text, cancelling anything currently being spoken. */
export function speak(text: string): void {
  if (!supported() || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) utter.voice = voice;
  utter.rate = 0.98;
  utter.pitch = 1.0;
  utter.lang = voice?.lang ?? "en-US";
  synth.speak(utter);
}

/** Stop any in-progress narration immediately. */
export function stopSpeaking(): void {
  if (!supported()) return;
  window.speechSynthesis.cancel();
}

export function speechSupported(): boolean {
  return supported();
}
