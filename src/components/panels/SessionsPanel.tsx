"use client";

import { useWorkspace } from "@/lib/workspace/context";
import { Search, Plus, Trash2, Copy, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/client/utils";

export function SessionsPanel({ onOpenSession, activeId }: { onOpenSession: (id: string) => void; activeId: string | null }) {
  const { state, setConversations } = useWorkspace();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return list;
    return list.filter((c) => `${c.title} ${c.messages.map((m) => m.content).join(" ")}`.toLowerCase().includes(q));
  }, [state.conversations, query]);

  const groups = useMemo(() => {
    const today: typeof filtered = [];
    const yesterday: typeof filtered = [];
    const older: typeof filtered = [];
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 86400000;
    for (const c of filtered) {
      if (c.updatedAt >= startToday) today.push(c);
      else if (c.updatedAt >= startYesterday) yesterday.push(c);
      else older.push(c);
    }
    return [
      { label: "Today", items: today },
      { label: "Yesterday", items: yesterday },
      { label: "Older", items: older },
    ].filter((g) => g.items.length > 0);
  }, [filtered]);

  const handleDuplicate = (id: string) => {
    const c = state.conversations.find((x) => x.id === id);
    if (!c) return;
    const copy = { ...c, id: `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, title: `${c.title} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
    setConversations([copy, ...state.conversations]);
  };
  const handleDelete = (id: string) => {
    if (!confirm("Delete session?")) return;
    setConversations(state.conversations.filter((c) => c.id !== id));
  };

  return (
    <div className="flex h-full flex-col bg-[#121214] text-zinc-300">
      <div className="p-3">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions…"
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1e] py-1.5 pl-7 pr-2 text-xs placeholder:text-zinc-500 focus:border-amber-500/40 focus:outline-none"
          />
        </div>
        <div className="mt-2 text-[11px] text-zinc-500">{filtered.length} session{filtered.length !== 1 ? "s" : ""}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-500">{g.label}</div>
            <div className="space-y-1">
              {g.items.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpenSession(c.id)}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 ${activeId === c.id ? "bg-white/10 text-zinc-100 border border-white/10" : "hover:bg-white/5 border border-transparent"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{c.title || "New session"}</div>
                    <div className="truncate text-[11px] text-zinc-500">
                      {c.messages.length} msg · {formatRelativeTime(c.updatedAt)}
                    </div>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(c.id);
                      }}
                      className="rounded p-1 hover:bg-white/10"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      className="rounded p-1 hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-6 text-center text-xs text-zinc-500">No sessions.</div>}
      </div>
    </div>
  );
}
