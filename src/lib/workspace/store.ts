"use client";

import { WorkspaceState, WORKSPACE_VERSION, ID, BaseEntity } from "./types";
import { Conversation } from "@/lib/shared/types";
import { loadConversations as loadLegacyConversations } from "@/lib/client/storage";

const LS_KEY = "openrouter-workspace-v2";
const ACTIVE_PROJECT_KEY = "openrouter-active-project";
const IDB_NAME = "openrouter-chat";
const IDB_STORE = "workspaces";
const IDB_KEY = "workspace-v2";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateId(prefix = ""): string {
  return prefix ? `${prefix}_${uid()}` : uid();
}

export function now(): number {
  return Date.now();
}

function defaultState(): WorkspaceState {
  return {
    version: WORKSPACE_VERSION,
    projects: [],
    folders: [],
    files: [],
    documents: [],
    spreadsheets: [],
    notes: [],
    tasks: [],
    emailDrafts: [],
    calendarEvents: [],
    conversations: [],
    promptTemplates: [
      {
        id: "tpl_summarize",
        title: "Summarize in 5 bullets",
        content: "Summarize the following in 5 concise bullet points:\n\n{{content}}",
        variables: ["content"],
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: "tpl_rewrite",
        title: "Rewrite for audience",
        content: "Rewrite this for {{audience}} in a {{tone}} tone:\n\n{{content}}",
        variables: ["audience", "tone", "content"],
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    memories: [],
    notifications: [],
    activeProjectId: null,
  };
}

// IndexedDB helpers
function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("conversations")) db.createObjectStore("conversations");
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

async function idbGet(): Promise<WorkspaceState | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(IDB_KEY);
    req.onsuccess = () => {
      resolve((req.result as WorkspaceState) || null);
      db.close();
    };
    req.onerror = () => {
      resolve(null);
      db.close();
    };
  });
}

async function idbSet(state: WorkspaceState): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(state, IDB_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function lsGet(): WorkspaceState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.version === "number") return parsed as WorkspaceState;
  } catch {}
  return null;
}

