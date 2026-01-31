interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const STORAGE_PREFIX = "bnbai_chat_";

/** Connected wallet address, set externally by WalletContext */
let _walletAddress: string | null = null;

export function setWalletAddress(addr: string | null): void {
  const prev = _walletAddress;
  _walletAddress = addr;
  // When wallet connects/disconnects, reload history for active companion
  if (prev !== addr && activeCompanion) {
    history = loadHistory(activeCompanion);
  }
}

/** Generate or retrieve a persistent user ID. Uses wallet address when connected. */
function getUserId(): string {
  if (_walletAddress) return _walletAddress.toLowerCase();
  const key = "bnbai_user_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

/** Get storage key for a specific companion */
function storageKey(companionId: string): string {
  return `${STORAGE_PREFIX}${getUserId()}_${companionId}`;
}

/** Load conversation history from localStorage */
function loadHistory(companionId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(companionId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

/** Save conversation history to localStorage */
function saveHistory(companionId: string, messages: ChatMessage[]): void {
  try {
    // Keep last 50 messages to avoid storage bloat
    const trimmed = messages.slice(-50);
    localStorage.setItem(storageKey(companionId), JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

// Active companion + in-memory history
let activeCompanion = "nova";
let history: ChatMessage[] = [];

export function setActiveCompanion(companionId: string): void {
  if (companionId !== activeCompanion) {
    // Save current before switching
    if (history.length > 0) {
      saveHistory(activeCompanion, history);
    }
    activeCompanion = companionId;
    history = loadHistory(companionId);
  }
}

export function getMessages(): ChatMessage[] {
  return [...history];
}

export function getDisplayMessages(): { role: "user" | "assistant"; content: string }[] {
  return history
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

export function resetConversation(): void {
  history = [];
  saveHistory(activeCompanion, []);
}

export async function sendMessage(text: string, companionId: string): Promise<string> {
  // Make sure we're on the right companion
  if (companionId !== activeCompanion) {
    setActiveCompanion(companionId);
  }

  history.push({ role: "user", content: text });

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: history,
      companionId,
      userId: getUserId(),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Chat error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const reply: string = data.reply;

  history.push({ role: "assistant", content: reply });
  saveHistory(activeCompanion, history);
  return reply;
}

/** Initialize history for a companion (call on mount) */
export function initCompanion(companionId: string): void {
  activeCompanion = companionId;
  history = loadHistory(companionId);
}
