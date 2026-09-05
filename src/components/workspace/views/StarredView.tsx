"use client";

import { Star } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";

export function StarredView() {
  const { state } = useWorkspace();
  const items = [
    ...state.documents.filter((d) => d.starred && !d.trashed).map((d) => ({ type: "Document", title: d.title, at: d.updatedAt })),
    ...state.files.filter((f) => f.starred && !f.trashed).map((f) => ({ type: "File", title: f.name, at: f.updatedAt })),
    ...state.notes.filter((n) => (n as any).starred && !n.trashed).map((n) => ({ type: "Note", title: (n as any).title || "Untitled", at: n.updatedAt })),
    ...state.tasks.filter((t) => (t as any).starred && !t.trashed).map((t) => ({ type: "Task", title: t.title, at: t.updatedAt })),
  ].sort((a, b) => b.at - a.at);

  return (
    <div className="mx-auto max-w-[720px] p-6">
      <h1 className="flex items-center gap-2 text-xl font-medium"><Star className="fill-[#fbbc04] text-[#fbbc04]" size={20} /> Starred</h1>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Favorites from across your workspace.</p>
      <div className="mt-6 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-white p-8 text-center dark:bg-[#303134]">
            <p className="text-sm font-medium">No starred items yet</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Star documents, files, notes, or tasks to find them here.</p>
          </div>
        ) : (
          items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-white px-3 py-3 dark:bg-[#303134]">
              <Star size={14} className="fill-[#fbbc04] text-[#fbbc04]" />
              <span className="flex-1 truncate text-sm font-medium">{it.title}</span>
              <span className="rounded-full bg-[#f1f3f4] px-2 py-0.5 text-xs dark:bg-[#202124]">{it.type}</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(it.at).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
