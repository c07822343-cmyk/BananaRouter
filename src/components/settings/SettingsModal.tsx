"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  X,
  Check,
  Loader2,
  KeyRound,
  Palette,
  SlidersHorizontal,
  ShieldCheck,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  AppSettings,
  ThemeMode,
  DEFAULT_SYSTEM_PROMPT,
} from "@/lib/client/settings";
import {
  saveSettingsToServer,
  testConnection,
  getSettingsStatus,
} from "@/lib/client/api";
import { ModelSelector } from "./ModelSelector";
import { SettingsStatus } from "@/lib/shared/types";

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
  onClearHistory: () => void;
  onClearAllLocalData: () => void;
}

type Tab = "api" | "appearance" | "chat" | "privacy";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "api", label: "API", icon: <KeyRound size={14} /> },
  { id: "appearance", label: "Appearance", icon: <Palette size={14} /> },
  { id: "chat", label: "Chat", icon: <SlidersHorizontal size={14} /> },
  { id: "privacy", label: "Privacy", icon: <ShieldCheck size={14} /> },
];

export function SettingsModal({
  open,
  settings,
  theme,
  onThemeChange,
  onSave,
  onClose,
  onClearHistory,
  onClearAllLocalData,
}: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("api");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(settings.model);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [streaming, setStreaming] = useState(settings.streaming);
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setModel(settings.model);
    setTemperature(settings.temperature);
    setMaxTokens(settings.maxTokens);
    setSystemPrompt(settings.systemPrompt);
    setStreaming(settings.streaming);
    setApiKey("");
    setTestResult(null);
    setSaved(false);
    setTab("api");
    getSettingsStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [open, settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    onSave({
      model: model.trim() || "openrouter/free",
      temperature: Number(temperature) || 0.7,
      maxTokens: Math.max(1, Math.min(32768, Number(maxTokens) || 4096)),
      systemPrompt: systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
      streaming,
    });
    try {
      const nextStatus = await saveSettingsToServer({
        apiKey: apiKey.trim() || undefined,
        model: model.trim() || undefined,
      });
      setStatus(nextStatus);
      setApiKey("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Could not save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(model.trim() || "openrouter/free");
      setTestResult({
        ok: res.ok,
        message: res.message ?? (res.ok ? "Connection successful." : "Connection failed."),
      });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Connection test failed.",
      });
    } finally {
      setTesting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <button
        aria-label="Close settings"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-3.5">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            aria-label="Close settings"
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-hidden md:flex-row">
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-[hsl(var(--border))] px-3 py-2 md:w-44 md:flex-col md:border-b-0 md:border-r md:py-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  "focus-ring flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  tab === t.id
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {tab === "api" && (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="settings-api-key"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    OpenRouter API key
                  </label>
                  <input
                    id="settings-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    placeholder={
                      status?.apiKeyConfigured
                        ? "Server key is configured"
                        : "sk-or-v1-…"
                    }
                    className="focus-ring w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                  />
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    Keys are sent to your server and stored in .env.local. They are
                    never stored in the browser. Production deployments should use a
                    server-side environment variable or secure secret storage.
                    Current source:{" "}
                    <span className="font-medium">
                      {status?.apiKeySource ?? "unknown"}
                    </span>
                    .
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Model
                  </label>
                  <ModelSelector value={model} onChange={setModel} />
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    Default: <code className="rounded bg-[hsl(var(--muted))] px-1">openrouter/free</code>. Uses OpenRouter free-model routing.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="focus-ring flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
                    {saved ? "Saved" : "Save"}
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                  >
                    {testing ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Test connection
                  </button>
                </div>

                {testResult && (
                  <div
                    className={clsx(
                      "rounded-lg border px-3 py-2 text-sm",
                      testResult.ok
                        ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300"
                        : "border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5 text-[hsl(var(--destructive))]"
                    )}
                  >
                    {testResult.message}
                  </div>
                )}
              </div>
            )}

            {tab === "appearance" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => onThemeChange(mode)}
                        className={clsx(
                          "focus-ring rounded-lg border px-3 py-2 text-sm capitalize transition",
                          theme === mode
                            ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                            : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  System mode follows your operating system&apos;s light/dark
                  preference.
                </p>
              </div>
            )}

            {tab === "chat" && (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="settings-temperature"
                    className="mb-1.5 flex items-center justify-between text-sm font-medium"
                  >
                    <span>Temperature</span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {Number(temperature).toFixed(2)}
                    </span>
                  </label>
                  <input
                    id="settings-temperature"
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--primary))]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-max-tokens"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Maximum output tokens
                  </label>
                  <input
                    id="settings-max-tokens"
                    type="number"
                    min={1}
                    max={32768}
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="focus-ring w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-system-prompt"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    System prompt
                  </label>
                  <textarea
                    id="settings-system-prompt"
                    rows={5}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="focus-ring w-full resize-y rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm leading-6"
                  />
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    Included as the system message before your conversation.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border))] px-3 py-3">
                  <div>
                    <div className="text-sm font-medium">Streaming responses</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      Show text progressively as it&apos;s generated.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={streaming}
                    onChange={(e) => setStreaming(e.target.checked)}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                </label>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="focus-ring flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
                  {saved ? "Saved" : "Save"}
                </button>
              </div>
            )}

            {tab === "privacy" && (
              <div className="space-y-5">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Conversation history is stored in your browser&apos;s local
                  storage. Your OpenRouter API key is stored on the server or in
                  the environment.
                </p>
                <button
                  onClick={() => {
                    onClearHistory();
                    setStatus((s) => s);
                  }}
                  className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--destructive))]/40 px-4 py-2 text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/5"
                >
                  <Trash2 size={14} />
                  Clear conversation history
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Clear all local application data including conversations, settings, and theme?"
                      )
                    ) {
                      onClearAllLocalData();
                      onClose();
                    }
                  }}
                  className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--destructive))]/40 px-4 py-2 text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/5"
                >
                  <Trash2 size={14} />
                  Clear all local application data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
