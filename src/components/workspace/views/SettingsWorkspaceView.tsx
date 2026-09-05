"use client";

import { useEffect, useState } from "react";
import { Settings, Cpu, Database, Shield, HelpCircle, Download, Upload, Palette, Brain, Blocks, Plug } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { loadSettings, saveSettings, applyTheme, loadTheme, AppSettings, DEFAULT_SYSTEM_PROMPT } from "@/lib/client/settings";
import { getSettingsStatus, saveSettingsToServer, testConnection, fetchModels, fetchUsage } from "@/lib/client/api";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { downloadJson, buildWorkspaceExport, parseWorkspaceImport, generateId } from "@/lib/workspace/store";

export function SettingsWorkspaceView() {
  const { state, importWorkspace, addNotification, createMemory, updateMemory, deleteMemory, upsertTemplate, deleteTemplate } = useWorkspace();
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [theme, setTheme] = useState(loadTheme());
  const [status, setStatus] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [memKey, setMemKey] = useState("");
  const [memVal, setMemVal] = useState("");
  const [tplTitle, setTplTitle] = useState("");
  const [tplContent, setTplContent] = useState("");

  useEffect(() => {
    getSettingsStatus().then(setStatus).catch(() => {});
    fetchUsage().then(setUsage).catch(() => {});
  }, []);

  const handleSaveSettings = () => {
    saveSettings(settings);
    applyTheme(theme as any);
    addNotification({ title: "Settings saved", message: "Local preferences updated.", type: "success" });
  };

  const handleSaveServer = async () => {
    try {
      const res = await saveSettingsToServer({ apiKey: apiKey || undefined, model: settings.model });
      setStatus(res);
      addNotification({ title: "Server saved", message: "OpenRouter configuration updated (key stored server-side).", type: "success" });
      setApiKey("");
    } catch (e: any) {
      addNotification({ title: "Save failed", message: e?.message ?? "Could not save server config", type: "error" });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await testConnection(settings.model);
      setTestResult(r);
    } catch (e) { setTestResult({ ok: false, message: String(e) }); }
    finally { setTesting(false); }
  };

  const handleExport = () => {
    const exp = buildWorkspaceExport(state);
    downloadJson(`workspace-backup-${new Date().toISOString().slice(0, 10)}.json`, exp);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const parsed = parseWorkspaceImport(text);
    if (!parsed.ok) { addNotification({ title: "Import failed", message: parsed.error!, type: "error" }); return; }
    importWorkspace(parsed.state as any);
    addNotification({ title: "Import complete", message: "Workspace merged from backup.", type: "success" });
    e.target.value = "";
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-6 p-4 md:p-6">
      <h1 className="flex items-center gap-2 text-xl font-medium"><Settings size={20} /> Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-white p-4 dark:bg-[#303134]">
          <h2 className="flex items-center gap-2 text-sm font-medium"><Palette size={16} /> Appearance</h2>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-medium">Theme</label>
            <div className="flex gap-1 rounded-full bg-[#f1f3f4] p-1 dark:bg-[#202124]">
              {(["light", "dark", "system"] as const).map((t) => (
                <button key={t} onClick={() => { setTheme(t as any); applyTheme(t as any); }} className={`flex-1 rounded-full px-3 py-1.5 text-xs capitalize ${theme === t ? "bg-white shadow dark:bg-[#3c4043]" : ""}`}>{t}</button>
              ))}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Material-inspired soft surfaces, familiar Google Workspace–like density.</p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 dark:bg-[#303134]">
          <h2 className="flex items-center gap-2 text-sm font-medium"><Cpu size={16} /> AI / OpenRouter</h2>
          <div className="mt-3 space-y-3">
            <label className="text-xs font-medium">Default model</label>
            <ModelSelector value={settings.model} onChange={(v) => setSettings({ ...settings, model: v })} />
            <label className="text-xs font-medium">System prompt</label>
            <textarea value={settings.systemPrompt} onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })} className="min-h-[80px] w-full rounded-xl border bg-[#f8f9fa] p-2 text-xs dark:bg-[#202124]" placeholder={DEFAULT_SYSTEM_PROMPT} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">Temperature <input type="number" step={0.1} min={0} max={2} value={settings.temperature} onChange={(e) => setSettings({ ...settings, temperature: Number(e.target.value) })} className="mt-1 w-full rounded border px-2 py-1" /></label>
              <label className="text-xs">Max tokens <input type="number" min={256} max={32768} value={settings.maxTokens} onChange={(e) => setSettings({ ...settings, maxTokens: Number(e.target.value) })} className="mt-1 w-full rounded border px-2 py-1" /></label>
            </div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.streaming} onChange={(e) => setSettings({ ...settings, streaming: e.target.checked })} /> Streaming</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settings.debugLogging} onChange={(e) => setSettings({ ...settings, debugLogging: e.target.checked })} /> Debug logging</label>
            <button onClick={handleSaveSettings} className="w-full rounded-full bg-[#b45309] py-2 text-sm font-medium text-white">Save local settings</button>
            <div className="border-t pt-3">
              <div className="text-xs font-medium">OpenRouter connection</div>
              <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Server: {status ? `${status.apiKeyConfigured ? "Key configured (" + status.apiKeySource + ")" : "No key"} • ${status.model}` : "loading…"}</div>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-or-v1-... (server-side only)" className="mt-2 w-full rounded-xl border bg-[#f8f9fa] px-3 py-2 text-sm dark:bg-[#202124]" type="password" />
              <div className="mt-2 flex gap-2">
                <button onClick={handleSaveServer} className="flex-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow">Save to server</button>
                <button onClick={handleTest} disabled={testing} className="flex-1 rounded-full bg-[#FFFBEB] px-3 py-1.5 text-xs font-medium text-[#b45309] disabled:opacity-50">{testing ? "Testing…" : "Test connection"}</button>
              </div>
              {testResult && <div className={`mt-2 rounded-xl p-2 text-xs ${testResult.ok ? "bg-[#e6f4ea] text-[#137333]" : "bg-[#fce8e6] text-[#a50e0e]"}`}>{testResult.message ?? JSON.stringify(testResult)}</div>}
              {usage && <div className="mt-2 rounded-xl bg-[#f1f3f4] p-2 text-xs dark:bg-[#202124]">{usage.message} {usage.available ? `• ${usage.usage}/${usage.limit}` : ""}</div>}
              <div className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">Free router: openrouter/free. Paid models never auto-selected when you chose free-only.</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 dark:bg-[#303134]">
          <h2 className="flex items-center gap-2 text-sm font-medium"><Database size={16} /> Workspace data</h2>
          <div className="mt-3 space-y-2 text-xs">
            <div className="rounded-xl bg-[#f1f3f4] p-2 dark:bg-[#202124]">Convs: {state.conversations.length} • Docs: {state.documents.length} • Files: {state.files.length} • Sheets: {state.spreadsheets.length} • Notes: {state.notes.length} • Tasks: {state.tasks.length}</div>
            <button onClick={handleExport} className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 font-medium shadow"><Download size={14} /> Export workspace (JSON, no secrets)</button>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border bg-[#f8f9fa] px-4 py-2 font-medium">
              <Upload size={14} /> Import backup
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Exports never include API keys. IndexedDB + localStorage, autosave ~600ms, offline ready.</p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 dark:bg-[#303134]">
          <h2 className="flex items-center gap-2 text-sm font-medium"><Shield size={16} /> Privacy</h2>
          <div className="mt-2 space-y-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            <p><strong>Local data:</strong> Docs, notes, tasks, calendar, files, chats are stored locally. Usable offline.</p>
            <p><strong>AI requests:</strong> Only minimal selected context sent to OpenRouter via your server.</p>
            <p><strong>Files:</strong> Parsed safely, searchable. Large files truncated/chunked before AI.</p>
            <p><strong>Example:</strong> “Summarize this document” sends only that document’s text (~12k chars) + your prompt.</p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 dark:bg-[#303134]">
          <h2 className="flex items-center gap-2 text-sm font-medium"><Brain size={16} /> Workspace Memory</h2>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Visible, editable, deletable. Only relevant memory sent to AI.</p>
          <div className="mt-3 space-y-2">
            {state.memories.length === 0 && <div className="rounded-xl bg-[#f1f3f4] p-3 text-xs dark:bg-[#202124]">No memories. Add “Prefer concise answers” or “This workspace is for my Roblox project.”</div>}
            {state.memories.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-xl border bg-[#f8f9fa] px-3 py-2 dark:bg-[#202124]">
                <div className="min-w-0 flex-1">
                  <div className="flex gap-1">
                    <input value={m.key} onChange={(e) => updateMemory(m.id, { key: e.target.value })} className="flex-1 rounded bg-white px-2 py-1 text-xs dark:bg-[#303134]" placeholder="key" />
                    <button onClick={() => deleteMemory(m.id)} className="rounded-full bg-white px-2 py-1 text-xs shadow dark:bg-[#303134]">Delete</button>
                  </div>
                  <input value={m.value} onChange={(e) => updateMemory(m.id, { value: e.target.value })} className="mt-1 w-full rounded bg-white px-2 py-1 text-xs dark:bg-[#303134]" placeholder="value" />
                  <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{m.scope}{m.projectId ? ` • ${state.projects.find((p) => p.id === m.projectId)?.name}` : ""}</div>
                </div>
              </div>
            ))}
            <div className="rounded-xl border bg-[#f1f3f4] p-2 dark:bg-[#202124]">
              <div className="text-xs font-medium">Add memory</div>
              <div className="mt-1 flex gap-1">
                <input value={memKey} onChange={(e) => setMemKey(e.target.value)} placeholder="e.g., preferConcise" className="flex-1 rounded border bg-white px-2 py-1 text-xs dark:bg-[#303134]" />
                <input value={memVal} onChange={(e) => setMemVal(e.target.value)} placeholder="value" className="flex-1 rounded border bg-white px-2 py-1 text-xs dark:bg-[#303134]" />
                <button onClick={() => { if (memKey.trim()) { createMemory(memKey.trim(), memVal.trim() || "true"); setMemKey(""); setMemVal(""); } }} className="rounded-full bg-[#b45309] px-3 py-1 text-xs font-medium text-white">Add</button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 dark:bg-[#303134]">
          <h2 className="flex items-center gap-2 text-sm font-medium"><Blocks size={16} /> Prompt Templates</h2>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Reusable prompts with {"{{variables}}"}.</p>
          <div className="mt-3 space-y-2">
            {state.promptTemplates.map((t) => (
              <div key={t.id} className="rounded-xl border bg-[#f8f9fa] p-2 dark:bg-[#202124]">
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs font-medium">{t.title}</span>
                  <button onClick={() => deleteTemplate(t.id)} className="rounded-full bg-white px-2 py-1 text-xs shadow">Delete</button>
                </div>
                <div className="mt-1 whitespace-pre-wrap rounded bg-white p-2 text-xs dark:bg-[#303134]">{t.content}</div>
                <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">Variables: {t.variables.join(", ") || "none"}</div>
              </div>
            ))}
            <div className="rounded-xl border bg-[#f1f3f4] p-2 dark:bg-[#202124]">
              <div className="text-xs font-medium">New template</div>
              <input value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} placeholder="Title" className="mt-1 w-full rounded border bg-white px-2 py-1 text-xs dark:bg-[#303134]" />
              <textarea value={tplContent} onChange={(e) => setTplContent(e.target.value)} placeholder="Template with {{variable}}" className="mt-1 min-h-[60px] w-full rounded border bg-white p-2 text-xs dark:bg-[#303134]" />
              <button
                onClick={() => {
                  if (!tplTitle.trim() || !tplContent.trim()) return;
                  const vars = Array.from(tplContent.matchAll(/\{\{\s*(\w+)\s*\}\}/g)).map((m) => m[1]);
                  upsertTemplate({ id: generateId("tpl"), title: tplTitle.trim(), content: tplContent.trim(), variables: Array.from(new Set(vars)), createdAt: Date.now(), updatedAt: Date.now() });
                  setTplTitle(""); setTplContent("");
                }}
                className="mt-1 w-full rounded-full bg-[#b45309] py-1.5 text-xs font-medium text-white"
              >
                Save template
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 dark:bg-[#303134]">
          <h2 className="flex items-center gap-2 text-sm font-medium"><Plug size={16} /> Integrations (future)</h2>
          <div className="mt-2 space-y-2 text-xs">
            {[
              { id: "drive", label: "Google Drive", desc: "Sync selected files/folders" },
              { id: "docs", label: "Google Docs", desc: "Open local docs in Google Docs" },
              { id: "sheets", label: "Google Sheets", desc: "Rows/cols mapping" },
              { id: "gmail", label: "Gmail", desc: "Drafts, read, search, labels" },
              { id: "calendar", label: "Google Calendar", desc: "Title, start/end, timezone" },
            ].map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-xl bg-[#f1f3f4] px-3 py-2 dark:bg-[#202124]">
                <span className="flex-1"><span className="font-medium">{it.label}</span> <span className="text-[hsl(var(--muted-foreground))]">— {it.desc}</span></span>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium dark:bg-[#303134]">Not connected</span>
              </div>
            ))}
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Architecture ready: clean interfaces. OAuth will keep tokens server-side. Never stores passwords.</p>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-4 dark:bg-[#303134] md:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-medium"><HelpCircle size={16} /> Help & about</h2>
          <div className="mt-3 grid gap-4 text-xs leading-5 md:grid-cols-2">
            <div>
              <div className="font-medium">Getting started</div>
              <ul className="mt-1 list-disc pl-5 text-[hsl(var(--muted-foreground))]">
                <li>Configure OpenRouter key → Test connection.</li>
                <li>Create a project, then docs/notes/files inside it.</li>
                <li>Use Global search or Ctrl+K palette.</li>
              </ul>
            </div>
            <div>
              <div className="font-medium">Keyboard shortcuts</div>
              <ul className="mt-1 list-disc pl-5 text-[hsl(var(--muted-foreground))]">
                <li>Ctrl/Cmd+K — Command palette</li>
                <li>Ctrl/Cmd+Shift+F — Search</li>
                <li>Esc — Close</li>
                <li>Enter — Open, Shift+Enter — New line</li>
              </ul>
            </div>
            <div>
              <div className="font-medium">Troubleshooting</div>
              <p className="text-[hsl(var(--muted-foreground))]">401 → check key at openrouter.ai/keys. Rate limit → Retry. Context limit → shorten or pick larger model.</p>
            </div>
            <div>
              <div className="font-medium">Diagnostics</div>
              <div className="mt-1 rounded-xl bg-[#f1f3f4] p-2 dark:bg-[#202124]">
                <div>App: {status?.appName ?? "BananaRouter"} v{status?.appVersion ?? "1.0.0"}</div>
                <div>Model: {settings.model}</div>
                <div>Backend: {status ? "ok" : "unknown"}</div>
                <div>Storage: IndexedDB + localStorage • offline: yes</div>
                <div>Integrations: Not connected (local only, OAuth ready)</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
