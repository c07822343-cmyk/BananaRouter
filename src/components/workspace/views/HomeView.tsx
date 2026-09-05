"use client";

import { FileText, MessageSquare, Table2, StickyNote, CheckSquare, HardDrive, Sparkles, Plus, ArrowRight, Clock } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { WorkspaceView } from "@/components/shell/SidebarNav";
import { useMemo } from "react";

export function HomeView({ onNavigate, onQuick }: {
  onNavigate: (v: WorkspaceView) => void;
  onQuick: (a: string) => void;
}) {
  const { state } = useWorkspace();

  const recent = useMemo(() => {
    const all = [
      ...state.documents.filter((d) => !d.trashed).map((d) => ({ type: "doc" as const, title: d.title, at: d.updatedAt, view: "documents" as WorkspaceView, icon: <FileText size={16} /> })),
      ...state.conversations.map((c) => ({ type: "chat" as const, title: c.title || "Untitled chat", at: c.updatedAt, view: "chat" as WorkspaceView, icon: <MessageSquare size={16} /> })),
      ...state.spreadsheets.filter((s) => !s.trashed).map((s) => ({ type: "sheet" as const, title: s.title, at: s.updatedAt, view: "sheets" as WorkspaceView, icon: <Table2 size={16} /> })),
      ...state.notes.filter((n) => !n.trashed && !n.archived).map((n) => ({ type: "note" as const, title: n.title || "Untitled note", at: n.updatedAt, view: "notes" as WorkspaceView, icon: <StickyNote size={16} /> })),
      ...state.tasks.filter((t) => !t.trashed).map((t) => ({ type: "task" as const, title: t.title, at: t.updatedAt, view: "tasks" as WorkspaceView, icon: <CheckSquare size={16} /> })),
      ...state.files.filter((f) => !f.trashed).map((f) => ({ type: "file" as const, title: f.name, at: f.updatedAt, view: "drive" as WorkspaceView, icon: <HardDrive size={16} /> })),
    ].sort((a, b) => b.at - a.at).slice(0, 8);
    return all;
  }, [state]);

  const suggested = [
    { label: "Summarize a document", icon: <FileText size={16} />, action: () => onNavigate("documents") },
    { label: "Create a document", icon: <Plus size={16} />, action: () => onQuick("new-doc") },
    { label: "Analyze a spreadsheet", icon: <Table2 size={16} />, action: () => onNavigate("sheets") },
    { label: "Draft an email", icon: <CheckSquare size={16} />, action: () => onNavigate("mail") },
    { label: "Organize my notes", icon: <StickyNote size={16} />, action: () => onNavigate("notes") },
    { label: "Create a project plan", icon: <Sparkles size={16} />, action: () => onNavigate("ai-tools") },
  ];

  return (
    <div className="mx-auto max-w-[1080px] space-y-6 p-4 md:p-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#e8f0fe] to-[#f8f9fa] p-6 dark:from-[#394457] dark:to-[#202124]">
        <h1 className="text-2xl font-normal">Welcome to your workspace</h1>
        <p className="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
          One AI workspace for thinking, creating, organizing, researching, and working. Chat, docs, files, sheets, tasks — all connected and powered by OpenRouter.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => onQuick("new-doc")} className="rounded-full bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1765cc]">New document</button>
          <button onClick={() => onQuick("new-sheet")} className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow hover:bg-[#f1f3f4] dark:bg-[#303134]">New sheet</button>
          <button onClick={() => onQuick("new-note")} className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow hover:bg-[#f1f3f4] dark:bg-[#303134]">New note</button>
          <button onClick={() => onNavigate("chat")} className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow hover:bg-[#f1f3f4] dark:bg-[#303134]">New chat</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">Continue working</h2>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{recent.length} recent items</span>
            </div>
            {recent.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white p-8 text-center dark:bg-[#303134]">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]"><Clock size={18} /></div>
                <p className="text-sm font-medium">No recent activity yet</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Create a document, note, or chat to get started.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={() => onQuick("new-doc")} className="rounded-full bg-[#1a73e8] px-4 py-1.5 text-xs font-medium text-white">Create document</button>
                  <button onClick={() => onNavigate("drive")} className="rounded-full border px-4 py-1.5 text-xs">Open Drive</button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {recent.map((r, i) => (
                  <button key={i} onClick={() => onNavigate(r.view)} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-white p-3 text-left hover:shadow-md dark:bg-[#303134] dark:hover:bg-[#3c4043]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1f3f4] dark:bg-[#3c4043]">{r.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.title}</span>
                      <span className="block text-xs text-[hsl(var(--muted-foreground))]">{new Date(r.at).toLocaleDateString()}</span>
                    </span>
                    <ArrowRight size={14} className="text-[hsl(var(--muted-foreground))]" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium">Quick create</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: "New Chat", icon: <MessageSquare size={18} />, action: () => onNavigate("chat") },
                { label: "New Document", icon: <FileText size={18} />, action: () => onQuick("new-doc") },
                { label: "New Sheet", icon: <Table2 size={18} />, action: () => onQuick("new-sheet") },
                { label: "New Note", icon: <StickyNote size={18} />, action: () => onQuick("new-note") },
                { label: "New Task", icon: <CheckSquare size={18} />, action: () => onQuick("new-task") },
                { label: "New Folder", icon: <HardDrive size={18} />, action: () => onQuick("new-folder") },
              ].map((q) => (
                <button key={q.label} onClick={q.action} className="flex flex-col items-start gap-2 rounded-xl border border-[hsl(var(--border))] bg-white p-4 hover:shadow-md dark:bg-[#303134]">
                  <span className="rounded-full bg-[#e8f0fe] p-2 text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]">{q.icon}</span>
                  <span className="text-sm font-medium">{q.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 dark:bg-[#303134]">
            <h3 className="text-sm font-medium">Suggested actions</h3>
            <div className="mt-3 space-y-1">
              {suggested.map((s) => (
                <button key={s.label} onClick={s.action} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-[#f1f3f4] dark:hover:bg-white/10">
                  <span className="text-[hsl(var(--muted-foreground))]">{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4 dark:bg-[#303134]">
            <h3 className="text-sm font-medium">Workspace stats</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              {[
                { label: "Docs", v: state.documents.filter((d) => !d.trashed).length },
                { label: "Files", v: state.files.filter((f) => !f.trashed).length },
                { label: "Notes", v: state.notes.filter((n) => !n.trashed && !n.archived).length },
                { label: "Tasks", v: state.tasks.filter((t) => !t.trashed && !t.completed).length },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-[#f1f3f4] p-3 dark:bg-[#3c4043]">
                  <div className="text-lg font-medium">{s.v}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
