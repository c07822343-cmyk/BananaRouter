"use client";

import { useMemo } from "react";
import { Search, FileText, MessageSquare, StickyNote, CheckSquare, Table2, Mail, Calendar, HardDrive, Folder, FolderKanban } from "lucide-react";
import { WorkspaceState, SearchItem } from "@/lib/workspace/types";
import { buildSearchIndex, searchItems } from "@/lib/workspace/search";
import { WorkspaceView } from "./SidebarNav";

const ICONS: Record<string, React.ReactNode> = {
  chat: <MessageSquare size={14} />,
  document: <FileText size={14} />,
  file: <HardDrive size={14} />,
  sheet: <Table2 size={14} />,
  note: <StickyNote size={14} />,
  task: <CheckSquare size={14} />,
  email: <Mail size={14} />,
  event: <Calendar size={14} />,
  project: <FolderKanban size={14} />,
  folder: <Folder size={14} />,
};

export function GlobalSearchPanel({
  state,
  query,
  onQueryChange,
  onSelect,
  onClose,
  open,
}: {
  state: WorkspaceState;
  query: string;
  onQueryChange: (v: string) => void;
  onSelect: (item: SearchItem, view: WorkspaceView) => void;
  onClose: () => void;
  open: boolean;
}) {
  const index = useMemo(() => buildSearchIndex(state), [state]);
  const results = useMemo(() => searchItems(index, query), [index, query]);

  if (!open) return null;

  const mapTypeToView = (t: string): WorkspaceView => {
    if (t === "chat") return "chat";
    if (t === "document") return "documents";
    if (t === "file" || t === "folder") return "drive";
    if (t === "sheet") return "sheets";
    if (t === "note") return "notes";
    if (t === "task") return "tasks";
    if (t === "email") return "mail";
    if (t === "event") return "calendar";
    if (t === "project") return "home";
    return "home";
  };

  const grouped: Record<string, SearchItem[]> = {};
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[10vh]" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#2f3033]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-4 py-3">
          <Search size={18} className="text-[hsl(var(--muted-foreground))]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search chats, documents, files, sheets, notes, tasks…"
            className="flex-1 bg-transparent text-sm outline-none"
            aria-label="Global search input"
          />
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm hover:bg-[hsl(var(--muted))]">Close</button>
        </div>

        <div className="overflow-y-auto p-2">
          {query.trim().length === 0 && (
            <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              <p className="mb-2 font-medium">Try searching</p>
              <p className="text-xs">Examples: “roadmap”, “budget”, “welcome”</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {["welcome", "sample", "project", "budget"].map((k) => (
                  <button key={k} onClick={() => onQueryChange(k)} className="rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-xs hover:bg-[hsl(var(--accent))]">
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim().length > 0 && results.length === 0 && (
            <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No results for “{query}”.
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mb-3">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{type}</div>
              <div className="space-y-1">
                {items.slice(0, 6).map((it) => (
                  <button
                    key={it.id + it.type}
                    onClick={() => onSelect(it, mapTypeToView(type))}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#f1f3f4] dark:hover:bg-white/10"
                  >
                    <span className="mt-0.5 rounded-lg bg-[hsl(var(--muted))] p-1.5">{ICONS[it.type] ?? <Search size={14} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{it.title}</span>
                      <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">{it.content.slice(0, 120) || "—"}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[hsl(var(--muted-foreground))]">{it.location}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-4 py-2 text-[11px] text-[hsl(var(--muted-foreground))]">
          Press <kbd className="rounded bg-white px-1 py-0.5 shadow">Esc</kbd> to close • <kbd className="rounded bg-white px-1 py-0.5 shadow">Enter</kbd> to open
        </div>
      </div>
    </div>
  );
}
