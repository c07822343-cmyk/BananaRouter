import { Conversation } from "@/lib/shared/types";

const KEY = "openrouter-chat-conversations";
const ACTIVE_KEY = "openrouter-chat-active-conversation";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createConversation(): Conversation {
  const now = Date.now();
  return {
    id: uid(),
    title: "New conversation",
    model: null,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(conversations));
  } catch {
    // Ignore quota/storage errors.
  }
}

export function updateConversation(
  conversations: Conversation[],
  id: string,
  patch: Partial<Conversation>
): Conversation[] {
  return conversations.map((c) =>
    c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
  );
}

export function deleteConversation(
  conversations: Conversation[],
  id: string
): Conversation[] {
  const next = conversations.filter((c) => c.id !== id);
  if (getActiveConversationIdRaw() === id) {
    try {
      window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Ignore.
    }
  }
  return next;
}

export function clearConversations(): Conversation[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(KEY);
      window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Ignore.
    }
  }
  return [];
}

export function getActiveConversationId(conversations?: Conversation[]): string | null {
  const stored = getActiveConversationIdRaw();
  if (stored) return stored;
  return conversations?.[0]?.id ?? null;
}

function getActiveConversationIdRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveConversationId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Ignore.
  }
}

export { uid };
