"use client";

import { useEffect, useMemo, useState } from "react";
import { Command, Search, FileText, HardDrive, Table2, StickyNote, CheckSquare, Mail, Calendar, MessageSquare, Sparkles, Settings, Moon, Sun, Upload, Download } from "lucide-react";
import { WorkspaceView } from "./SidebarNav";

interface Cmd {
  id: string;
  label: string;
  kbd?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({ open, onClose, onNavigate, onQuick }: {
  open: boolean;
  onClose: () => void;
  onNavigate: (v: WorkspaceView) => void;
  onQuick: (action: string) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const commands: Cmd[] = useMemo(() => [
    { id: "new-chat", label: "New chat", icon: <MessageSquare size={16} />, action: () => onNavigate("chat") },
    { id: "new-doc", label: "New document", icon: <FileText size={16} />, action: () => onQuick("new-doc") },
    { id: "new-sheet", label: "New spreadsheet", icon: <Table2 size={16} />, action: () => onQuick("new-sheet") },
    { id: "new-note", label: "New note", icon: <StickyNote size={16} />, action: () => onQuick("new-note") },
    { id: "new-task", label: "New task", icon: <CheckSquare size={16} />, action: () => onQuick("new-task") },
    { id: "new-folder", label: "Create folder", icon: <HardDrive size={16} />, action: () => onQuick("new-folder") },
    { id: "search", label: "Search workspace", icon: <Search size={16} />, action: () => onQuick("search") },
    { id: "open-drive", label: "Open Drive", icon: <HardDrive size={16} />, action: () => onNavigate("drive") },
    { id: "open-calendar", label: "Open Calendar", icon: <Calendar size={16} />, action: () => onNavigate("calendar") },
    { id: "open-tasks", label: "Open Tasks", icon: <CheckSquare size={16} />, action: () => onNavigate("tasks") },
    { id: "ai-hub", label: "Open AI Tools", icon: <Sparkles size={16} />, action: () => onNavigate("ai-tools") },
    { id: "settings", label: "Open Settings", icon: <Settings size={16} />, action: () => onNavigate("settings") },
    { id: "toggle-dark", label: "Toggle dark mode", icon: <Moon size={16} />, action: () => onQuick("toggle-dark") },
    { id: "import", label: "Import file", icon: <Upload size={16} />, action: () => onQuick("import") },
    { id: "export", label: "Export workspace", icon: <Download size={16} />, action: () => onQuick("export") },
  ], [onNavigate, onQuick]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[20vh]" onClick={onClose}>
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#303134]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-4 py-3">
          <Command size={16} className="text-[hsl(var(--muted-foreground))]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <span className="rounded bg-[hsl(var(--muted))] px-2 py-1 text-xs">Ctrl K</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => { c.action(); onClose(); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#f1f3f4] dark:hover:bg-white/10"
            >
              <span className="text-[hsl(var(--muted-foreground))]">{c.icon}</span>
              <span className="flex-1 text-sm">{c.label}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No commands found.</div>}
        </div>
      </div>
    </div>
  );
}
