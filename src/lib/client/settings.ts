export type ThemeMode = "light" | "dark" | "system";

export interface AppSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  streaming: boolean;
}

export const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful, knowledgeable AI assistant. Provide accurate, useful, clear answers and follow the user's instructions.";

export const DEFAULT_SETTINGS: AppSettings = {
  model: "openrouter/free",
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  streaming: true,
};

const KEY = "openrouter-chat-settings";
const THEME_KEY = "openrouter-chat-theme";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model.trim() : DEFAULT_SETTINGS.model,
      systemPrompt:
        typeof parsed.systemPrompt === "string"
          ? parsed.systemPrompt
          : DEFAULT_SETTINGS.systemPrompt,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode); ignore silently.
  }
}

export function loadTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_KEY) as ThemeMode | null;
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

export function saveTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage errors.
  }
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  saveTheme(theme);
}
