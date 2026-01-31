/**
 * TTS engine — ElevenLabs via /api/tts proxy.
 *
 * Works both locally (Vite proxy → Express on port 3001)
 * and on Vercel (serverless function at /api/tts).
 *
 * Lip sync uses WebAudio AnalyserNode for amplitude-based mouth movement.
 */

export interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onAmplitude?: (v: number) => void;
  onError?: (msg: string) => void;
}

// ─── Audio playback state ───────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let amplitudeRAF = 0;

/** Check if the TTS API endpoint is reachable */
export async function checkServer(): Promise<boolean> {
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "" }),
      signal: AbortSignal.timeout(3000),
    });
    return r.status !== 502;
  } catch {
    return false;
  }
}

/** Speak text using ElevenLabs via the /api/tts proxy */
export async function speakElevenLabs(
  text: string,
  voiceId: string,
  callbacks: TTSCallbacks
): Promise<void> {
  stopTTS();

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice_id: voiceId }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      callbacks.onError?.(`ElevenLabs error (${res.status}): ${errText}`);
      return;
    }

    // Decode audio into an AudioBuffer for reliable analyser access
    const arrayBuffer = await res.arrayBuffer();
    if (!audioCtx) audioCtx = new AudioContext();
    // Resume context if suspended (browser autoplay policy)
    if (audioCtx.state === "suspended") await audioCtx.resume();

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Create source → analyser → destination
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.15;

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    // Also keep an HTML audio ref so stopTTS can kill playback
    // (BufferSource has no pause, we use source.stop())
    const sourceRef = source;

    source.start(0);
    callbacks.onStart?.();

    // Store for stopTTS
    currentAudio = { stop: () => sourceRef.stop() } as unknown as HTMLAudioElement;

    // Amplitude polling loop
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sum / dataArray.length) / 255;
      callbacks.onAmplitude?.(rms);
      amplitudeRAF = requestAnimationFrame(tick);
    };
    tick();

    source.onended = () => {
      cancelAnimationFrame(amplitudeRAF);
      callbacks.onAmplitude?.(0);
      callbacks.onEnd?.();
      currentAudio = null;
    };
  } catch (err) {
    callbacks.onError?.(`TTS request failed: ${err instanceof Error ? err.message : err}`);
  }
}

/** Stop any currently playing TTS audio */
export function stopTTS(): void {
  cancelAnimationFrame(amplitudeRAF);
  if (currentAudio) {
    try {
      (currentAudio as unknown as { stop: () => void }).stop();
    } catch { /* already stopped */ }
    currentAudio = null;
  }
}
