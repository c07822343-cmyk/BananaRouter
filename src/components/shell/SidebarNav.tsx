"use client";

import {
  Home, MessageSquare, FileText, HardDrive, Table2, Mail, Calendar, CheckSquare, StickyNote, Sparkles, Trash2, Settings, Star, FolderKanban,
  Search, PenLine, BarChart3, Layers
} from "lucide-react";
import clsx from "clsx";
import { useWorkspace } from "@/lib/workspace/context";

export type WorkspaceView =
  | "home" | "chat" | "documents" | "drive" | "sheets" | "mail" | "calendar" | "tasks" | "notes" | "ai-tools" | "projects" | "starred" | "trash" | "settings" | "search";

export interface NavItem {
  id: WorkspaceView;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: <Home size={18} /> },
  { id: "chat", label: "Chat", icon: <MessageSquare size={18} /> },
  { id: "documents", label: "Documents", icon: <FileText size={18} /> },
  { id: "drive", label: "Drive", icon: <HardDrive size={18} /> },
  { id: "sheets", label: "Sheets", icon: <Table2 size={18} /> },
  { id: "mail", label: "Mail", icon: <Mail size={18} /> },
  { id: "calendar", label: "Calendar", icon: <Calendar size={18} /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare size={18} /> },
  { id: "notes", label: "Notes", icon: <StickyNote size={18} /> },
  { id: "ai-tools", label: "AI Tools", icon: <Sparkles size={18} /> },
  { id: "projects", label: "Projects", icon: <FolderKanban size={18} /> },
  { id: "starred", label: "Starred", icon: <Star size={18} /> },
];

export function SidebarNav({ current, onNavigate, collapsed, counts }: {
  current: WorkspaceView;
  onNavigate: (v: WorkspaceView) => void;
  collapsed?: boolean;
  counts?: Partial<Record<WorkspaceView, number>>;
}) {
  const { state } = useWorkspace();
  const recent = (() => {
    // recent conversations + docs
    const docs = state.documents.filter(d=>!d.trashed).slice(0,3);
    const chats = state.conversations.slice(0,3);
    return { docs, chats };
  })();

  return (
    <nav className={clsx("flex flex-col", collapsed ? "px-1" : "px-2")}>
      {/* Main */}
      <div className="space-y-0.5">
        {!collapsed && <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Workspace</div>}
        {NAV_ITEMS.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition",
                active
                  ? "bg-[#FFFBEB] text-[#92400e] dark:bg-[#2a2210] dark:text-[#fde68a] shadow-sm ring-1 ring-[#FDE68A]/60 dark:ring-[#78350f]/40"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
            >
              <span className={clsx(active && "text-[#b45309] dark:text-[#fcd34d]")}>{item.icon}</span>
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
              {!collapsed && counts?.[item.id] ? (
                <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", active ? "bg-[#F6C446] text-[#1a1a1a]" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]")}>
                  {counts[item.id]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Recent – subtle, not noisy */}
      {!collapsed && (recent.chats.length > 0 || recent.docs.length > 0) && (
        <div className="mt-4 px-2">
          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Recent</div>
          <div className="space-y-1">
            {recent.chats.slice(0,2).map(c => (
              <button key={c.id} onClick={() => onNavigate("chat")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-[hsl(var(--muted))] group">
                <MessageSquare size={14} className="shrink-0 text-[hsl(var(--muted-foreground))] group-hover:text-[#b45309]" />
                <span className="truncate text-[13px]">{c.title || "Untitled chat"}</span>
              </button>
            ))}
            {recent.docs.slice(0,2).map(d => (
              <button key={d.id} onClick={() => onNavigate("documents")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-[hsl(var(--muted))] group">
                <FileText size={14} className="shrink-0 text-[hsl(var(--muted-foreground))] group-hover:text-[#b45309]" />
                <span className="truncate text-[13px]">{d.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Favorites (starred) */}
      {!collapsed && state.files.filter(f=>f.starred).length + state.documents.filter(d=>d.starred).length > 0 && (
        <div className="mt-3 px-2">
          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Favorites</div>
          <button onClick={() => onNavigate("starred")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:bg-[hsl(var(--muted))] text-[13px]">
            <Star size={14} className="text-[#F6C446]" /> Starred items
          </button>
        </div>
      )}

      <div className="my-3 border-t border-[hsl(var(--border))] mx-2" />
      <div className={clsx("space-y-0.5", collapsed && "px-1")}>
        <button
          onClick={() => onNavigate("trash")}
          className={clsx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition", current === "trash" ? "bg-[#FFFBEB] text-[#92400e] dark:bg-[#2a2210] dark:text-[#fde68a]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]", collapsed && "justify-center")}
          title={collapsed ? "Trash" : undefined}
        >
          <Trash2 size={18} /> {!collapsed && "Trash"}
        </button>
        <button
          onClick={() => onNavigate("settings")}
          className={clsx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition", current === "settings" ? "bg-[#FFFBEB] text-[#92400e] dark:bg-[#2a2210] dark:text-[#fde68a]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]", collapsed && "justify-center")}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings size={18} /> {!collapsed && "Settings"}
        </button>
      </div>
      {!collapsed && (
        <div className="mt-4 rounded-xl bg-[#FFFBEB] dark:bg-[#2a2210] border border-[#FDE68A]/50 dark:border-[#78350f]/30 px-3 py-3">
          <div className="text-xs font-medium text-[#92400e] dark:text-[#fde68a]">BananaRouter tip</div>
          <div className="text-xs text-[#a16207] dark:text-[#fcd34d]/80 leading-relaxed mt-1">Press <span className="rounded bg-white dark:bg-black/20 px-1.5 py-0.5 font-mono">⌘ K</span> to jump anywhere.</div>
        </div>
      )}
    </nav>
  );
}

export function SidebarProjects({ projects, activeId, onSelect }: {
  projects: { id: string; name: string }[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (projects.length === 0) return null;
  return (
    <div className="px-3 py-2">
      <div className="mb-1 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
        <FolderKanban size={12} /> Projects
      </div>
      <div className="space-y-1">
        <button
          onClick={() => onSelect(null)}
          className={clsx("w-full rounded-lg px-2 py-1.5 text-left text-sm", !activeId ? "bg-[#FFFBEB] dark:bg-[#2a2210] font-medium text-[#92400e]" : "hover:bg-[hsl(var(--muted))]" )}
        >
          All workspaces
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={clsx("w-full truncate rounded-lg px-2 py-1.5 text-left text-sm", activeId === p.id ? "bg-[#FFFBEB] dark:bg-[#2a2210] font-medium text-[#92400e]" : "hover:bg-[hsl(var(--muted))]" )}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
