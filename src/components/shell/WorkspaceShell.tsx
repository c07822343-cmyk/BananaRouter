"use client";

import { useEffect, useMemo, useState } from "react";
import { TopBar } from "./TopBar";
import { SidebarNav, WorkspaceView } from "./SidebarNav";
import { GlobalSearchPanel } from "./GlobalSearch";
import { CommandPalette } from "./CommandPalette";
import { AssistantPanel } from "./AssistantPanel";
import { useWorkspace } from "@/lib/workspace/context";
import { HomeView } from "@/components/workspace/views/HomeView";
import { ChatView } from "@/components/workspace/views/ChatView";
import { DocumentsView } from "@/components/workspace/views/DocumentsView";
import { DriveView } from "@/components/workspace/views/DriveView";
import { SheetsView } from "@/components/workspace/views/SheetsView";
import { MailView } from "@/components/workspace/views/MailView";
import { CalendarView } from "@/components/workspace/views/CalendarView";
import { TasksView } from "@/components/workspace/views/TasksView";
import { NotesView } from "@/components/workspace/views/NotesView";
import { AIToolsView } from "@/components/workspace/views/AIToolsView";
import { StarredView } from "@/components/workspace/views/StarredView";
import { ProjectsView } from "@/components/workspace/views/ProjectsView";
import { TrashView } from "@/components/workspace/views/TrashView";
import { SettingsWorkspaceView } from "@/components/workspace/views/SettingsWorkspaceView";
import { SearchItem, AIContext } from "@/lib/workspace/types";
import { X, Bell, Check, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { applyTheme, loadTheme } from "@/lib/client/settings";
import { BananaLogo } from "@/components/branding/BananaLogo";
import { Onboarding } from "./Onboarding";

export function WorkspaceShell() {
  const { state, addNotification, saving, lastSavedAt, createDocument, createNote, createTask, createSpreadsheet, createFolder } = useWorkspace();
  const [view, setView] = useState<WorkspaceView>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [assistantContext, setAssistantContext] = useState<AIContext>({ currentView: "home" });
  const [theme, setTheme] = useState(loadTheme());

  useEffect(() => {
    try {
      const v = localStorage.getItem("banana:sidebar-collapsed");
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("banana:sidebar-collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  useEffect(() => {
    applyTheme(theme as any);
  }, [theme]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleQuick("new-doc");
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setCommandOpen(false);
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleNavigate = (v: WorkspaceView) => {
    setView(v);
    setSidebarOpen(false);
    setAssistantContext({ currentView: v, projectId: state.activeProjectId });
  };

  const handleSearchSelect = (item: SearchItem, v: WorkspaceView) => {
    setSearchOpen(false);
    setView(v);
    addNotification({ title: "Opened from search", message: `${item.title} • ${item.type}`, type: "info" });
    if (item.type === "document") {
      const doc = state.documents.find((d) => d.id === item.id);
      if (doc) setAssistantContext({ currentView: v, selectedDocument: doc, projectId: state.activeProjectId });
    }
  };

  const handleQuick = (action: string) => {
    if (action === "new-doc") {
      const d = createDocument();
      handleNavigate("documents");
      addNotification({ title: "Document created", message: d.title, type: "success" });
    } else if (action === "new-sheet") {
      const s = createSpreadsheet();
      handleNavigate("sheets");
      addNotification({ title: "Spreadsheet created", message: s.title, type: "success" });
    } else if (action === "new-note") {
      const n = createNote({ title: "Untitled note", content: "" });
      handleNavigate("notes");
      addNotification({ title: "Note created", message: n.title || "new note", type: "success" });
    } else if (action === "new-task") {
      const t = createTask("New task");
      handleNavigate("tasks");
      addNotification({ title: "Task created", message: t.title, type: "success" });
    } else if (action === "new-folder") {
      const name = prompt("Folder name");
      if (name) {
        createFolder(name, null);
        handleNavigate("drive");
      }
    } else if (action === "search") {
      setSearchOpen(true);
    } else if (action === "toggle-dark") {
      const next = theme === "dark" ? "light" : "dark";
      setTheme(next as any);
      applyTheme(next as any);
    } else if (action === "export") {
      handleNavigate("settings");
    } else if (action === "import") {
      handleNavigate("drive");
    }
  };

  const unreadCount = state.notifications.filter((n) => !n.read).length;

  const renderView = () => {
    switch (view) {
      case "home": return <HomeView onNavigate={handleNavigate} onQuick={handleQuick} />;
      case "chat": return <ChatView />;
      case "documents": return <DocumentsView onOpenInChat={(doc) => { setAssistantContext({ currentView: "documents", selectedDocument: doc, projectId: state.activeProjectId }); setAssistantOpen(true); }} />;
      case "drive": return <DriveView onAskFile={(f) => { setAssistantContext({ currentView: "drive", selectedFiles: [f], projectId: state.activeProjectId }); setAssistantOpen(true); handleNavigate("drive"); }} />;
      case "sheets": return <SheetsView />;
      case "mail": return <MailView />;
      case "calendar": return <CalendarView />;
      case "tasks": return <TasksView />;
      case "notes": return <NotesView />;
      case "ai-tools": return <AIToolsView />;
      case "starred": return <StarredView />;
      case "projects": return <ProjectsView />;
      case "trash": return <TrashView />;
      case "settings": return <SettingsWorkspaceView />;
      default: return <HomeView onNavigate={handleNavigate} onQuick={handleQuick} />;
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#fcfaf7] dark:bg-[#0f0f10] text-[hsl(var(--foreground))]">
      <TopBar
        appName={state.projects.find((p) => p.id === state.activeProjectId)?.name ?? "Workspace"}
        searchQuery={globalQuery}
        onSearchQueryChange={setGlobalQuery}
        onSearchFocus={() => setSearchOpen(true)}
        onCommandOpen={() => setCommandOpen(true)}
        onMenu={() => setSidebarOpen(true)}
        onSettings={() => handleNavigate("settings")}
        onHelp={() => { setAssistantOpen(true); setAssistantContext({ currentView: view, projectId: state.activeProjectId }); }}
        saving={saving}
        lastSavedAt={lastSavedAt}
        notificationCount={unreadCount}
        onNotifications={() => setNotifOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar – desktop, collapsible */}
        <aside
          className="hidden shrink-0 flex-col border-r border-[hsl(var(--border))] bg-white dark:bg-[#1a1a1e] md:flex"
          style={{ width: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)" }}
        >
          <div className="flex items-center justify-between px-2 py-2">
            {!collapsed && (
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold tracking-widest uppercase text-[hsl(var(--muted-foreground))]">Menu</div>
            )}
            <button
              onClick={() => setCollapsed(v=>!v)}
              className="ml-auto rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand (keep focus)" : "Collapse"}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <SidebarNav current={view} onNavigate={handleNavigate} collapsed={collapsed} counts={{ drive: state.files.length, tasks: state.tasks.filter((t) => !t.completed && !t.trashed).length, notes: state.notes.filter((n) => !n.archived && !n.trashed).length }} />
          </div>
          <div className={`border-t border-[hsl(var(--border))] ${collapsed ? "p-2" : "p-3"}`}>
            {!collapsed ? (
              <>
                <button
                  onClick={() => setAssistantOpen((v) => !v)}
                  className={`flex w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold shadow-sm transition ${assistantOpen ? "bg-[#1a1a1a] text-white dark:bg-white dark:text-[#1a1a1a]" : "bg-[#F6C446] text-[#1a1a1a] hover:brightness-95"}`}
                >
                  {assistantOpen ? "Close Assistant" : "Ask BananaRouter AI"}
                </button>
                <div className="mt-2 text-center text-[11px] text-[hsl(var(--muted-foreground))]">Powered by OpenRouter · Context-aware</div>
              </>
            ) : (
              <button onClick={() => setAssistantOpen(v=>!v)} className="flex w-full items-center justify-center rounded-full bg-[#F6C446] p-2.5 text-[#1a1a1a] shadow-sm" aria-label="Ask AI">
                <BananaLogo size={20} />
              </button>
            )}
          </div>
        </aside>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/30 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col bg-white dark:bg-[#1a1a1e] shadow-2xl md:hidden">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold"><BananaLogo size={24} /> BananaRouter</span>
                <button onClick={() => setSidebarOpen(false)} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <SidebarNav current={view} onNavigate={(v) => { handleNavigate(v); setSidebarOpen(false); }} />
              </div>
              <div className="border-t p-3">
                <button onClick={() => { setAssistantOpen(v=>!v); setSidebarOpen(false); }} className="w-full rounded-full bg-[#F6C446] py-2.5 text-sm font-semibold text-[#1a1a1a]">Ask BananaRouter AI</button>
              </div>
            </aside>
          </>
        )}

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fcfaf7] dark:bg-[#0f0f10]">
          <div className="flex-1 overflow-y-auto">
            {/* Breadcrumbs – subtle */}
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[hsl(var(--border))]/60 bg-white/80 dark:bg-[#1a1a1e]/80 px-4 py-2 text-xs backdrop-blur">
              <span className="text-[hsl(var(--muted-foreground))]">BananaRouter</span>
              <span className="text-[hsl(var(--muted-foreground))]">/</span>
              <span className="font-medium capitalize">{view.replace("-", " ")}</span>
              <span className="ml-auto hidden items-center gap-2 md:flex">
                <button
                  onClick={() => setAssistantOpen((v) => !v)}
                  className="rounded-full bg-[#f8f7f5] dark:bg-[#252529] border border-[hsl(var(--border))] px-3 py-1 text-xs font-medium hover:bg-[#FFFBEB] dark:hover:bg-[#2a2210] transition"
                >
                  {assistantOpen ? "Hide assistant" : "Ask AI about this"}
                </button>
              </span>
            </div>
            <div className="min-h-[calc(100%-40px)]">
              {renderView()}
            </div>
          </div>
        </main>

        {/* Right assistant panel */}
        {assistantOpen && (
          <div className="hidden shrink-0 border-l border-[hsl(var(--border))] bg-white dark:bg-[#1a1a1e] shadow-sm lg:flex">
            <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} context={{ ...assistantContext, currentView: view }} view={view} />
          </div>
        )}
      </div>

      <Onboarding />
      {/* Overlays */}
      <GlobalSearchPanel state={state} query={globalQuery} onQueryChange={setGlobalQuery} onSelect={handleSearchSelect} onClose={() => setSearchOpen(false)} open={searchOpen} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={handleNavigate} onQuick={handleQuick} />

      {/* Notifications drawer */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setNotifOpen(false)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          <div className="relative flex h-full w-[380px] flex-col bg-white shadow-2xl dark:bg-[#1a1a1e] border-l border-[hsl(var(--border))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold"><Bell size={16} /> Notifications</span>
              <button onClick={() => setNotifOpen(false)} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {state.notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">No notifications</div>
              ) : (
                <div className="space-y-2">
                  {state.notifications.map((n) => (
                    <div key={n.id} className={`rounded-2xl border p-3 ${!n.read ? "bg-[#FFFBEB] dark:bg-[#2a2210] border-[#FDE68A]/50" : "bg-white dark:bg-[#252529] border-[hsl(var(--border))]"}`}>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{n.message}</div>
                      <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t p-3">
              <button onClick={() => { (state.notifications as any).forEach((n: any) => n.read = true); setNotifOpen(false); }} className="w-full rounded-full border bg-white py-2 text-sm dark:bg-[#252529] hover:bg-[hsl(var(--muted))] transition"><Check size={14} className="inline" /> Mark all read</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile assistant as drawer */}
      {assistantOpen && (
        <div className="fixed inset-0 z-40 flex justify-end lg:hidden" onClick={() => setAssistantOpen(false)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          <div className="relative h-full w-[94%] max-w-[380px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <AssistantPanel open view={view} context={{ ...assistantContext, currentView: view }} onClose={() => setAssistantOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
