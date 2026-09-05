"use client";

import { FileText, MessageSquare, Table2, StickyNote, CheckSquare, HardDrive, Sparkles, Plus, ArrowRight, Clock, PenLine, BarChart3, Layers, Search, Lightbulb, DraftingCompass, BookOpen, CalendarDays } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { WorkspaceView } from "@/components/shell/SidebarNav";
import { useMemo } from "react";
import { BananaLogo } from "@/components/branding/BananaLogo";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeView({ onNavigate, onQuick }: {
  onNavigate: (v: WorkspaceView) => void;
  onQuick: (a: string) => void;
}) {
  const { state, addNotification } = useWorkspace();

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

  const quickActions: { label: string; sub: string; icon: React.ReactNode; action: () => void }[] = [
    { label: "Chat", sub: "Ask anything", icon: <MessageSquare size={16} />, action: () => onNavigate("chat") },
    { label: "Write", sub: "Draft & edit", icon: <PenLine size={16} />, action: () => onQuick("new-doc") },
    { label: "Analyze", sub: "Docs & sheets", icon: <BarChart3 size={16} />, action: () => onNavigate("ai-tools") },
    { label: "Organize", sub: "Tasks & notes", icon: <Layers size={16} />, action: () => onNavigate("tasks") },
    { label: "Create", sub: "New project", icon: <Sparkles size={16} />, action: () => onQuick("new-doc") },
    { label: "Research", sub: "Explore ideas", icon: <BookOpen size={16} />, action: () => onNavigate("chat") },
    { label: "Plan", sub: "Calendar", icon: <CalendarDays size={16} />, action: () => onNavigate("calendar") },
  ];

  return (
    <div className="mx-auto max-w-[1120px] space-y-6 p-4 md:p-6">
      {/* Hero – clean, not marketing */}
      <div className="rounded-[20px] border border-[#FDE68A]/60 bg-white dark:bg-[#1e1e22] shadow-sm overflow-hidden">
        <div className="px-6 md:px-8 py-8 md:py-10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                <BananaLogo size={36} />
                <span className="text-xs font-medium tracking-widest uppercase text-[#a16207] dark:text-[#fcd34d]">BananaRouter</span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-[#FFFBEB] dark:bg-[#2a2210] border border-[#FDE68A]/50 px-2 py-0.5 text-[11px] font-medium text-[#92400e] dark:text-[#fde68a]">Powered by OpenRouter</span>
              </div>
              <h1 className="mt-4 text-[28px] md:text-[34px] font-semibold tracking-tight leading-tight">
                {greeting()}.<br />
                <span className="font-normal text-[hsl(var(--muted-foreground))]" style={{ letterSpacing: "-0.02em" }}>What are you working on?</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                One focused workspace for thinking, creating, organizing and shipping — chats, docs, files, sheets, tasks, all connected to BananaRouter AI.
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end gap-2">
              <div className="rounded-2xl bg-[#FFFBEB] dark:bg-[#2a2210] border border-[#FDE68A]/60 px-4 py-3 text-sm">
                <div className="font-medium text-[#92400e] dark:text-[#fde68a] flex items-center gap-2"><Sparkles size={14} className="text-[#F6C446]" /> Try asking</div>
                <div className="text-[#a16207] dark:text-[#fcd34d]/90 mt-1">“Summarize my docs” · “Make a plan from these notes” · “Explain this sheet”</div>
              </div>
            </div>
          </div>

          {/* Quick actions – Chip row */}
          <div className="mt-6">
            <div className="text-xs font-semibold tracking-widest uppercase text-[hsl(var(--muted-foreground))] mb-3">Quick actions</div>
            <div className="flex flex-wrap gap-2.5">
              {quickActions.map(a => (
                <button
                  key={a.label}
                  onClick={a.action}
                  className="group flex items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-white dark:bg-[#252529] px-4 py-2.5 text-left shadow-sm hover:shadow-md hover:border-[#FDE68A] hover:bg-[#FFFBEB] dark:hover:bg-[#2a2210] transition"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F6C446] text-[#1a1a1a] shadow-sm group-hover:scale-105 transition">{a.icon}</span>
                  <span>
                    <span className="block text-sm font-medium leading-none">{a.label}</span>
                    <span className="block text-xs text-[hsl(var(--muted-foreground))] leading-none mt-0.5">{a.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => onQuick("new-doc")} className="rounded-full bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] px-5 py-2.5 text-sm font-medium hover:opacity-90 transition">New document</button>
            <button onClick={() => onNavigate("chat")} className="rounded-full bg-[#F6C446] text-[#1a1a1a] px-5 py-2.5 text-sm font-semibold shadow-sm hover:brightness-95 transition">New chat</button>
            <button onClick={() => onQuick("new-note")} className="rounded-full border border-[hsl(var(--border))] bg-white dark:bg-[#252529] px-5 py-2.5 text-sm font-medium hover:bg-[hsl(var(--muted))] transition">New note</button>
          </div>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-[#F6C446] via-[#FDE68A] to-transparent opacity-60" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2"><Clock size={14} className="text-[#b45309]" /> Continue working</h2>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{recent.length} recent {recent.length===1?"item":"items"}</span>
            </div>
            {recent.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white dark:bg-[#1e1e22] p-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFBEB] dark:bg-[#2a2210] text-[#b45309] border border-[#FDE68A]/50"><Clock size={18} /></div>
                <p className="text-sm font-medium">No recent activity yet</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Create a document, note, or chat to get started.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={() => onQuick("new-doc")} className="rounded-full bg-[#F6C446] px-4 py-1.5 text-xs font-semibold text-[#1a1a1a]">Create document</button>
                  <button onClick={() => onNavigate("drive")} className="rounded-full border px-4 py-1.5 text-xs hover:bg-[hsl(var(--muted))]">Open Drive</button>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {recent.map((r, i) => (
                  <button key={i} onClick={() => onNavigate(r.view)} className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-white dark:bg-[#1e1e22] p-3.5 text-left hover:shadow-md hover:border-[#FDE68A]/50 transition group">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f8f7f5] dark:bg-[#252529] group-hover:bg-[#FFFBEB] dark:group-hover:bg-[#2a2210] transition">{r.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.title}</span>
                      <span className="block text-xs text-[hsl(var(--muted-foreground))]">{new Date(r.at).toLocaleDateString()}</span>
                    </span>
                    <ArrowRight size={14} className="text-[hsl(var(--muted-foreground))] group-hover:text-[#b45309] group-hover:translate-x-0.5 transition" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold tracking-tight">Quick create</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: "New Chat", icon: <MessageSquare size={18} />, action: () => onNavigate("chat") },
                { label: "New Document", icon: <FileText size={18} />, action: () => onQuick("new-doc") },
                { label: "New Sheet", icon: <Table2 size={18} />, action: () => onQuick("new-sheet") },
                { label: "New Note", icon: <StickyNote size={18} />, action: () => onQuick("new-note") },
                { label: "New Task", icon: <CheckSquare size={18} />, action: () => onQuick("new-task") },
                { label: "New Folder", icon: <HardDrive size={18} />, action: () => onQuick("new-folder") },
              ].map((q) => (
                <button key={q.label} onClick={q.action} className="flex flex-col items-start gap-2.5 rounded-2xl border border-[hsl(var(--border))] bg-white dark:bg-[#1e1e22] p-4 hover:shadow-md hover:border-[#FDE68A]/40 transition group">
                  <span className="rounded-xl bg-[#FFFBEB] dark:bg-[#2a2210] border border-[#FDE68A]/40 p-2.5 text-[#b45309] dark:text-[#fcd34d] group-hover:bg-[#F6C446] group-hover:text-[#1a1a1a] transition">{q.icon}</span>
                  <span className="text-sm font-medium">{q.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-white dark:bg-[#1e1e22] p-4">
            <h3 className="text-sm font-semibold tracking-tight">Suggested for you</h3>
            <div className="mt-3 space-y-1">
              {[
                { label: "Summarize a document", icon: <FileText size={16} />, v: "documents" as WorkspaceView },
                { label: "Create a document", icon: <Plus size={16} />, action: () => onQuick("new-doc") },
                { label: "Analyze a spreadsheet", icon: <Table2 size={16} />, v: "sheets" as WorkspaceView },
                { label: "Draft an email", icon: <CheckSquare size={16} />, v: "mail" as WorkspaceView },
                { label: "Organize my notes", icon: <StickyNote size={16} />, v: "notes" as WorkspaceView },
                { label: "Create a project plan", icon: <Sparkles size={16} />, v: "ai-tools" as WorkspaceView },
              ].map((s) => (
                <button key={s.label} onClick={() => (s as any).action ? (s as any).action() : onNavigate((s as any).v)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#FFFBEB] dark:hover:bg-[#2a2210] transition">
                  <span className="text-[hsl(var(--muted-foreground))]">{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-white dark:bg-[#1e1e22] p-4">
            <h3 className="text-sm font-semibold tracking-tight">Workspace stats</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              {[
                { label: "Docs", v: state.documents.filter((d) => !d.trashed).length },
                { label: "Files", v: state.files.filter((f) => !f.trashed).length },
                { label: "Notes", v: state.notes.filter((n) => !n.trashed && !n.archived).length },
                { label: "Tasks", v: state.tasks.filter((t) => !t.trashed && !t.completed).length },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-[#f8f7f5] dark:bg-[#252529] border border-[hsl(var(--border))]/50 p-3">
                  <div className="text-lg font-semibold tracking-tight">{s.v}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">Offline ready · IndexedDB + autosave · <span className="font-medium text-[#92400e]">BananaRouter</span> keeps your work local.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
