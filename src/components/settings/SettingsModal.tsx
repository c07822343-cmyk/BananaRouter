"use client";

import { useEffect, useRef, useState } from "react";
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
  Info,
  Download,
  Upload,
  MoreVertical,
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
  fetchModels,
  fetchUsage,
} from "@/lib/client/api";
import { ModelSelector } from "./ModelSelector";
import { AppInfo } from "@/components/layout/AppShell";
import { ModelInfo, SettingsStatus, UsageInfo } from "@/lib/shared/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface SettingsModalProps {
  open: boolean;
  settings: AppSettings;
  theme: ThemeMode;
  appInfo: AppInfo;
  onThemeChange: (theme: ThemeMode) => void;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
  onClearHistory: () => void;
  onClearAllLocalData: () => void;
  onExportCurrent: () => void;
  onExportAll: () => void;
  onImport: (json: string) => Promise<{ ok: boolean; error?: string }>;
}

type Tab =
  | "general"
  | "appearance"
  | "ai"
  | "openrouter"
  | "chat"
  | "privacy"
  | "advanced";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "general", label: "General", icon: <Info size={14} /> },
  { id: "appearance", label: "Appearance", icon: <Palette size={14} /> },
  { id: "ai", label: "AI", icon: <SlidersHorizontal size={14} /> },
  { id: "openrouter", label: "OpenRouter", icon: <KeyRound size={14} /> },
  { id: "chat", label: "Chat", icon: <SlidersHorizontal size={14} /> },
  { id: "privacy", label: "Privacy", icon: <ShieldCheck size={14} /> },
  { id: "advanced", label: "Advanced", icon: <MoreVertical size={14} /> },
];

