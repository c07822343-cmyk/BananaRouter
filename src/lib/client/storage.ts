import { ChatMessage, Conversation } from "@/lib/shared/types";

const LS_KEY = "openrouter-chat-conversations";
const ACTIVE_KEY = "openrouter-chat-active-conversation";
const IDB_NAME = "openrouter-chat";
const IDB_STORE = "conversations";
const IDB_KEY = "conversations";

const IDB_THRESHOLD_CHARS = 300_000;
const IDB_THRESHOLD_COUNT = 40;

export function uid(): string {
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

function withId(message: ChatMessage, prefix: string): ChatMessage {
  if (message.id) return message;
  return { ...message, id: `${prefix}-${uid()}` };
}

export function ensureMessageIds(conversation: Conversation): Conversation {
  let index = 0;
  return {
    ...conversation,
    messages: conversation.messages.map((m, i) => {
      if (m.id) return m;
      index += 1;
      return { ...m, id: `${conversation.id}-m${i}-${index}` };
    }),
  };
}

// --- Storage adapter: localStorage cache + IndexedDB for larger histories ---

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function idbRead(): Promise<Conversation[] | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.get(IDB_KEY);
    request.onsuccess = () => {
      const value = request.result as Conversation[] | undefined;
      resolve(Array.isArray(value) ? value : null);
      db.close();
    };
    request.onerror = () => {
      resolve(null);
      db.close();
    };
  });
}

async function idbWrite(list: Conversation[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    store.put(list, IDB_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function idbDelete(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      resolve();
    };
  });
}

function lsRead(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages))
      .map(ensureMessageIds)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function lsWrite(list: Conversation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    // Ignore quota/storage errors; IndexedDB remains canonical for large data.
  }
}

function lsDelete(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY);
  } catch {
    // Ignore.
  }
}

function isLarge(list: Conversation[]): boolean {
  const count = list.length;
  const chars = JSON.stringify(list).length;
  return count > IDB_THRESHOLD_COUNT || chars > IDB_THRESHOLD_CHARS;
}

/**
 * Loads conversations. IndexedDB is preferred when it contains data; otherwise
 * migrate from localStorage. Returns a plain array.
 */
export async function loadConversations(): Promise<Conversation[]> {
  if (typeof window === "undefined") return [];
  const fromIdb = await idbRead();
  if (fromIdb) {
    const list = fromIdb.map(ensureMessageIds).sort((a, b) => b.updatedAt - a.updatedAt);
    // Keep the localStorage cache fresh.
    lsWrite(list);
    return list;
  }
  const fromLs = lsRead();
  if (fromLs.length > 0 && isLarge(fromLs)) {
    await idbWrite(fromLs).catch(() => undefined);
  }
  return fromLs;
}

export async function saveConversations(conversations: Conversation[]): Promise<void> {
  const list = conversations.map(ensureMessageIds);
  // Always keep a lightweight localStorage cache; persist large datasets to IDB too.
  lsWrite(list.slice(0, 1000));
  if (isLarge(list)) {
    await idbWrite(list).catch(() => undefined);
  } else {
    await idbDelete().catch(() => undefined);
  }
}

export function updateConversation(
  conversations: Conversation[],
  id: string,
  patch: Partial<Conversation>
): Conversation[] {
  return conversations.map((c) =>
    c.id === id ? ensureMessageIds({ ...c, ...patch, updatedAt: Date.now() }) : c
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

export async function clearConversations(): Promise<Conversation[]> {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Ignore.
    }
  }
  lsDelete();
  await idbDelete().catch(() => undefined);
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

// --- Export / import ---

export function conversationToJson(conversation: Conversation): string {
  return JSON.stringify(conversation, null, 2);
}

export function conversationsToJson(conversations: Conversation[]): string {
  return JSON.stringify(
    {
      app: "OpenRouter Chat",
      version: 1,
      exportedAt: new Date().toISOString(),
      conversations,
    },
    null,
    2
  );
}

export function conversationToMarkdown(conversation: Conversation): string {
  const lines: string[] = [
    `# ${conversation.title}`,
    "",
    `_Exported from OpenRouter Chat_`,
    "",
  ];
  for (const message of conversation.messages) {
    const role = message.role === "user" ? "You" : "Assistant";
    lines.push(`## ${role}`, "", message.content.trim(), "");
  }
  return lines.join("\n");
}

export interface ImportResult {
  ok: boolean;
  conversations: Conversation[];
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false;
  const role = value.role;
  const content = value.content;
  return (
    (role === "user" || role === "assistant" || role === "system") &&
    typeof content === "string"
  );
}

function validConversation(value: unknown): value is Conversation {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    Array.isArray(value.messages) &&
    value.messages.every(validMessage)
  );
}

/** Imports a JSON backup. Never executes imported content; only parses it. */
export function parseConversationsImport(raw: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, conversations: [], error: "The file is not valid JSON." };
  }

  let source: unknown[];
  if (Array.isArray(data)) {
    source = data;
  } else if (isRecord(data) && Array.isArray(data.conversations)) {
    source = data.conversations;
  } else if (isRecord(data) && validConversation(data)) {
    source = [data];
  } else {
    return {
      ok: false,
      conversations: [],
      error:
        "Unsupported file. Expected an array of conversations or an export object with a `conversations` array.",
    };
  }

  const invalid = source.filter((c) => !validConversation(c));
  if (invalid.length > 0) {
    return {
      ok: false,
      conversations: [],
      error: `${invalid.length} conversation(s) in the file are invalid or use an unsupported format.`,
    };
  }

  const existingIds = new Set<string>();
  const conversations = source.map((c) => {
    const base = c as Conversation;
    let id = base.id;
    if (!id || existingIds.has(id)) {
      id = uid();
    }
    existingIds.add(id);
    return ensureMessageIds({
      ...base,
      id,
      model: base.model ?? null,
      messages: base.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.id ? { id: m.id } : {}),
        ...(m.feedback ? { feedback: m.feedback } : {}),
        ...(m.interrupted ? { interrupted: m.interrupted } : {}),
      })),
    });
  });

  conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  return { ok: true, conversations };
}

export function downloadText(filename: string, content: string, type = "application/json"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export { uid as generateId };
