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
import { X, Bell, Check } from "lucide-react";
import { applyTheme, loadTheme } from "@/lib/client/settings";

export function WorkspaceShell() {
  const { state, addNotification, saving, lastSavedAt, createDocument, createNote, createTask, createSpreadsheet, createFolder } = useWorkspace();
  const [view, setView] = useState<WorkspaceView>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [assistantContext, setAssistantContext] = useState<AIContext>({ currentView: "home" });
  const [theme, setTheme] = useState(loadTheme());

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
    // could also highlight item id via context - simple notification
    addNotification({ title: "Opened from search", message: `${item.title} • ${item.type}`, type: "info" });
    // if item is specific type, set context for assistant
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
    <div className="flex h-[100dvh] flex-col bg-[#f8f9fa] dark:bg-[#202124]">
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
        {/* Sidebar - desktop */}
        <aside className="hidden w-[256px] shrink-0 flex-col border-r border-[hsl(var(--border))] bg-white dark:bg-[#202124] md:flex">
          <div className="p-2">
            <SidebarNav current={view} onNavigate={handleNavigate} counts={{ drive: state.files.length, tasks: state.tasks.filter((t) => !t.completed && !t.trashed).length, notes: state.notes.filter((n) => !n.archived && !n.trashed).length }} />
          </div>
          <div className="mt-auto border-t p-3">
            <button
              onClick={() => setAssistantOpen((v) => !v)}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${assistantOpen ? "bg-[#1a73e8] text-white" : "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]"}`}
            >
              {assistantOpen ? "Close Assistant" : "Ask AI"}
            </button>
            <div className="mt-2 text-center text-[11px] text-[hsl(var(--muted-foreground))]">AI via OpenRouter • Context-aware</div>
          </div>
        </aside>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-white dark:bg-[#202124] md:hidden">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-medium">Workspace</span>
                <button onClick={() => setSidebarOpen(false)} className="rounded-full p-1 hover:bg-[hsl(var(--muted))]"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <SidebarNav current={view} onNavigate={(v) => { handleNavigate(v); setSidebarOpen(false); }} />
              </div>
            </aside>
          </>
        )}

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8f9fa] dark:bg-[#202124]">
          <div className="flex-1 overflow-y-auto">
            {/* Breadcrumbs */}
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white/80 px-4 py-2 text-xs backdrop-blur dark:bg-[#202124]/80">
              <span className="text-[hsl(var(--muted-foreground))]">Workspace</span>
              <span>/</span>
              <span className="font-medium capitalize">{view.replace("-", " ")}</span>
              <span className="ml-auto hidden items-center gap-2 md:flex">
                <button
                  onClick={() => setAssistantOpen((v) => !v)}
                  className="rounded-full bg-[#e8f0fe] px-3 py-1 text-xs font-medium text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]"
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
          <div className="hidden shrink-0 border-l bg-white dark:bg-[#202124] lg:flex">
            <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} context={{ ...assistantContext, currentView: view }} view={view} />
          </div>
        )}
      </div>

      {/* Overlays */}
      <GlobalSearchPanel state={state} query={globalQuery} onQueryChange={setGlobalQuery} onSelect={handleSearchSelect} onClose={() => setSearchOpen(false)} open={searchOpen} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={handleNavigate} onQuick={handleQuick} />

      {/* Notifications drawer */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setNotifOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative flex h-full w-[380px] flex-col bg-white shadow-2xl dark:bg-[#202124]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium"><Bell size={16} /> Notifications</span>
              <button onClick={() => setNotifOpen(false)} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {state.notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">No notifications</div>
              ) : (
                <div className="space-y-2">
                  {state.notifications.map((n) => (
                    <div key={n.id} className={`rounded-xl border p-3 ${!n.read ? "bg-[#e8f0fe] dark:bg-[#394457]" : "bg-white dark:bg-[#303134]"}`}>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">{n.message}</div>
                      <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t p-3">
              <button onClick={() => { (state.notifications as any).forEach((n: any) => n.read = true); setNotifOpen(false); }} className="w-full rounded-full border bg-white py-2 text-sm dark:bg-[#303134]"><Check size={14} className="inline" /> Mark all read</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile assistant as drawer */}
      {assistantOpen && (
        <div className="fixed inset-0 z-40 flex justify-end lg:hidden" onClick={() => setAssistantOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative h-full w-[90%] max-w-[360px]" onClick={(e) => e.stopPropagation()}>
            <AssistantPanel open view={view} context={{ ...assistantContext, currentView: view }} onClose={() => setAssistantOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