export function SettingsModal({
  open,
  settings,
  theme,
  appInfo,
  onThemeChange,
  onSave,
  onClose,
  onClearHistory,
  onClearAllLocalData,
  onExportCurrent,
  onExportAll,
  onImport,
}: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("general");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(settings.model);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [streaming, setStreaming] = useState(settings.streaming);
  const [enhancePrompt, setEnhancePrompt] = useState(settings.enhancePrompt);
  const [requestTimeout, setRequestTimeout] = useState(settings.requestTimeout);
  const [debugLogging, setDebugLogging] = useState(settings.debugLogging);
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsSource, setModelsSource] = useState<"idle" | "openrouter" | "config">("idle");
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setModel(settings.model);
    setTemperature(settings.temperature);
    setMaxTokens(settings.maxTokens);
    setSystemPrompt(settings.systemPrompt);
    setStreaming(settings.streaming);
    setEnhancePrompt(settings.enhancePrompt);
    setRequestTimeout(settings.requestTimeout);
    setDebugLogging(settings.debugLogging);
    setApiKey("");
    setTestResult(null);
    setSaved(false);
    setTab("general");
    getSettingsStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [open, settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const next: AppSettings = {
      model: model.trim() || "openrouter/free",
      temperature: Number(temperature) || 0.7,
      maxTokens: Math.max(1, Math.min(32768, Number(maxTokens) || 4096)),
      systemPrompt: systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
      streaming,
      enhancePrompt,
      requestTimeout: Math.min(300, Math.max(5, Number(requestTimeout) || 120)),
      debugLogging,
    };
    onSave(next);
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
        message:
          res.message ??
          (res.ok
            ? `Connection successful${res.latencyMs ? ` (${res.latencyMs}ms)` : ""}.`
            : "Connection failed."),
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

  const handleRefreshModels = async () => {
    setModelsLoading(true);
    try {
      const result = await fetchModels();
      setModels(result.models);
      setModelsSource(result.source);
    } catch (err) {
      setModelsSource("config");
      setModels([]);
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Could not refresh models.",
      });
    } finally {
      setModelsLoading(false);
    }
  };

  const handleFetchUsage = async () => {
    const result = await fetchUsage();
    setUsage(result);
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const result = await onImport(text);
      setImportResult({
        ok: result.ok,
        message: result.ok
          ? "Conversations imported successfully."
          : result.error ?? "Import failed.",
      });
    } catch (err) {
      setImportResult({
        ok: false,
        message: err instanceof Error ? err.message : "Could not read the file.",
      });
    }
  };

  useEffect(() => {
    if (!open || tab !== "openrouter") return;
    if (status?.apiKeyConfigured) {
      void handleRefreshModels();
      void handleFetchUsage();
    } else {
      setUsage(null);
      setModels([]);
      setModelsSource("idle");
    }
  }, [open, tab, status?.apiKeyConfigured]);

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
      <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
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
            {tab === "general" && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Application</h3>
                <div className="rounded-lg border border-[hsl(var(--border))] p-3">
                  <div className="text-sm font-medium">{appInfo.appName}</div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {appInfo.appDescription}
                  </p>
                  <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                    Version {appInfo.appVersion}
                  </p>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Change the app name and description centrally by setting{" "}
                  <code className="rounded bg-[hsl(var(--muted))] px-1">APP_NAME</code>{" "}
                  and{" "}
                  <code className="rounded bg-[hsl(var(--muted))] px-1">APP_DESCRIPTION</code>{" "}
                  in <code className="rounded bg-[hsl(var(--muted))] px-1">.env.local</code>.
                </p>
              </div>
            )}

            {tab === "appearance" && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Theme</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => onThemeChange(mode)}
                      className={clsx(
                        "focus-ring rounded-lg border px-3 py-2.5 text-sm capitalize transition",
                        theme === mode
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                          : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  System mode follows your operating system&apos;s light/dark
                  preference.
                </p>
              </div>
            )}

            {tab === "ai" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold">AI settings</h3>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Model</label>
                  <ModelSelector value={model} onChange={setModel} />
                </div>

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

                <SaveButton saving={saving} saved={saved} onClick={handleSave} />
              </div>
            )}

            {tab === "openrouter" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold">OpenRouter configuration</h3>
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
                    Keys are sent to your server and stored in .env.local. They
                    are never stored in the browser. Current source:{" "}
                    <span className="font-medium">
                      {status?.apiKeySource ?? "unknown"}
                    </span>
                    . Production deployments should use a real server-side
                    environment variable or secure secret store.
                  </p>
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    If you believe a key was exposed, rotate it immediately at{" "}
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-[hsl(var(--primary))] underline underline-offset-2"
                    >
                      openrouter.ai/keys
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Default model</label>
                  <ModelSelector value={model} onChange={setModel} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <SaveButton saving={saving} saved={saved} onClick={handleSave} />
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                  >
                    {testing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Test connection
                  </button>
                  <button
                    onClick={handleRefreshModels}
                    disabled={modelsLoading}
                    className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                  >
                    {modelsLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    Refresh models
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

                {modelsSource === "openrouter" && (
                  <div className="rounded-lg border border-[hsl(var(--border))] p-3">
                    <div className="mb-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      Loaded {models.length} models from OpenRouter.
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {models.slice(0, 30).map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-2 border-b border-[hsl(var(--border))/50 py-1.5 text-xs last:border-0"
                        >
                          <span className="truncate">{m.name}</span>
                          <span
                            className={clsx(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                              m.free
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {m.free ? "Free" : "Paid"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <button
                      onClick={handleFetchUsage}
                      className="focus-ring text-xs font-medium text-[hsl(var(--primary))] hover:underline"
                    >
                      Load usage information
                    </button>
                  </div>
                  {usage && (
                    <div className="rounded-lg border border-[hsl(var(--border))] p-3 text-xs">
                      {usage.available ? (
                        <div className="space-y-1 text-[hsl(var(--muted-foreground))]">
                          <div>
                            Usage:{" "}
                            <span className="font-medium text-[hsl(var(--foreground))]">
                              {usage.usage?.toLocaleString() ?? "—"}
                            </span>
                            {usage.limit !== undefined && (
                              <>
                                {" "}/ {usage.limit.toLocaleString()}
                              </>
                            )}
                          </div>
                          {usage.isFreeTier !== undefined && (
                            <div>Free tier: {usage.isFreeTier ? "yes" : "no"}</div>
                          )}
                          {usage.reset && <div>Reset: {usage.reset}</div>}
                        </div>
                      ) : (
                        <div className="text-[hsl(var(--muted-foreground))]">
                          Usage information unavailable.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "chat" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold">Chat behavior</h3>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border))] px-3 py-3">
                  <div>
                    <div className="text-sm font-medium">Enable prompt enhancement</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      Adds an optional Enhance button that creates an extra AI
                      request when you click it.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enhancePrompt}
                    onChange={(e) => setEnhancePrompt(e.target.checked)}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border))] px-3 py-3">
                  <div>
                    <div className="text-sm font-medium">Message actions</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      Copy, regenerate, thumbs, retry, and edit are always
                      available.
                    </div>
                  </div>
                  <Check size={16} className="text-[hsl(var(--primary))]" />
                </label>

                <SaveButton saving={saving} saved={saved} onClick={handleSave} />
              </div>
            )}

            {tab === "privacy" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold">Privacy and data</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Conversation history is stored in your browser (localStorage
                  and IndexedDB for larger histories). Your OpenRouter API key is
                  stored on the server or environment only.
                </p>

                <div className="rounded-lg border border-[hsl(var(--border))] p-3">
                  <div className="mb-2 text-sm font-medium">Export</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={onExportCurrent}
                      className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]"
                    >
                      <Download size={14} />
                      Current conversation
                    </button>
                    <button
                      onClick={onExportAll}
                      className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]"
                    >
                      <Download size={14} />
                      All conversations
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-[hsl(var(--border))] p-3">
                  <div className="mb-2 text-sm font-medium">Import</div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImportFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="focus-ring flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--muted))]"
                  >
                    <Upload size={14} />
                    Import JSON
                  </button>
                  {importResult && (
                    <div
                      className={clsx(
                        "mt-2 rounded-lg px-3 py-2 text-xs",
                        importResult.ok
                          ? "bg-green-500/5 text-green-700 dark:text-green-300"
                          : "bg-[hsl(var(--destructive))]/5 text-[hsl(var(--destructive))]"
                      )}
                    >
                      {importResult.message}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setClearConfirm(true)}
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
                    Clear all local data
                  </button>
                </div>

                <ConfirmDialog
                  open={clearConfirm}
                  title="Clear conversation history?"
                  description="This permanently removes all conversations from this browser."
                  confirmLabel="Clear"
                  tone="danger"
                  onCancel={() => setClearConfirm(false)}
                  onConfirm={() => {
                    onClearHistory();
                    setClearConfirm(false);
                  }}
                />
              </div>
            )}

            {tab === "advanced" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold">Advanced</h3>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border))] px-3 py-3">
                  <div>
                    <div className="text-sm font-medium">Debug logging</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      Shows non-sensitive request info in the chat area.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={debugLogging}
                    onChange={(e) => setDebugLogging(e.target.checked)}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                </label>

                <div>
                  <label
                    htmlFor="settings-request-timeout"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Request timeout (seconds)
                  </label>
                  <input
                    id="settings-request-timeout"
                    type="number"
                    min={5}
                    max={300}
                    value={requestTimeout}
                    onChange={(e) => setRequestTimeout(Number(e.target.value))}
                    className="focus-ring w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                  />
                  <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    Applies to OpenRouter requests. Larger values allow slower
                    model responses.
                  </p>
                </div>

                <div className="rounded-lg border border-[hsl(var(--border))] p-3 text-xs text-[hsl(var(--muted-foreground))]">
                  <div className="mb-2 font-semibold text-[hsl(var(--foreground))]">
                    Developer information
                  </div>
                  <div>App name: {appInfo.appName}</div>
                  <div>Version: {appInfo.appVersion}</div>
                  <div>
                    API key source: {status?.apiKeySource ?? "unknown"}
                  </div>
                  <div>Default model: {status?.model ?? "openrouter/free"}</div>
                </div>

                <SaveButton saving={saving} saved={saved} onClick={handleSave} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveButton({
  saving,
  saved,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="focus-ring flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
    >
      {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
