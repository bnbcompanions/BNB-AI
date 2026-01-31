import { useState, useEffect, useCallback } from "react";
import {
  checkServer,
  speakElevenLabs,
  stopTTS,
} from "../lib/tts";
import type { LipSync } from "../lib/lipsync";

interface ControlsPanelProps {
  lipSync: LipSync | null;
}

const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel (Female)" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam (Male)" },
  { id: "TxGEqnHWrfWFTfGW9XjX", label: "Josh (Male)" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Bella (Female)" },
  { id: "ErXwobaYiN019PkySvjV", label: "Antoni (Male)" },
  { id: "MF3mGyEYCl7XYWbV9V6O", label: "Elli (Female)" },
];

const LS_KEY = "talkingAvatar";
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function savePrefs(prefs: Record<string, unknown>) {
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
}

export default function ControlsPanel({ lipSync }: ControlsPanelProps) {
  const prefs = loadPrefs();

  const validVoiceIds = VOICES.map((v) => v.id);
  const [voice, setVoice] = useState<string>(
    validVoiceIds.includes(prefs.voice) ? prefs.voice : VOICES[0].id
  );
  const [text, setText] = useState<string>(prefs.text ?? "Hello! I am your 3D talking avatar.");
  const [status, setStatus] = useState("Ready");
  const [speaking, setSpeaking] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Check TTS server on mount
  useEffect(() => {
    checkServer().then(setServerOnline);
    const interval = setInterval(() => {
      checkServer().then(setServerOnline);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Persist preferences
  useEffect(() => {
    savePrefs({ voice, text });
  }, [voice, text]);

  const handleSpeak = useCallback(() => {
    if (!text.trim()) return;

    speakElevenLabs(text, voice, {
      onStart: () => { setStatus("Speaking..."); setSpeaking(true); lipSync?.start(); },
      onEnd: () => { setStatus("Ready"); setSpeaking(false); lipSync?.stop(); },
      onAmplitude: (v) => { lipSync?.setAmplitude(v); },
      onError: (e) => { setStatus(`Error: ${e}`); setSpeaking(false); lipSync?.stop(); },
    });
  }, [text, voice, lipSync]);

  const handleStop = useCallback(() => {
    stopTTS();
    setStatus("Ready");
    setSpeaking(false);
    lipSync?.stop();
  }, [lipSync]);

  return (
    <div className="controls-panel">
      <h2>Talking Avatar</h2>

      {/* Server status */}
      <div className={`server-status ${serverOnline === true ? "online" : serverOnline === false ? "offline" : "checking"}`}>
        {serverOnline === true && "ElevenLabs TTS ready"}
        {serverOnline === false && "TTS server offline"}
        {serverOnline === null && "Checking server..."}
      </div>

      {/* Voice */}
      <label>
        Voice
        <select value={voice} onChange={(e) => setVoice(e.target.value)}>
          {VOICES.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      </label>

      {/* Text */}
      <label>
        Text
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something for the avatar to say..."
        />
      </label>

      {/* Buttons */}
      <div className="button-row">
        <button className="btn-speak" onClick={handleSpeak}
          disabled={speaking || !text.trim() || serverOnline === false}>
          Speak
        </button>
        <button className="btn-stop" onClick={handleStop}
          disabled={!speaking}>
          Stop
        </button>
      </div>

      {/* Status */}
      <div className={`status ${speaking ? "active" : ""}`}>{status}</div>
    </div>
  );
}
