import { useEffect, useRef } from "react";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: ChatMsg[];
  typing: boolean;
}

export default function ChatMessages({ messages, typing }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  return (
    <div className="chat-messages">
      {messages.map((m, i) => (
        <div key={i} className={`chat-bubble ${m.role}`}>
          {m.content}
        </div>
      ))}
      {typing && (
        <div className="chat-typing">
          <div className="chat-typing-dot" />
          <div className="chat-typing-dot" />
          <div className="chat-typing-dot" />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
