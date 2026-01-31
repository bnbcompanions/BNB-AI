/**
 * Local dev proxy server for ElevenLabs TTS.
 *
 * Proxies POST /api/tts to ElevenLabs, keeping the API key server-side.
 *
 * Usage:
 *   npm run tts:server
 *
 * Requires ELEVENLABS_API_KEY in .env file.
 */

import express from "express";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Load .env manually (no extra dependency) ──────────────────────
try {
  const envPath = resolve(import.meta.dirname, "..", ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch { /* .env file missing — rely on environment */ }

const app = express();
const PORT = 3001;
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel

app.use(express.json());

// CORS for local dev
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.options("/{*splat}", (_req, res) => {
  res.sendStatus(204);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, elevenlabs: !!process.env.ELEVENLABS_API_KEY });
});

// ─── Chat proxy (OpenRouter) ────────────────────────────────────────
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const COMPANION_PROMPTS: Record<string, string> = {
  nova: `You are Nova, an AI companion living on BNB Chain. You are a sharp and confident DeFi strategist who helps users navigate decentralized finance on BNB Chain. You're analytical yet approachable. You explain complex DeFi concepts in simple terms. Keep responses concise (2-4 sentences). Always remind users this is not financial advice. Never share private keys. You remember previous messages. Speak in the same language the user writes to you.`,
  kai: `You are Kai, an AI companion living on BNB Chain. You are an enthusiastic NFT explorer and digital art connoisseur who guides users through the NFT universe on BNB Chain. You're creative, curious, and hyped about digital art. Keep responses concise (2-4 sentences). Warn about NFT scams. Never guarantee any NFT will increase in value. You remember previous messages. Speak in the same language the user writes to you.`,
  luna: `You are Luna, an AI companion living on BNB Chain. You are a vigilant security guardian who protects users from scams, hacks, and bad actors in the crypto space. You're calm, precise, and protective. Keep responses concise (2-4 sentences). If a user describes a scam situation, tell them immediately. Never ask for private keys or seed phrases. You remember previous messages. Speak in the same language the user writes to you.`,
  atlas: `You are Atlas, an AI companion living on BNB Chain. You are a knowledgeable chain navigator who helps newcomers and experienced users explore everything BNB Chain has to offer. You're patient, encyclopedic, and genuinely helpful. Keep responses concise (2-4 sentences). Be extra patient with beginners. Provide step-by-step guidance. You remember previous messages. Speak in the same language the user writes to you.`,
};

app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
    return;
  }

  const { messages, companionId } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Missing messages array" });
    return;
  }

  const systemPrompt = COMPANION_PROMPTS[companionId] || COMPANION_PROMPTS.nova;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      res.status(response.status).send(errText);
      return;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Chat Proxy] Error:", msg);
    res.status(502).json({ error: `OpenRouter unreachable: ${msg}` });
  }
});

// ─── TTS proxy (ElevenLabs) ─────────────────────────────────────────
app.post("/api/tts", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ELEVENLABS_API_KEY not configured" });
    return;
  }

  const { text, voice_id } = req.body;
  if (!text || !text.trim()) {
    res.status(400).json({ error: "Missing text" });
    return;
  }

  const voiceId = voice_id || DEFAULT_VOICE;

  try {
    const response = await fetch(`${ELEVENLABS_BASE}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      res.status(response.status).send(errText);
      return;
    }

    res.setHeader("Content-Type", "audio/mpeg");
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[TTS Proxy] Error:", msg);
    res.status(502).json({ error: `ElevenLabs unreachable: ${msg}` });
  }
});

app.listen(PORT, () => {
  console.log(`[TTS Proxy] Running on http://localhost:${PORT}`);
  console.log(`[TTS Proxy] API key ${process.env.ELEVENLABS_API_KEY ? "loaded" : "MISSING"}`);
});
