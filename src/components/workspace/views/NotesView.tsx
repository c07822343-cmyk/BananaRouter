"use client";

import { useState } from "react";
import { StickyNote, Plus, Pin, Palette, Trash2, Archive, Search, Tag, Sparkles, Copy, FileText } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { Note } from "@/lib/workspace/types";
import { executeAI } from "@/lib/ai/service";
import { loadSettings } from "@/lib/client/settings";

const COLORS: Record<string, string> = {
  default: "bg-white dark:bg-[#303134]",
  yellow: "bg-[#fef7e0] dark:bg-[#5a4a1a]",
  blue: "bg-[#FFFBEB] dark:bg-[#1e3a5f]",
  green: "bg-[#e6f4ea] dark:bg-[#1e3a2a]",
  pink: "bg-[#fce8e6] dark:bg-[#4a1e1e]",
};

export function NotesView() {
  const { state, createNote, updateNote, deleteNote, addNotification, createDocument } = useWorkspace();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const notes = state.notes.filter((n) => !n.trashed && !n.archived).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  const filtered = query ? notes.filter((n) => n.title.toLowerCase().includes(query.toLowerCase()) || n.content.toLowerCase().includes(query.toLowerCase()) || n.labels.join(" ").toLowerCase().includes(query.toLowerCase())) : notes;

  const active = filtered.find((n) => n.id === selected) ?? null;

  const handleAi = async (note: Note, action: "summarize" | "organize" | "expand" | "tasks" | "doc") => {
    const settings = loadSettings();
    let tool: any = "note.summarize";
    let input = note.content;
    if (action === "organize") tool = "note.organize";
    if (action === "expand") tool = "document.expand";
    if (action === "tasks") tool = "task.breakdown";
    if (action === "doc") {
      const doc = createDocument(note.title || "From note", note.content);
      addNotification({ title: "Note → Document", message: `Created "${doc.title}"`, type: "success" });
      return;
    }
    try {
      const out = await executeAI({ model: settings.model, toolId: tool, input: input.slice(0, 6000), signal: new AbortController().signal });
      if (action === "summarize" || action === "organize" || action === "expand") {
        updateNote(note.id, { content: out });
        addNotification({ title: "Note updated", message: `AI ${action} applied`, type: "success" });
      } else if (action === "tasks") {
        // leave as note update with AI output
        updateNote(note.id, { content: note.content + "\n\nAI tasks:\n" + out });
      }
    } catch (e: any) {
      addNotification({ title: "AI failed", message: e?.message ?? "error", type: "error" });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2.5 dark:bg-[#202124]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="w-full rounded-full bg-[#f1f3f4] py-2 pl-9 pr-3 text-sm dark:bg-[#303134]" />
        </div>
        <button onClick={() => { const n = createNote({ title: "Untitled", content: "", color: "default" }); setSelected(n.id); }} className="ml-auto rounded-full bg-[#b45309] px-4 py-2 text-sm font-medium text-white"><Plus size={14} className="inline" /> Note</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-[#f1f3f4] p-4 dark:bg-[#202124]">
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center dark:bg-[#303134]">
              <StickyNote size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No notes yet</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Create a note, pin it, color it, and turn it into a document or tasks.</p>
            </div>
          ) : (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setSelected(n.id)}
                  className={`mb-4 break-inside-avoid rounded-2xl border p-3 shadow-sm hover:shadow-md ${COLORS[n.color] ?? COLORS.default} ${selected === n.id ? "ring-2 ring-[#b45309]" : ""} ${n.pinned ? "border-[#fbbc04]" : "border-[hsl(var(--border))]"}`}
                >
                  {n.title && <div className="truncate text-sm font-medium">{n.title}</div>}
                  <div className="mt-1 whitespace-pre-wrap text-sm leading-6">{n.content.slice(0, 300) || <span className="text-[hsl(var(--muted-foreground))]">Empty note</span>}</div>
                  {n.checklist && n.checklist.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {n.checklist.slice(0, 4).map((it) => (
                        <label key={it.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={it.checked} readOnly /> {it.text}</label>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {n.labels.map((l) => (
                      <span key={l} className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] dark:bg-black/20">{l}</span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); updateNote(n.id, { pinned: !n.pinned }); }} className={`rounded-full p-1 ${n.pinned ? "bg-[#fef7e0]" : "hover:bg-black/5"}`}><Pin size={12} className={n.pinned ? "fill-[#fbbc04]" : ""} /></button>
                    <button onClick={(e) => { e.stopPropagation(); const c = prompt("Color: default, yellow, blue, green, pink", n.color) ?? n.color; updateNote(n.id, { color: c }); }} className="rounded-full p-1 hover:bg-black/5"><Palette size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); updateNote(n.id, { archived: true }); }} className="rounded-full p-1 hover:bg-black/5"><Archive size={12} /></button>
                    <span className="ml-auto flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleAi(n, "summarize"); }} className="rounded-full bg-[#FFFBEB] px-2 py-1 text-[11px]">Summarize</button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete note?")) deleteNote(n.id); }} className="rounded-full p-1 hover:bg-black/5"><Trash2 size={12} /></button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {active && (
          <div className="hidden w-[420px] shrink-0 flex-col border-l bg-white dark:bg-[#202124] lg:flex">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-medium">Edit note</span>
              <button onClick={() => setSelected(null)} className="rounded-full p-1 hover:bg-[hsl(var(--muted))]">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <input value={active.title} onChange={(e) => updateNote(active.id, { title: e.target.value })} placeholder="Title" className="w-full bg-transparent text-base font-medium outline-none" />
              <textarea value={active.content} onChange={(e) => updateNote(active.id, { content: e.target.value })} placeholder="Note…" className="mt-3 min-h-[200px] w-full resize-none bg-transparent text-sm leading-6 outline-none" />
              <div className="mt-3">
                <label className="text-xs font-medium">Labels (comma separated)</label>
                <input value={active.labels.join(", ")} onChange={(e) => updateNote(active.id, { labels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="work, ideas" className="mt-1 w-full rounded-xl border bg-[#f8f9fa] px-3 py-2 text-sm dark:bg-[#303134]" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <button onClick={() => handleAi(active, "summarize")} className="rounded-full bg-[#FFFBEB] px-3 py-1.5 text-xs">Summarize</button>
                <button onClick={() => handleAi(active, "organize")} className="rounded-full bg-[#FFFBEB] px-3 py-1.5 text-xs">Organize</button>
                <button onClick={() => handleAi(active, "expand")} className="rounded-full bg-[#FFFBEB] px-3 py-1.5 text-xs">Expand</button>
                <button onClick={() => handleAi(active, "doc")} className="rounded-full bg-white px-3 py-1.5 text-xs shadow"><FileText size={12} className="inline" /> To document</button>
                <button onClick={() => { const t = prompt("New checklist item"); if (t) updateNote(active.id, { checklist: [...(active.checklist ?? []), { id: `c_${Date.now()}`, text: t, checked: false }] }); }} className="rounded-full border px-3 py-1.5 text-xs">+ Checklist</button>
              </div>
              {active.checklist && active.checklist.length > 0 && (
                <div className="mt-3 space-y-1">
                  {active.checklist.map((it) => (
                    <label key={it.id} className="flex items-center gap-2 rounded-xl border bg-[#f8f9fa] px-3 py-2 text-sm dark:bg-[#303134]">
                      <input type="checkbox" checked={it.checked} onChange={() => updateNote(active.id, { checklist: active.checklist!.map((x) => x.id === it.id ? { ...x, checked: !x.checked } : x) })} />
                      <span className={it.checked ? "line-through opacity-60" : ""}>{it.text}</span>
                      <button onClick={() => updateNote(active.id, { checklist: active.checklist!.filter((x) => x.id !== it.id) })} className="ml-auto text-xs text-[hsl(var(--muted-foreground))]">✕</button>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t p-3 text-[11px] text-[hsl(var(--muted-foreground))]">Tip: Select text in docs, or pick a note and “Ask AI”.</div>
          </div>
        )}
      </div>
    </div>
  );
}
