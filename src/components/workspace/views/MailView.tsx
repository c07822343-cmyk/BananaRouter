"use client";

import { useState } from "react";
import { Mail, Plus, Search, Star, Archive, Trash2, Send, Sparkles, Paperclip } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { EmailDraft } from "@/lib/workspace/types";
import { executeAI } from "@/lib/ai/service";
import { loadSettings } from "@/lib/client/settings";

export function MailView() {
  const { state, createEmailDraft, updateEmailDraft, deleteEmailDraft, addNotification } = useWorkspace();
  const drafts = state.emailDrafts.filter((d) => !d.trashed).sort((a, b) => b.updatedAt - a.updatedAt);
  const [activeId, setActiveId] = useState<string | null>(drafts[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const active = drafts.find((d) => d.id === activeId) ?? null;
  const filtered = query ? drafts.filter((d) => d.subject.toLowerCase().includes(query.toLowerCase()) || d.body.toLowerCase().includes(query.toLowerCase()) || d.to.toLowerCase().includes(query.toLowerCase())) : drafts;

  const [compose, setCompose] = useState<Partial<EmailDraft>>({ to: "", cc: "", bcc: "", subject: "", body: "" });
  const [aiLoading, setAiLoading] = useState(false);

  const handleComposeSave = () => {
    if (!compose.subject && !compose.body) { addNotification({ title: "Empty draft", message: "Add a subject or body.", type: "warning" }); return; }
    const e = createEmailDraft({ to: compose.to ?? "", subject: compose.subject ?? "(no subject)", body: compose.body ?? "", cc: compose.cc, bcc: compose.bcc });
    setActiveId(e.id);
    setCompose({ to: "", cc: "", bcc: "", subject: "", body: "" });
    setComposeOpen(false);
    addNotification({ title: "Draft saved", message: "Draft saved locally. Not sent — no real email integration configured.", type: "success" });
  };

  const handleAiRewrite = async (mode: "rewrite" | "shorten" | "professional" | "friendly") => {
    if (!active) return;
    setAiLoading(true);
    const settings = loadSettings();
    try {
      const tone = mode === "professional" ? "professional" : mode === "friendly" ? "friendly" : mode === "shorten" ? "concise" : "clear";
      const out = await executeAI({ model: settings.model, toolId: "email.rewrite", input: active.body, contextText: tone, signal: new AbortController().signal });
      updateEmailDraft(active.id, { body: out });
      addNotification({ title: "Draft rewritten", message: `AI made it more ${tone} (preview applied).`, type: "success" });
    } catch (e: any) {
      addNotification({ title: "AI failed", message: e?.message ?? "rewrite failed", type: "error" });
    } finally { setAiLoading(false); }
  };

  const handleAiDraft = async () => {
    const prompt = compose.body || active?.body || "";
    if (!prompt.trim()) { addNotification({ title: "Add prompt", message: "Describe what the email should say.", type: "warning" }); return; }
    setAiLoading(true);
    const settings = loadSettings();
    try {
      const out = await executeAI({ model: settings.model, toolId: "email.draft", input: prompt, contextText: "professional", signal: new AbortController().signal });
      // out may contain subject/body; we just put into body preview
      if (active) updateEmailDraft(active.id, { body: out });
      else setCompose((prev) => ({ ...prev, body: out }));
      addNotification({ title: "Draft generated", message: "AI draft created locally. Review before sending.", type: "success" });
    } catch (e: any) {
      addNotification({ title: "AI failed", message: e?.message ?? "draft failed", type: "error" });
    } finally { setAiLoading(false); }
  };

  return (
    <div className="flex h-full">
      <div className="hidden w-[340px] shrink-0 flex-col border-r bg-[#f8f9fa] dark:bg-[#202124] md:flex">
        <div className="p-3">
          <button onClick={() => setComposeOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b45309] px-4 py-3 text-sm font-medium text-white shadow"><Plus size={16} /> Compose</button>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search drafts" className="w-full rounded-full bg-white py-2 pl-9 pr-3 text-sm dark:bg-[#303134]" />
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="rounded-xl bg-white px-3 py-2 font-medium dark:bg-[#303134]">Drafts ({drafts.length})</div>
            <div className="rounded-xl px-3 py-2 text-[hsl(var(--muted-foreground))]">Sent (local history) — not actually emailed</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {filtered.map((d) => (
            <button key={d.id} onClick={() => setActiveId(d.id)} className={`mb-1 w-full rounded-xl px-3 py-3 text-left ${activeId === d.id ? "bg-white shadow dark:bg-[#303134]" : "hover:bg-white dark:hover:bg-white/10"}`}>
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm font-medium">{d.subject || "(no subject)"}</span>
                {d.starred && <Star size={12} className="fill-[#fbbc04] text-[#fbbc04]" />}
              </div>
              <div className="truncate text-xs text-[hsl(var(--muted-foreground))]">{d.to || "No recipient"} • {d.body.slice(0, 80)}</div>
            </button>
          ))}
          {filtered.length === 0 && <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No drafts match.</div>}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#202124]">
        {composeOpen ? (
          <div className="mx-auto w-full max-w-[640px] p-4 md:p-6">
            <h2 className="text-lg font-medium">New message — local draft</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">This does not send real email unless a Gmail integration is later configured. Use AI to draft, then export or copy.</p>
            <div className="mt-4 space-y-3">
              <input value={compose.to ?? ""} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder="To" className="w-full rounded-xl border bg-[#f8f9fa] px-3 py-2 text-sm dark:bg-[#303134]" />
              <div className="grid grid-cols-2 gap-2">
                <input value={compose.cc ?? ""} onChange={(e) => setCompose({ ...compose, cc: e.target.value })} placeholder="Cc" className="rounded-xl border bg-[#f8f9fa] px-3 py-2 text-sm dark:bg-[#303134]" />
                <input value={compose.bcc ?? ""} onChange={(e) => setCompose({ ...compose, bcc: e.target.value })} placeholder="Bcc" className="rounded-xl border bg-[#f8f9fa] px-3 py-2 text-sm dark:bg-[#303134]" />
              </div>
              <input value={compose.subject ?? ""} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Subject" className="w-full rounded-xl border bg-[#f8f9fa] px-3 py-2 text-sm dark:bg-[#303134]" />
              <textarea value={compose.body ?? ""} onChange={(e) => setCompose({ ...compose, body: e.target.value })} placeholder="Body — describe what you want AI to draft" className="min-h-[180px] w-full rounded-xl border bg-[#f8f9fa] p-3 text-sm dark:bg-[#303134]" />
              <div className="flex flex-wrap gap-2">
                <button onClick={handleAiDraft} disabled={aiLoading} className="rounded-full bg-[#b45309] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Sparkles size={14} className="inline" /> AI Draft</button>
                <button onClick={handleComposeSave} className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow">Save draft</button>
                <button onClick={() => setComposeOpen(false)} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        ) : active ? (
          <>
            <div className="flex items-center gap-2 border-b bg-[#f1f3f4] px-4 py-2 dark:bg-[#303134]">
              <button onClick={() => setComposeOpen(true)} className="rounded-full bg-white px-3 py-1 text-xs shadow md:hidden">Compose</button>
              <div className="ml-auto flex gap-1">
                <button onClick={handleAiDraft} disabled={aiLoading} className="rounded-full bg-[#FFFBEB] px-3 py-1.5 text-xs font-medium text-[#b45309] disabled:opacity-50"><Sparkles size={12} className="inline" /> AI Draft/Improve</button>
                <button onClick={() => handleAiRewrite("professional")} disabled={aiLoading} className="rounded-full bg-white px-3 py-1 text-xs shadow">More professional</button>
                <button onClick={() => handleAiRewrite("shorten")} disabled={aiLoading} className="rounded-full bg-white px-3 py-1 text-xs shadow">Shorter</button>
                <button onClick={() => handleAiRewrite("friendly")} disabled={aiLoading} className="rounded-full bg-white px-3 py-1 text-xs shadow">Friendlier</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="mx-auto max-w-[640px]">
                <div className="rounded-2xl border bg-[#f8f9fa] p-4 dark:bg-[#303134]">
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2"><span className="w-12 text-[hsl(var(--muted-foreground))]">To</span><input value={active.to} onChange={(e) => updateEmailDraft(active.id, { to: e.target.value })} className="flex-1 bg-transparent outline-none" placeholder="recipient@example.com" /></div>
                    <div className="flex gap-2"><span className="w-12 text-[hsl(var(--muted-foreground))]">Cc</span><input value={active.cc ?? ""} onChange={(e) => updateEmailDraft(active.id, { cc: e.target.value })} className="flex-1 bg-transparent outline-none" placeholder="" /></div>
                    <div className="flex gap-2"><span className="w-12 text-[hsl(var(--muted-foreground))]">Subject</span><input value={active.subject} onChange={(e) => updateEmailDraft(active.id, { subject: e.target.value })} className="flex-1 bg-transparent font-medium outline-none" /></div>
                  </div>
                </div>
                <textarea value={active.body} onChange={(e) => updateEmailDraft(active.id, { body: e.target.value })} className="mt-4 min-h-[280px] w-full rounded-2xl border bg-white p-4 text-sm leading-6 dark:bg-[#303134]" />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { addNotification({ title: "Not sent", message: "Drafts are local only. Configure Gmail integration to send.", type: "info" }); }} className="rounded-full bg-[#b45309] px-5 py-2 text-sm font-medium text-white"><Send size={14} className="inline" /> Save (not sent)</button>
                  <button onClick={() => updateEmailDraft(active.id, { starred: !active.starred })} className="rounded-full border bg-white px-3 py-2 text-sm dark:bg-[#303134]"><Star size={14} className={active.starred ? "fill-[#fbbc04] text-[#fbbc04]" : ""} /></button>
                  <button onClick={() => { if (confirm("Delete draft?")) deleteEmailDraft(active.id); }} className="rounded-full border bg-white px-3 py-2 text-sm dark:bg-[#303134]"><Trash2 size={14} /></button>
                </div>
                <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">AI actions clearly indicate drafts are generated locally through OpenRouter and are not actually sent.</div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <Mail size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No draft selected</p>
            <button onClick={() => setComposeOpen(true)} className="mt-3 rounded-full bg-[#b45309] px-4 py-2 text-sm font-medium text-white">Compose</button>
          </div>
        )}
      </div>
    </div>
  );
}
