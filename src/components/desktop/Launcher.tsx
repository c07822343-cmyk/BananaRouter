"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, MessageSquare, Files, Wrench, Boxes, Settings, History, Command, HardDrive } from "lucide-react";
import { BananaLogo } from "@/components/branding/BananaLogo";

type LauncherItem = {
  id: string;
  label: string;
  desc?: string;
  icon: React.ReactNode;
  kbd?: string;
  action: () => void;
};

export function Launcher({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const items: LauncherItem[] = useMemo(
    () => [
      { id: "chat", label: "AI Chat", desc: "New session", icon: <MessageSquare size={16} />, action: () => onOpen("chat") },
      { id: "files", label: "Files", desc: "Browse & attach", icon: <Files size={16} />, kbd: "F", action: () => onOpen("files") },
      { id: "tools", label: "Tool Explorer", desc: "Built-in & MCP tools", icon: <Wrench size={16} />, action: () => onOpen("tools") },
      { id: "mcp", label: "MCP Servers", desc: "Manage servers", icon: <Boxes size={16} />, action: () => onOpen("mcp") },
      { id: "sessions", label: "Sessions", desc: "History", icon: <History size={16} />, action: () => onOpen("sessions") },
      { id: "settings", label: "Settings", desc: "OpenRouter, Tools, Appearance", icon: <Settings size={16} />, kbd: ",", action: () => onOpen("settings") },
    ],
    [onOpen]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter((i) => `${i.label} ${i.desc ?? ""}`.toLowerCase().includes(q));
  }, [items, query]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-[18vh]" onClick={onClose}>
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search size={16} className="text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask, search, or open…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          <span className="hidden sm:inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">
            <Command size={10} /> Space
          </span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.map((it) => (
            <button
              key={it.id}
              onClick={() => {
                it.action();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/10 transition"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-300">
                {it.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-zinc-100">{it.label}</span>
                {it.desc && <span className="block text-xs text-zinc-500">{it.desc}</span>}
              </span>
              {it.kbd && <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-zinc-400">{it.kbd}</span>}
            </button>
          ))}
          {filtered.length === 0 && <div className="p-6 text-center text-sm text-zinc-500">No match.</div>}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 bg-[#0f0f10] px-3 py-2 text-[11px] text-zinc-500">
          <span className="flex items-center gap-2">
            <BananaLogo size={14} /> BananaRouter launcher
          </span>
          <span>↵ open · Esc close</span>
        </div>
      </div>
    </div>
  );
}
