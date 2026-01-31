/**
 * Vercel serverless function — POST /api/tts
 *
 * Receives { text, voice_id } and proxies the request to ElevenLabs,
 * returning audio/mpeg back to the browser.
 *
 * Environment variable: ELEVENLABS_API_KEY
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ELEVENLABS_API_KEY not configured" });
  }

  const { text, voice_id } = req.body ?? {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Missing text" });
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
      return res.status(response.status).json({ error: errText });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    const buffer = Buffer.from(await response.arrayBuffer());
    return res.send(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: `ElevenLabs unreachable: ${msg}` });
  }
}
