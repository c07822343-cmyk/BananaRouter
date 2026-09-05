"use client";

import { useState, useRef } from "react";
import { FileText, Plus, Search, Star, Trash2, Copy, MoreHorizontal, Wand2, History, Download, Bold, Italic, List, Quote, Link as LinkIcon } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { DocumentEntity } from "@/lib/workspace/types";
import { executeAI } from "@/lib/ai/service";
import { loadSettings } from "@/lib/client/settings";

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function DocumentsView({ onOpenInChat }: { onOpenInChat?: (doc: DocumentEntity) => void }) {
  const { state, createDocument, updateDocument, deleteDocument, duplicateDocument, addNotification } = useWorkspace();
  const docs = state.documents.filter((d) => !d.trashed).sort((a, b) => b.updatedAt - a.updatedAt);
  const [activeId, setActiveId] = useState<string | null>(docs[0]?.id ?? null);
  const active = docs.find((d) => d.id === activeId) ?? null;
  const [query, setQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState<{ original: string; suggestion: string; label: string } | null>(null);
  const [selection, setSelection] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = query ? docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()) || d.content.toLowerCase().includes(query.toLowerCase())) : docs;

  const handleCreate = () => {
    const doc = createDocument("Untitled document", "# New document\n\nStart writing…");
    setActiveId(doc.id);
  };

  const handleAiAction = async (tool: string, label: string, extra?: string) => {
    if (!active) return;
    const src = selection || active.content;
    if (!src.trim()) { addNotification({ title: "No content", message: "Document is empty.", type: "warning" }); return; }
    // version snapshot before AI
    const version = { id: `v_${Date.now()}`, documentId: active.id, title: active.title, content: active.content, createdAt: Date.now(), label: `Before ${label}` };
    updateDocument(active.id, { versions: [...(active.versions ?? []), version] });
    setIsAiLoading(true);
    const settings = loadSettings();
    setAiPreview(null);
    try {
      let toolId: any = "document.rewrite";
      if (tool === "summarize") toolId = "document.summarize";
      if (tool === "expand") toolId = "document.expand";
      if (tool === "shorten") toolId = "document.shorten";
      if (tool === "grammar") toolId = "document.grammar";
      if (tool === "tone") toolId = "document.tone";
      if (tool === "continue") toolId = "document.continue";
      if (tool === "outline") toolId = "document.outline";
      const out = await executeAI({ model: settings.model, toolId, input: src, contextText: extra, signal: new AbortController().signal });
      setAiPreview({ original: active.content, suggestion: out, label });
    } catch (e: any) {
      addNotification({ title: "AI failed", message: e?.message || "Could not complete AI action", type: "error" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const applyPreview = (mode: "replace" | "insert") => {
    if (!active || !aiPreview) return;
    if (mode === "replace") {
      if (selection) {
        const newContent = active.content.replace(selection, aiPreview.suggestion);
        updateDocument(active.id, { content: newContent });
      } else {
        updateDocument(active.id, { content: aiPreview.suggestion });
      }
    } else {
      updateDocument(active.id, { content: active.content + "\n\n" + aiPreview.suggestion });
    }
    setAiPreview(null);
    addNotification({ title: "Document updated", message: `AI ${aiPreview.label} applied`, type: "success" });
  };

  if (docs.length === 0) {
    return (
      <div className="mx-auto max-w-[720px] p-8 text-center">
        <FileText size={32} className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]" />
        <h2 className="text-lg font-medium">No documents yet</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Create your first document or import a file.</p>
        <button onClick={handleCreate} className="mt-4 rounded-full bg-[#b45309] px-5 py-2 text-sm font-medium text-white">New document</button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* left list */}
      <div className="hidden w-[320px] shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[#f8f9fa] dark:bg-[#202124] md:flex">
        <div className="p-3">
          <button onClick={handleCreate} className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium shadow hover:bg-[#f1f3f4] dark:bg-[#303134]">
            <Plus size={16} /> New document
          </button>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents" className="w-full rounded-full bg-white py-2 pl-9 pr-3 text-sm dark:bg-[#303134]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {filtered.map((d) => (
            <button key={d.id} onClick={() => setActiveId(d.id)} className={`mb-1 flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left ${activeId === d.id ? "bg-white shadow dark:bg-[#303134]" : "hover:bg-white dark:hover:bg-white/10"}`}>
              <FileText size={16} className="mt-0.5 shrink-0 text-[#b45309]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{d.title}</span>
                <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">{d.content.slice(0, 60) || "Empty"}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* editor */}
      <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#202124]">
        {active ? (
          <>
            {/* toolbar */}
            <div className="flex flex-wrap items-center gap-1 border-b border-[hsl(var(--border))] bg-[#f1f3f4] px-2 py-1.5 text-xs dark:bg-[#303134]">
              <span className="mr-2 hidden text-[11px] font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))] md:block">File</span>
              <button onClick={() => updateDocument(active.id, { starred: !active.starred })} className="rounded px-2 py-1 hover:bg-white"><Star size={14} className={active.starred ? "fill-[#fbbc04] text-[#fbbc04]" : ""} /></button>
              <button onClick={() => duplicateDocument(active.id)} className="rounded px-2 py-1 hover:bg-white"><Copy size={14} /></button>
              <button onClick={() => { if (confirm("Move to trash?")) deleteDocument(active.id); }} className="rounded px-2 py-1 hover:bg-white"><Trash2 size={14} /></button>
              <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand("bold"); }} className="rounded px-2 py-1 hover:bg-white"><Bold size={14} /></button>
              <button onMouseDown={(e) => { e.preventDefault(); document.execCommand("italic"); }} className="rounded px-2 py-1 hover:bg-white"><Italic size={14} /></button>
              <button onClick={() => updateDocument(active.id, { content: active.content + "\n- " })} className="rounded px-2 py-1 hover:bg-white"><List size={14} /></button>
              <button onClick={() => updateDocument(active.id, { content: active.content + "\n> " })} className="rounded px-2 py-1 hover:bg-white"><Quote size={14} /></button>
              <div className="ml-auto flex items-center gap-1">
                <span className="hidden text-[11px] text-[hsl(var(--muted-foreground))] md:block">{countWords(active.content)} words • {active.content.length} chars</span>
                <button
                  onClick={() => { const blob = new Blob([active.content], { type: "text/markdown" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${active.title}.md`; a.click(); URL.revokeObjectURL(url); }}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium shadow"
                >
                  Export
                </button>
              </div>
            </div>

            {/* AI toolbar */}
            <div className="flex flex-wrap gap-1 border-b border-[hsl(var(--border))] bg-white px-3 py-2 dark:bg-[#202124]">
              <span className="mr-2 flex items-center gap-1 text-xs font-medium text-[#b45309]"><Wand2 size={12} /> AI tools:</span>
              {[
                { k: "summarize", l: "Summarize" }, { k: "rewrite", l: "Rewrite" }, { k: "expand", l: "Expand" }, { k: "shorten", l: "Shorten" }, { k: "grammar", l: "Fix grammar" }, { k: "continue", l: "Continue" }, { k: "outline", l: "Outline" },
              ].map((b) => (
                <button key={b.k} disabled={isAiLoading} onClick={() => handleAiAction(b.k, b.l)} className="rounded-full bg-[#FFFBEB] px-2.5 py-1 text-xs font-medium text-[#b45309] hover:bg-[#FDE68A] disabled:opacity-50 dark:bg-[#2a2210] dark:text-[#fcd34d]">
                  {b.l}
                </button>
              ))}
              <button onClick={() => handleAiAction("tone", "Change tone", "professional")} disabled={isAiLoading} className="rounded-full bg-[#FFFBEB] px-2.5 py-1 text-xs dark:bg-[#2a2210] dark:text-[#fcd34d]">Professional tone</button>
              <button onClick={() => { if (onOpenInChat) onOpenInChat(active); }} className="ml-auto rounded-full border px-2.5 py-1 text-xs">Ask AI about this</button>
            </div>

            {/* content */}
            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-1 flex-col overflow-y-auto">
                <input
                  value={active.title}
                  onChange={(e) => updateDocument(active.id, { title: e.target.value })}
                  placeholder="Untitled document"
                  className="border-none bg-transparent px-6 pt-6 text-xl font-medium outline-none"
                />
                <textarea
                  ref={textareaRef}
                  value={active.content}
                  onChange={(e) => updateDocument(active.id, { content: e.target.value })}
                  onSelect={(e) => {
                    const el = e.currentTarget;
                    const sel = el.value.slice(el.selectionStart, el.selectionEnd);
                    if (sel.length > 3) setSelection(sel);
                    else setSelection("");
                  }}
                  placeholder="Start writing… Tip: select text then choose an AI action to operate on selection."
                  className="min-h-[400px] flex-1 resize-none bg-transparent px-6 py-4 text-[15px] leading-7 outline-none"
                />
                {active.versions && active.versions.length > 0 && (
                  <div className="border-t px-6 py-3">
                    <div className="flex items-center gap-2 text-xs font-medium"><History size={12} /> Versions ({active.versions.length})</div>
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {active.versions.slice(-5).reverse().map((v) => (
                        <div key={v.id} className="shrink-0 rounded-xl border bg-[#f8f9fa] p-2 text-xs dark:bg-[#303134]">
                          <div className="font-medium">{v.label}</div>
                          <div className="text-[11px] text-[hsl(var(--muted-foreground))]">{new Date(v.createdAt).toLocaleString()}</div>
                          <button onClick={() => updateDocument(active.id, { content: v.content })} className="mt-1 rounded bg-white px-2 py-1 text-xs shadow">Restore</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI preview side */}
              {aiPreview && (
                <div className="hidden w-[360px] shrink-0 flex-col border-l bg-[#f8f9fa] p-4 dark:bg-[#303134] lg:flex">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">AI Suggestion • {aiPreview.label}</span>
                    <button onClick={() => setAiPreview(null)} className="rounded-full p-1 hover:bg-white">✕</button>
                  </div>
                  <div className="flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-white p-3 text-sm dark:bg-[#202124]">{aiPreview.suggestion}</div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => applyPreview("replace")} className="flex-1 rounded-full bg-[#b45309] py-2 text-sm font-medium text-white">Replace</button>
                    <button onClick={() => applyPreview("insert")} className="flex-1 rounded-full bg-white py-2 text-sm font-medium shadow">Insert below</button>
                  </div>
                  <button onClick={() => setAiPreview(null)} className="mt-2 rounded-full py-1 text-xs text-[hsl(var(--muted-foreground))]">Cancel</button>
                </div>
              )}
            </div>

            {isAiLoading && <div className="border-t bg-[#FFFBEB] px-4 py-2 text-xs text-[#b45309] dark:bg-[#2a2210] dark:text-[#fcd34d]">AI is generating… {selection ? "using selected text" : "using whole document"} — only selected context is sent to OpenRouter.</div>}
          </>
        ) : (
          <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Select a document</div>
        )}
      </div>
    </div>
  );
}
