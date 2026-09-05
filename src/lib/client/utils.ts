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
