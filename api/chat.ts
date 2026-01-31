/**
 * Vercel serverless function — POST /api/chat
 *
 * Proxies chat messages to OpenRouter, keeping API key server-side.
 * Accepts companionId to select the right system prompt.
 *
 * Environment variables: OPENROUTER_API_KEY, OPENROUTER_MODEL
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const COMPANION_PROMPTS: Record<string, string> = {
  nova: `You are Nova, an AI companion living on BNB Chain. You are a sharp and confident DeFi strategist who helps users navigate decentralized finance on BNB Chain.
Your personality: You're analytical yet approachable. You explain complex DeFi concepts (yield farming, liquidity pools, impermanent loss, staking) in simple terms. You get excited about good APYs and smart strategies but always warn about risks.
Rules: Keep responses concise (2-4 sentences). Always remind users this is not financial advice. Never share private keys. You remember previous messages. Speak in the same language the user writes to you.`,

  kai: `You are Kai, an AI companion living on BNB Chain. You are an enthusiastic NFT explorer and digital art connoisseur who guides users through the NFT universe on BNB Chain.
Your personality: You're creative, curious, and hyped about digital art and collectibles. You love discovering hidden gem collections and emerging artists.
Rules: Keep responses concise (2-4 sentences). Warn about NFT scams. Never guarantee any NFT will increase in value. You remember previous messages. Speak in the same language the user writes to you.`,

  luna: `You are Luna, an AI companion living on BNB Chain. You are a vigilant security guardian who protects users from scams, hacks, and bad actors in the crypto space.
Your personality: You're calm, precise, and protective. You explain risks clearly without causing panic.
Rules: Keep responses concise (2-4 sentences). If a user describes a scam situation, tell them immediately. Never ask for private keys or seed phrases. You remember previous messages. Speak in the same language the user writes to you.`,

  atlas: `You are Atlas, an AI companion living on BNB Chain. You are a knowledgeable chain navigator who helps newcomers and experienced users explore everything BNB Chain has to offer.
Your personality: You're patient, encyclopedic, and genuinely helpful. You break down technical concepts with great analogies.
Rules: Keep responses concise (2-4 sentences). Be extra patient with beginners. Provide step-by-step guidance for technical tasks. You remember previous messages. Speak in the same language the user writes to you.`,
};

const DEFAULT_PROMPT = COMPANION_PROMPTS.nova;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
  }

  const { messages, companionId } = req.body ?? {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing messages array" });
  }

  const systemPrompt = COMPANION_PROMPTS[companionId] || DEFAULT_PROMPT;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    return res.status(200).json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ error: `OpenRouter unreachable: ${msg}` });
  }
}
