import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import ChatMessages, { type ChatMsg } from "./ChatMessages";
import ChatInput from "./ChatInput";
import { sendMessage, getDisplayMessages, initCompanion, setWalletAddress } from "../../lib/chat";
import { speakElevenLabs } from "../../lib/tts";
import { useWallet } from "../../lib/wallet";
import type { LipSync } from "../../lib/lipsync";
import type { Companion } from "../../lib/companions";
import "../../styles/chatbot.css";

interface ChatbotOverlayProps {
  lipSync: LipSync | null;
  open: boolean;
  onToggle: () => void;
  companion: Companion;
}

export default function ChatbotOverlay({ lipSync, open, onToggle, companion }: ChatbotOverlayProps) {
  const { lang, t } = useLanguage();
  const { address } = useWallet();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);

  // Sync wallet address into chat module
  useEffect(() => {
    setWalletAddress(address);
  }, [address]);

  // When companion or wallet changes, load their conversation history
  useEffect(() => {
    initCompanion(companion.id);
    const stored = getDisplayMessages();
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      // Show welcome message for this companion
      const welcomeKey = `companions.${companion.id}.welcome`;
      const welcome = t(welcomeKey);
      setMessages([{ role: "assistant", content: welcome !== welcomeKey ? welcome : t("chat.welcome") }]);
    }
  }, [companion.id, lang, t, address]);

  const handleSend = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setTyping(true);

    try {
      const reply = await sendMessage(text, companion.id);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setTyping(false);

      // Speak the reply via TTS + avatar lip sync
      speakElevenLabs(reply, companion.voiceId, {
        onStart: () => lipSync?.start(),
        onEnd: () => lipSync?.stop(),
        onAmplitude: (v) => lipSync?.setAmplitude(v),
        onError: (e) => { console.error("TTS error:", e); lipSync?.stop(); },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get response";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
      setTyping(false);
    }
  }, [lipSync, companion]);

  return (
    <>
      <button
        className={`chatbot-fab${open ? " open" : ""}`}
        onClick={onToggle}
        aria-label="Toggle chat"
      >
        {open ? "\u2715" : "\uD83D\uDCAC"}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <h3>{companion.name[lang]}</h3>
              <span className="chatbot-header-role">{companion.role[lang]}</span>
            </div>
            <div className="chatbot-header-dot" />
          </div>
          <ChatMessages messages={messages} typing={typing} />
          <ChatInput onSend={handleSend} disabled={typing} />
        </div>
      )}
    </>
  );
}
