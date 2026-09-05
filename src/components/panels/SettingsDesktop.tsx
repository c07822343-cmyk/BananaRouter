"use client";

import { useEffect, useState } from "react";
import { loadSettings, saveSettings, loadTheme, applyTheme } from "@/lib/client/settings";
import { AppSettings } from "@/lib/client/settings";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { getServerStatus } from "@/lib/server/config";
import { Trash2, Download, Upload, Shield } from "lucide-react";

export function SettingsDesktop() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [theme, setTheme] = useState<string>("dark");
  const [tab, setTab] = useState<"ai" | "appearance" | "storage" | "developer">("ai");
  const [devMode, setDevMode] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    const t = loadTheme();
    setTheme(t);
    try {
      const v = localStorage.getItem("banana:devmode");
      setDevMode(v === "1");
    } catch {}
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setDiagnostics)
      .catch(() => {});
  }, []);

  const persist = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  if (!settings) return <div className="p-6 text-xs text-zinc-500">Loading…</div>;

  return (
    <div className="flex h-full bg-[#121214] text-zinc-300">
      <div className="w-[160px] shrink-0 border-r border-white/10 p-2">
        {[
          { id: "ai", label: "AI / OpenRouter" },
          { id: "appearance", label: "Appearance" },
          { id: "storage", label: "Storage" },
          { id: "developer", label: "Developer" },
        ].map((it) => (
          <button
            key={it.id}
            onClick={() => setTab(it.id as any)}
            className={`w-full rounded-lg px-3 py-2 text-left text-xs ${tab === it.id ? "bg-white/10 text-zinc-100" : "hover:bg-white/5 text-zinc-400"}`}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "ai" && (
          <div className="max-w-[560px] space-y-4">
            <div className="text-sm font-medium text-zinc-100">OpenRouter</div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Default model</label>
              <ModelSelector value={settings.model} onChange={(m) => persist({ ...settings, model: m })} />
              <div className="text-[11px] text-zinc-500">Free Router: openrouter/free. OpenRouter chooses the best free model. Never silently switches to paid when free-only.</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400">Temperature</label>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={2}
                  value={settings.temperature}
                  onChange={(e) => persist({ ...settings, temperature: parseFloat(e.target.value) || 0.7 })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a1e] px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Max tokens</label>
                <input
                  type="number"
                  value={settings.maxTokens}
                  onChange={(e) => persist({ ...settings, maxTokens: parseInt(e.target.value) || 2048 })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#1a1a1e] px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="text-xs font-medium">API Key</div>
              <div className="mt-1 text-xs text-zinc-500">Stored server-side only via <code className="rounded bg-white/10 px-1">OPENROUTER_API_KEY</code> or Settings → Save to server. Never in localStorage. Rotate at openrouter.ai/keys if exposed.</div>
              <input
                onChange={(e) => (e.target as any)._val = e.target.value}
                id="api-key-input"
                placeholder="sk-or-v1-..."
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#0f0f10] px-3 py-2 text-sm placeholder:text-zinc-600"
                type="password"
              />
              <button
                onClick={async () => {
                  const el = document.getElementById("api-key-input") as HTMLInputElement;
                  const v = el?.value?.trim();
                  if (!v) return;
                  const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: v }) });
                  if (res.ok) alert("Saved to server (.env.local). Key is server-only.");
                  else alert("Save failed");
                  el.value = "";
                }}
                className="mt-2 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black"
              >
                Save to server
              </button>
            </div>
            <div className="rounded-xl border border-white/10 p-3 text-xs leading-5">
              <div>App: BananaRouter · Model: {diagnostics?.model ?? settings.model}</div>
              <div>Key: {diagnostics?.apiKeyConfigured ? `configured via ${diagnostics?.apiKeySource}` : "missing — add in .env.local or above"}</div>
              <div className="text-zinc-500">OPENROUTER_API_KEY, OPENROUTER_MODEL=openrouter/free, APP_NAME=BananaRouter</div>
            </div>
          </div>
        )}
        {tab === "appearance" && (
          <div className="max-w-[480px] space-y-4">
            <div className="text-sm font-medium text-zinc-100">Appearance</div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setTheme("dark"); applyTheme("dark" as any); try{localStorage.setItem("theme","dark")}catch{}}} className={`rounded-full px-3 py-1.5 text-xs border ${theme === "dark" ? "bg-white text-black" : "border-white/10"}`}>
                Dark
              </button>
              <button onClick={() => { setTheme("light"); applyTheme("light" as any); try{localStorage.setItem("theme","light")}catch{}}} className={`rounded-full px-3 py-1.5 text-xs border ${theme === "light" ? "bg-white text-black" : "border-white/10"}`}>
                Light
              </button>
            </div>
            <div className="text-xs text-zinc-500">Default is dark — subtle layers: background / surface / elevated. Banana icon provides brand.</div>
          </div>
        )}
        {tab === "storage" && (
          <div className="max-w-[560px] space-y-3">
            <div className="text-sm font-medium text-zinc-100">Storage</div>
            <div className="text-xs text-zinc-500">Sessions, preferences, workspace metadata locally. No secret in browser storage.</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const data = localStorage.getItem("openrouter-workspace-v2");
                  if (!data) return alert("No workspace data");
                  const blob = new Blob([data], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "bananarouter-workspace.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs"
              >
                <Download size={12} /> Export
              </button>
              <label className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs cursor-pointer">
                <Upload size={12} /> Import
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    try {
                      const j = JSON.parse(text);
                      if (!j.version) throw new Error("Invalid");
                      localStorage.setItem("openrouter-workspace-v2", JSON.stringify(j));
                      alert("Imported — reload");
                    } catch {
                      alert("Invalid file");
                    }
                  }}
                />
              </label>
              <button
                onClick={() => {
                  if (confirm("Clear all local data?")) {
                    localStorage.removeItem("openrouter-workspace-v2");
                    localStorage.removeItem("banana:devmode");
                    alert("Cleared — reload");
                    location.reload();
                  }
                }}
                className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/20 px-3 py-1.5 text-xs text-red-400"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
        )}
        {tab === "developer" && (
          <div className="max-w-[640px] space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-100">Developer</div>
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={devMode}
                  onChange={(e) => {
                    setDevMode(e.target.checked);
                    try {
                      localStorage.setItem("banana:devmode", e.target.checked ? "1" : "0");
                    } catch {}
                  }}
                />
                Enable
              </label>
            </div>
            {!devMode && <div className="text-xs text-zinc-500">Developer mode is off. Enable to see requests, tool calls, MCP status, duration, tokens.</div>}
            {devMode && (
              <div className="space-y-2">
                <div className="rounded-xl border border-white/10 bg-[#1a1a1e] p-3 text-xs leading-5">
                  <div>Model: {settings.model} · Streaming: {settings.streaming ? "yes" : "no"}</div>
                  <div>Status: {diagnostics?.apiKeyConfigured ? "connected" : "missing key"}</div>
                  <div>Tokens: max {settings.maxTokens} · temp {settings.temperature}</div>
                </div>
                <RequestInspector />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestInspector() {
  const [log, setLog] = useState<any[]>([]);
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e.detail;
      if (detail) setLog((prev) => [detail, ...prev].slice(0, 20));
    };
    window.addEventListener("bananarouter:request" as any, handler as any);
    return () => window.removeEventListener("bananarouter:request" as any, handler as any);
  }, []);
  if (log.length === 0) return <div className="text-xs text-zinc-500">No requests yet. Send a message.</div>;
  return (
    <div className="space-y-2">
      {log.map((r, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-200">{r.model}</span>
            <span className="text-zinc-500">· {r.durationMs}ms · {r.status}</span>
            {r.toolsUsed?.length ? <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-300">{r.toolsUsed.length} tools</span> : null}
          </div>
          <div className="mt-1 text-zinc-400">msgs: {r.messageCount} · in: {r.inputSize} · out: {r.outputSize}</div>
          {r.toolsAvailable && <div className="text-zinc-500">tools avail: {r.toolsAvailable}</div>}
        </div>
      ))}
    </div>
  );
}
