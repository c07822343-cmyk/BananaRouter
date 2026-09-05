"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { WorkspaceState, ID, DocumentEntity, Folder, WorkspaceFile, Spreadsheet, Note, Task, EmailDraft, CalendarEvent, Project, PromptTemplate, AppNotification } from "./types";
import { loadWorkspace, saveWorkspace, generateId, now } from "./store";
import { Conversation } from "@/lib/shared/types";

interface WorkspaceContextValue {
  state: WorkspaceState;
  loading: boolean;
  // CRUD helpers
  createDocument: (title?: string, content?: string, projectId?: string | null, folderId?: string | null) => DocumentEntity;
  updateDocument: (id: string, patch: Partial<DocumentEntity>) => void;
  deleteDocument: (id: string, permanent?: boolean) => void;
  restoreDocument: (id: string) => void;
  duplicateDocument: (id: string) => void;

  createFolder: (name: string, parentId?: string | null) => Folder;
  updateFolder: (id: string, patch: Partial<Folder>) => void;
  deleteFolder: (id: string, permanent?: boolean) => void;
  restoreFolder: (id: string) => void;

  createFile: (file: Omit<WorkspaceFile, "id" | "createdAt" | "updatedAt">) => WorkspaceFile;
  updateFile: (id: string, patch: Partial<WorkspaceFile>) => void;
  deleteFile: (id: string, permanent?: boolean) => void;
  restoreFile: (id: string) => void;

  createSpreadsheet: (title?: string) => Spreadsheet;
  updateSpreadsheet: (id: string, patch: Partial<Spreadsheet>) => void;
  deleteSpreadsheet: (id: string, permanent?: boolean) => void;
  restoreSpreadsheet: (id: string) => void;

