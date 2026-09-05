import { Conversation } from "@/lib/shared/types";

export function generateTitle(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New conversation";

  const words = cleaned.split(" ").filter(Boolean);
  const first = words[0] ?? "Conversation";
  const capitalized = first.charAt(0).toUpperCase() + first.slice(1);

  if (words.length <= 6) return capitalizeTitle(cleaned);

  const slice = words.slice(0, 6).join(" ");
  return `${capitalizeTitle(slice)}…`;
}

function capitalizeTitle(text: string): string {
  return text
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough English token estimate (~4 chars per token). Good enough for a UI counter.
  return Math.max(1, Math.ceil(text.length / 4));
}

export type ConversationGroupKey = "today" | "yesterday" | "week" | "older";

export interface ConversationGroup {
  key: ConversationGroupKey;
  label: string;
  conversations: Conversation[];
}

export function groupConversations(conversations: Conversation[]): ConversationGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;
  const startOfYesterday = startOfToday - dayMs;
  const sevenDaysAgo = startOfToday - 7 * dayMs;

  const buckets: Record<ConversationGroupKey, Conversation[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };

  for (const conversation of conversations) {
    const ts = conversation.updatedAt;
    if (ts >= startOfToday) buckets.today.push(conversation);
    else if (ts >= startOfYesterday) buckets.yesterday.push(conversation);
    else if (ts >= sevenDaysAgo) buckets.week.push(conversation);
    else buckets.older.push(conversation);
  }

  const labels: Record<ConversationGroupKey, string> = {
    today: "Today",
    yesterday: "Yesterday",
    week: "Previous 7 Days",
    older: "Older",
  };

  return (Object.keys(buckets) as ConversationGroupKey[])
    .map((key) => ({
      key,
      label: labels[key],
      conversations: buckets[key],
    }))
    .filter((group) => group.conversations.length > 0);
}

export interface SearchMatch {
  conversationId: string;
  messageIndex: number;
  snippet: string;
}

export interface SearchResult {
  conversation: Conversation;
  matches: SearchMatch[];
}

export function searchConversations(
  conversations: Conversation[],
  query: string
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return conversations.map((c) => ({ conversation: c, matches: [] }));

  const results: SearchResult[] = [];
  for (const conversation of conversations) {
    const titleMatch = conversation.title.toLowerCase().includes(q);
    const matches: SearchMatch[] = [];
    conversation.messages.forEach((message, index) => {
      if (message.role === "system") return;
      const content = message.content.toLowerCase();
      const idx = content.indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 24);
        const end = Math.min(message.content.length, idx + q.length + 48);
        const snippet =
          (start > 0 ? "…" : "") +
          message.content.slice(start, end) +
          (end < message.content.length ? "…" : "");
        matches.push({ conversationId: conversation.id, messageIndex: index, snippet });
      }
    });
    if (titleMatch || matches.length > 0) {
      results.push({ conversation, matches });
    }
  }
  return results;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "conversation"
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