function lsSet(state: WorkspaceState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

export async function loadWorkspace(): Promise<WorkspaceState> {
  // try IDB first, then LS, then legacy conversations
  const fromIdb = await idbGet().catch(() => null);
  if (fromIdb && fromIdb.version === WORKSPACE_VERSION) {
    lsSet(fromIdb);
    return migrateIfNeeded(fromIdb);
  }
  const fromLs = lsGet();
  if (fromLs) {
    const migrated = migrateIfNeeded(fromLs);
    // ensure IDB cache
    idbSet(migrated).catch(() => {});
    return migrated;
  }
  // migration from legacy conversations
  const legacy = await loadLegacyConversations().catch(() => [] as Conversation[]);
  const def = defaultState();
  def.conversations = legacy as Conversation[];
  // try to seed example data if empty
  if (def.conversations.length === 0 && def.documents.length === 0 && def.notes.length === 0) {
    seedExamples(def);
  }
  await saveWorkspace(def);
  return def;
}

function migrateIfNeeded(state: WorkspaceState): WorkspaceState {
  if (!state.version || state.version < WORKSPACE_VERSION) {
    return { ...defaultState(), ...state, version: WORKSPACE_VERSION };
  }
  // ensure arrays exist
  const def = defaultState();
  for (const k of Object.keys(def) as (keyof WorkspaceState)[]) {
    if (!(k in state) || (state as any)[k] == null) (state as any)[k] = (def as any)[k];
  }
  if (state.promptTemplates.length === 0) state.promptTemplates = def.promptTemplates;
  return state;
}

function seedExamples(state: WorkspaceState) {
  const t = now();
  state.notes.push(
    {
      id: generateId("note"),
      title: "Welcome to your workspace",
      content: "This is your Keep-style notes. Pin, color, and turn notes into documents or tasks with AI.",
      labels: ["welcome"],
      color: "default",
      pinned: true,
      archived: false,
      createdAt: t,
      updatedAt: t,
      starred: false,
      trashed: false,
    },
    {
      id: generateId("note"),
      title: "Meeting ideas",
      content: "Brainstorm Q1 roadmap:\n- AI workspace polish\n- Drive integration\n- Sheets analysis",
      labels: ["ideas"],
      color: "yellow",
      pinned: false,
      archived: false,
      createdAt: t - 1000,
      updatedAt: t - 1000,
      starred: false,
      trashed: false,
    }
  );
  state.documents.push({
    id: generateId("doc"),
    title: "Welcome Document",
    content: "# Welcome to OpenRouter Workspace\n\nThis is a Google Docs–style document. Try the **AI tools** in the toolbar: Rewrite, Summarize, Fix grammar, Change tone, Continue writing.\n\n## Features\n\n- Rich text basics\n- AI rewrite with preview\n- Version history\n- Export\n\n> The workspace keeps everything local until you ask AI — then only the selected context is sent to OpenRouter.",
    createdAt: t,
    updatedAt: t,
    starred: false,
    trashed: false,
  });
  state.tasks.push(
    {
      id: generateId("task"),
      title: "Configure OpenRouter key",
      description: "Add your API key in Settings → OpenRouter and test the connection.",
      completed: false,
      priority: "high",
      dueAt: t + 86400000,
      createdAt: t,
      updatedAt: t,
      starred: false,
      trashed: false,
    },
    {
      id: generateId("task"),
      title: "Import a file to Drive",
      description: "Try File → Upload and then Ask AI about the file.",
      completed: false,
      priority: "medium",
      createdAt: t,
      updatedAt: t,
      starred: false,
      trashed: false,
    }
  );
  state.emailDrafts.push({
    id: generateId("email"),
    to: "",
    subject: "Welcome to your mail drafts",
    body: "Hi team,\n\nThis is a local draft. Use AI to rewrite, shorten, or make it more professional. Nothing is sent until you configure a real email integration.\n\nBest",
    labels: ["welcome"],
    createdAt: t,
    updatedAt: t,
    starred: false,
    trashed: false,
  });
  state.calendarEvents.push({
    id: generateId("evt"),
    title: "Kickoff: Workspace setup",
    description: "Plan the week and organize files.",
    start: t + 2 * 86400000,
    end: t + 2 * 86400000 + 3600000,
    location: "Home",
    color: "#1a73e8",
    createdAt: t,
    updatedAt: t,
    starred: false,
    trashed: false,
  });
  state.spreadsheets.push({
    id: generateId("sheet"),
    title: "Sample Dataset",
    createdAt: t,
    updatedAt: t,
    starred: false,
    trashed: false,
    sheets: [
      {
        id: generateId("sh"),
        title: "Sheet1",
        rows: 6,
        cols: 4,
        cells: {
          "0:0": { value: "Product" }, "0:1": { value: "Q1" }, "0:2": { value: "Q2" }, "0:3": { value: "Growth" },
          "1:0": { value: "Widget A" }, "1:1": { value: "120" }, "1:2": { value: "150" }, "1:3": { value: "25%" },
          "2:0": { value: "Widget B" }, "2:1": { value: "80" }, "2:2": { value: "95" }, "2:3": { value: "18%" },
          "3:0": { value: "Gadget X" }, "3:1": { value: "200" }, "3:2": { value: "210" }, "3:3": { value: "5%" },
        },
      },
    ],
  });
  state.folders.push({ id: generateId("fld"), name: "Projects", parentId: null, createdAt: t, updatedAt: t, starred: false, trashed: false });
  state.projects.push({ id: generateId("proj"), name: "Personal Workspace", description: "Default project", createdAt: t, updatedAt: t, starred: false, trashed: false });
}

export async function saveWorkspace(state: WorkspaceState): Promise<void> {
  const toSave = { ...state, version: WORKSPACE_VERSION };
  lsSet(toSave);
  await idbSet(toSave).catch(() => {});
}

// Export utilities for CRUD
export function upsert<T extends { id: string; updatedAt: number }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = [...list];
  next[idx] = item;
  return next;
}

export function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

export function softDelete<T extends BaseEntity>(list: T[], id: string): T[] {
  return list.map((x) => (x.id === id ? { ...x, trashed: true, trashedAt: now() } : x));
}
export function restoreById<T extends BaseEntity>(list: T[], id: string): T[] {
  return list.map((x) => (x.id === id ? { ...x, trashed: false, trashedAt: null } : x));
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Workspace backup export (no secrets)
export function buildWorkspaceExport(state: WorkspaceState) {
  const { notifications, ...rest } = state; // exclude transient notifications if desired, but keep them
  return {
    app: "OpenRouter Workspace",
    version: WORKSPACE_VERSION,
    exportedAt: new Date().toISOString(),
    workspace: rest,
  };
}

export function parseWorkspaceImport(raw: string): { ok: boolean; state?: Partial<WorkspaceState>; error?: string } {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { ok: false, error: "Invalid JSON." }; }
  const src = (data as any)?.workspace ?? data;
  if (!src || typeof src !== "object") return { ok: false, error: "Unsupported file." };
  // never execute code; just validate shape
  const allowed: (keyof WorkspaceState)[] = ["projects","folders","files","documents","spreadsheets","notes","tasks","emailDrafts","calendarEvents","conversations","promptTemplates","memories"];
  const partial: any = {};
  for (const k of allowed) if (Array.isArray((src as any)[k])) partial[k] = (src as any)[k];
  // basic id check
  for (const k of Object.keys(partial)) {
    for (const item of partial[k]) {
      if (!item || typeof item.id !== "string") return { ok:false, error:`Invalid item in ${k}`};
    }
  }
  return { ok: true, state: partial };
}