  createNote: (patch?: Partial<Note>) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string, permanent?: boolean) => void;
  restoreNote: (id: string) => void;

  createTask: (title: string, patch?: Partial<Task>) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string, permanent?: boolean) => void;
  restoreTask: (id: string) => void;

  createEmailDraft: (patch?: Partial<EmailDraft>) => EmailDraft;
  updateEmailDraft: (id: string, patch: Partial<EmailDraft>) => void;
  deleteEmailDraft: (id: string, permanent?: boolean) => void;

  createEvent: (patch: Partial<CalendarEvent> & { title: string; start: number; end: number }) => CalendarEvent;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string, permanent?: boolean) => void;

  createProject: (name: string, description?: string) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // conversations
  setConversations: (convs: Conversation[]) => void;
  updateConversation: (id: string, patch: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;

  // templates, memories, notifications
  upsertTemplate: (tpl: PromptTemplate) => void;
  deleteTemplate: (id: string) => void;
  createMemory: (key: string, value: string, scope?: "user" | "project", projectId?: string | null) => void;
  updateMemory: (id: string, patch: Partial<{ key: string; value: string }>) => void;
  deleteMemory: (id: string) => void;
  addNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // import/export
  importWorkspace: (partial: Partial<WorkspaceState>) => void;
  exportWorkspace: () => WorkspaceState;
  setActiveProject: (id: string | null) => void;

  // ui helpers
  saveNow: () => Promise<void>;
  saving: boolean;
  lastSavedAt: number | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const saveTimeout = useRef<number | null>(null);
  const stateRef = useRef<WorkspaceState | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    let mounted = true;
    loadWorkspace().then((ws) => {
      if (!mounted) return;
      setState(ws);
      stateRef.current = ws;
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const scheduleSave = useCallback((next: WorkspaceState) => {
    if (saveTimeout.current) window.clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(async () => {
      setSaving(true);
      await saveWorkspace(next);
      setSaving(false);
      setLastSavedAt(Date.now());
    }, 600) as unknown as number;
  }, []);

  const commit = useCallback((updater: (prev: WorkspaceState) => WorkspaceState) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      scheduleSave(next);
      stateRef.current = next;
      return next;
    });
  }, [scheduleSave]);

  const saveNow = useCallback(async () => {
    if (stateRef.current) {
      setSaving(true);
      await saveWorkspace(stateRef.current);
      setSaving(false);
      setLastSavedAt(Date.now());
    }
  }, []);

  // Autosave on beforeunload
  useEffect(() => {
    const h = () => { if (stateRef.current) saveWorkspace(stateRef.current); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const value: WorkspaceContextValue | null = state ? {
    state,
    loading,
    saving,
    lastSavedAt,
    saveNow,
    setActiveProject: (id) => commit((s) => ({ ...s, activeProjectId: id })),

    createDocument: (title = "Untitled document", content = "", projectId = null, folderId = null) => {
      const doc: DocumentEntity = { id: generateId("doc"), title, content, createdAt: now(), updatedAt: now(), projectId, folderId, starred: false, trashed: false, versions: [] };
      commit((s) => ({ ...s, documents: [doc, ...s.documents] }));
      return doc;
    },
    updateDocument: (id, patch) => commit((s) => ({ ...s, documents: s.documents.map((d) => d.id === id ? { ...d, ...patch, updatedAt: now() } : d) })),
    deleteDocument: (id, permanent) => {
      if (permanent) commit((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) }));
      else commit((s) => ({ ...s, documents: s.documents.map((d) => d.id === id ? { ...d, trashed: true, trashedAt: now() } : d) }));
    },
    restoreDocument: (id) => commit((s) => ({ ...s, documents: s.documents.map((d) => d.id === id ? { ...d, trashed: false, trashedAt: null } : d) })),
    duplicateDocument: (id) => {
      const src = state.documents.find((d) => d.id === id);
      if (!src) return;
      const copy: DocumentEntity = { ...src, id: generateId("doc"), title: `${src.title} (copy)`, createdAt: now(), updatedAt: now(), versions: [] };
      commit((s) => ({ ...s, documents: [copy, ...s.documents] }));
    },

    createFolder: (name, parentId = null) => {
      const folder: Folder = { id: generateId("fld"), name, parentId, createdAt: now(), updatedAt: now(), starred: false, trashed: false };
      commit((s) => ({ ...s, folders: [folder, ...s.folders] }));
      return folder;
    },
    updateFolder: (id, patch) => commit((s) => ({ ...s, folders: s.folders.map((f) => f.id === id ? { ...f, ...patch, updatedAt: now() } : f) })),
    deleteFolder: (id, permanent) => {
      if (permanent) commit((s) => ({ ...s, folders: s.folders.filter((f) => f.id !== id) }));
      else commit((s) => ({ ...s, folders: s.folders.map((f) => f.id === id ? { ...f, trashed: true, trashedAt: now() } : f) }));
    },
    restoreFolder: (id) => commit((s) => ({ ...s, folders: s.folders.map((f) => f.id === id ? { ...f, trashed: false, trashedAt: null } : f) })),

    createFile: (file) => {
      const f: WorkspaceFile = { id: generateId("file"), createdAt: now(), updatedAt: now(), starred: false, trashed: false, ...file };
      commit((s) => ({ ...s, files: [f, ...s.files] }));
      return f;
    },
    updateFile: (id, patch) => commit((s) => ({ ...s, files: s.files.map((f) => f.id === id ? { ...f, ...patch, updatedAt: now() } : f) })),
    deleteFile: (id, permanent) => {
      if (permanent) commit((s) => ({ ...s, files: s.files.filter((f) => f.id !== id) }));
      else commit((s) => ({ ...s, files: s.files.map((f) => f.id === id ? { ...f, trashed: true, trashedAt: now() } : f) }));
    },
    restoreFile: (id) => commit((s) => ({ ...s, files: s.files.map((f) => f.id === id ? { ...f, trashed: false, trashedAt: null } : f) })),

    createSpreadsheet: (title = "Untitled spreadsheet") => {
      const sh: Spreadsheet = { id: generateId("ss"), title, createdAt: now(), updatedAt: now(), starred: false, trashed: false, sheets: [{ id: generateId("sh"), title: "Sheet1", rows: 20, cols: 8, cells: {} }] };
      commit((s) => ({ ...s, spreadsheets: [sh, ...s.spreadsheets] }));
      return sh;
    },
    updateSpreadsheet: (id, patch) => commit((s) => ({ ...s, spreadsheets: s.spreadsheets.map((x) => x.id === id ? { ...x, ...patch, updatedAt: now() } : x) })),
    deleteSpreadsheet: (id, permanent) => {
      if (permanent) commit((s) => ({ ...s, spreadsheets: s.spreadsheets.filter((x) => x.id !== id) }));
      else commit((s) => ({ ...s, spreadsheets: s.spreadsheets.map((x) => x.id === id ? { ...x, trashed: true, trashedAt: now() } : x) }));
    },
    restoreSpreadsheet: (id) => commit((s) => ({ ...s, spreadsheets: s.spreadsheets.map((x) => x.id === id ? { ...x, trashed: false, trashedAt: null } : x) })),

    createNote: (patch) => {
      const n: Note = { id: generateId("note"), title: patch?.title ?? "", content: patch?.content ?? "", labels: patch?.labels ?? [], color: patch?.color ?? "default", pinned: patch?.pinned ?? false, archived: patch?.archived ?? false, createdAt: now(), updatedAt: now(), starred: false, trashed: false, ...patch };
      commit((s) => ({ ...s, notes: [n, ...s.notes] }));
      return n;
    },
    updateNote: (id, patch) => commit((s) => ({ ...s, notes: s.notes.map((n) => n.id === id ? { ...n, ...patch, updatedAt: now() } : n) })),
    deleteNote: (id, permanent) => {
      if (permanent) commit((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
      else commit((s) => ({ ...s, notes: s.notes.map((n) => n.id === id ? { ...n, trashed: true, trashedAt: now() } : n) }));
    },
    restoreNote: (id) => commit((s) => ({ ...s, notes: s.notes.map((n) => n.id === id ? { ...n, trashed: false, trashedAt: null } : n) })),

    createTask: (title, patch) => {
      const t: Task = { id: generateId("task"), title, completed: false, priority: "medium", createdAt: now(), updatedAt: now(), starred: false, trashed: false, ...patch };
      commit((s) => ({ ...s, tasks: [t, ...s.tasks] }));
      return t;
    },
    updateTask: (id, patch) => commit((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, ...patch, updatedAt: now() } : t) })),
    deleteTask: (id, permanent) => {
      if (permanent) commit((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
      else commit((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, trashed: true, trashedAt: now() } : t) }));
    },
    restoreTask: (id) => commit((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, trashed: false, trashedAt: null } : t) })),

    createEmailDraft: (patch) => {
      const e: EmailDraft = { id: generateId("email"), to: patch?.to ?? "", subject: patch?.subject ?? "", body: patch?.body ?? "", labels: patch?.labels ?? [], createdAt: now(), updatedAt: now(), starred: false, trashed: false, ...patch };
      commit((s) => ({ ...s, emailDrafts: [e, ...s.emailDrafts] }));
      return e;
    },
    updateEmailDraft: (id, patch) => commit((s) => ({ ...s, emailDrafts: s.emailDrafts.map((e) => e.id === id ? { ...e, ...patch, updatedAt: now() } : e) })),
    deleteEmailDraft: (id, permanent) => {
      if (permanent) commit((s) => ({ ...s, emailDrafts: s.emailDrafts.filter((e) => e.id !== id) }));
      else commit((s) => ({ ...s, emailDrafts: s.emailDrafts.map((e) => e.id === id ? { ...e, trashed: true, trashedAt: now() } : e) }));
    },

    createEvent: (patch) => {
      const ev: CalendarEvent = { id: generateId("evt"), createdAt: now(), updatedAt: now(), starred: false, trashed: false, ...patch };
      commit((s) => ({ ...s, calendarEvents: [...s.calendarEvents, ev].sort((a, b) => a.start - b.start) }));
      return ev;
    },
    updateEvent: (id, patch) => commit((s) => ({ ...s, calendarEvents: s.calendarEvents.map((e) => e.id === id ? { ...e, ...patch, updatedAt: now() } : e) })),
    deleteEvent: (id, permanent) => {
      if (permanent) commit((s) => ({ ...s, calendarEvents: s.calendarEvents.filter((e) => e.id !== id) }));
      else commit((s) => ({ ...s, calendarEvents: s.calendarEvents.map((e) => e.id === id ? { ...e, trashed: true, trashedAt: now() } : e) }));
    },

    createProject: (name, description) => {
      const p: Project = { id: generateId("proj"), name, description, createdAt: now(), updatedAt: now(), starred: false, trashed: false };
      commit((s) => ({ ...s, projects: [p, ...s.projects] }));
      return p;
    },
    updateProject: (id, patch) => commit((s) => ({ ...s, projects: s.projects.map((p) => p.id === id ? { ...p, ...patch, updatedAt: now() } : p) })),
    deleteProject: (id) => commit((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) })),

    setConversations: (convs) => commit((s) => ({ ...s, conversations: convs })),
    updateConversation: (id, patch) => commit((s) => ({ ...s, conversations: s.conversations.map((c) => c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c) })),
    deleteConversation: (id) => commit((s) => ({ ...s, conversations: s.conversations.filter((c) => c.id !== id) })),

    upsertTemplate: (tpl) => commit((s) => {
      const exists = s.promptTemplates.find((t) => t.id === tpl.id);
      if (exists) return { ...s, promptTemplates: s.promptTemplates.map((t) => t.id === tpl.id ? tpl : t) };
      return { ...s, promptTemplates: [tpl, ...s.promptTemplates] };
    }),
    deleteTemplate: (id) => commit((s) => ({ ...s, promptTemplates: s.promptTemplates.filter((t) => t.id !== id) })),

    createMemory: (key, value, scope = "user", projectId = null) => commit((s) => ({ ...s, memories: [{ id: generateId("mem"), key, value, scope, projectId, createdAt: now(), updatedAt: now() }, ...s.memories] })),
    updateMemory: (id, patch) => commit((s) => ({ ...s, memories: s.memories.map((m) => m.id === id ? { ...m, ...patch, updatedAt: now() } : m) })),
    deleteMemory: (id) => commit((s) => ({ ...s, memories: s.memories.filter((m) => m.id !== id) })),

    addNotification: (n) => {
      const notif: AppNotification = { id: generateId("notif"), createdAt: now(), read: false, ...n };
      commit((s) => ({ ...s, notifications: [notif, ...s.notifications].slice(0, 100) }));
    },
    markNotificationRead: (id) => commit((s) => ({ ...s, notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
    clearNotifications: () => commit((s) => ({ ...s, notifications: [] })),

    importWorkspace: (partial) => commit((s) => ({ ...s, ...partial, version: s.version, updatedAt: undefined } as any)),
    exportWorkspace: () => state,
  } : null;

  if (!value) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
          <span className="text-sm text-[hsl(var(--muted-foreground))]">Loading workspace…</span>
        </div>
      </div>
    );
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
