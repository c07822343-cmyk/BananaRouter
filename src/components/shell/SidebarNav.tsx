"use client";

import {
  Home, MessageSquare, FileText, HardDrive, Table2, Mail, Calendar, CheckSquare, StickyNote, Sparkles, Trash2, Settings, Star, FolderKanban, Search
} from "lucide-react";
import clsx from "clsx";

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
  return (
    <nav className="space-y-1 px-2">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={clsx(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            current === item.id
              ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]"
              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] dark:hover:bg-white/10"
          )}
          title={item.label}
          aria-current={current === item.id ? "page" : undefined}
        >
          <span className={clsx(current === item.id && "text-[#1a73e8] dark:text-[#8ab4f8]")}>{item.icon}</span>
          {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
          {!collapsed && counts?.[item.id] ? (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#1a73e8] dark:bg-white/20 dark:text-white">
              {counts[item.id]}
            </span>
          ) : null}
        </button>
      ))}
      <div className="my-2 border-t border-[hsl(var(--border))]" />
      <button
        onClick={() => onNavigate("trash")}
        className={clsx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm", current === "trash" ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]")}
      >
        <Trash2 size={18} /> {!collapsed && "Trash"}
      </button>
      <button
        onClick={() => onNavigate("settings")}
        className={clsx("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm", current === "settings" ? "bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]")}
      >
        <Settings size={18} /> {!collapsed && "Settings"}
      </button>
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
          className={clsx("w-full rounded-lg px-2 py-1.5 text-left text-sm", !activeId ? "bg-[hsl(var(--accent))] font-medium" : "hover:bg-[hsl(var(--muted))]")}
        >
          All workspaces
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={clsx("w-full truncate rounded-lg px-2 py-1.5 text-left text-sm", activeId === p.id ? "bg-[hsl(var(--accent))] font-medium" : "hover:bg-[hsl(var(--muted))]")}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
