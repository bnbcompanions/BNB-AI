import { useState, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import AvatarStage from "../AvatarStage";
import ChatMessages, { type ChatMsg } from "../chatbot/ChatMessages";
import ChatInput from "../chatbot/ChatInput";
import COMPANIONS, { type Companion } from "../../lib/companions";
import { sendMessage, getDisplayMessages, initCompanion, setWalletAddress } from "../../lib/chat";
import { speakElevenLabs } from "../../lib/tts";
import { useWallet } from "../../lib/wallet";
import type { LipSync } from "../../lib/lipsync";
import type { AvatarController } from "../../lib/avatar";
import "../../styles/chatbot.css";

interface ChatRoomSectionProps {
  companion: Companion;
  onCompanionChange: (id: string) => void;
}

export default function ChatRoomSection({ companion, onCompanionChange }: ChatRoomSectionProps) {
  const { lang, t } = useLanguage();
  const { address } = useWallet();
  const lipSyncRef = useRef<LipSync | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);

  const handleAvatarReady = useCallback((ls: LipSync, _avatar: AvatarController) => {
    lipSyncRef.current = ls;
  }, []);

  // Sync wallet address into chat module
  useEffect(() => {
    setWalletAddress(address);
  }, [address]);

  // Load conversation when companion or wallet changes
  useEffect(() => {
    initCompanion(companion.id);
    const stored = getDisplayMessages();
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      const welcomeKey = `companions.${companion.id}.welcome`;
      const welcome = t(welcomeKey);
      setMessages([{
        role: "assistant",
        content: welcome !== welcomeKey ? welcome : t("chat.welcome"),
      }]);
    }
  }, [companion.id, lang, t, address]);

  const handleSend = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setTyping(true);

    try {
      const reply = await sendMessage(text, companion.id);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setTyping(false);

      speakElevenLabs(reply, companion.voiceId, {
        onStart: () => lipSyncRef.current?.start(),
        onEnd: () => lipSyncRef.current?.stop(),
        onAmplitude: (v) => lipSyncRef.current?.setAmplitude(v),
        onError: (e) => { console.error("TTS error:", e); lipSyncRef.current?.stop(); },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get response";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
      setTyping(false);
    }
  }, [companion]);

  return (
    <section className="chatroom-section" id="chatroom">
      <h2 className="section-heading">{t("chatroom.heading")}</h2>

      {/* Companion picker */}
      <div className="chatroom-tabs">
        {COMPANIONS.map((c) => (
          <button
            key={c.id}
            className={`chatroom-tab${c.id === companion.id ? " active" : ""}`}
            onClick={() => onCompanionChange(c.id)}
          >
            <span className="chatroom-tab-initial">{c.name[lang].charAt(0)}</span>
            <span className="chatroom-tab-name">{c.name[lang]}</span>
            <span className="chatroom-tab-role">{c.role[lang]}</span>
          </button>
        ))}
      </div>

      {/* Avatar + Chat side by side */}
      <div className="chatroom-main">
        <div className="chatroom-avatar">
          <AvatarStage onReady={handleAvatarReady} vrmPath={companion.vrmFile} quality="full" lazy />
          <div className="chatroom-avatar-label">
            <strong>{companion.name[lang]}</strong>
            <span>{companion.role[lang]}</span>
          </div>
        </div>

        <div className="chatroom-chat">
          <div className="chatroom-chat-header">
            <div className="chatroom-chat-dot" />
            <span>{t("chatroom.talking_to")} <strong>{companion.name[lang]}</strong></span>
          </div>
          <ChatMessages messages={messages} typing={typing} />
          <ChatInput onSend={handleSend} disabled={typing} />
        </div>
      </div>
    </section>
  );
}
