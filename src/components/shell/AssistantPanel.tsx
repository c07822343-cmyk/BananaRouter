"use client";

import { useState, useRef } from "react";
import { Sparkles, X, Send, Loader2, ExternalLink } from "lucide-react";
import { AIContext } from "@/lib/workspace/types";
import { useWorkspace } from "@/lib/workspace/context";
import { executeAI } from "@/lib/ai/service";
import { loadSettings } from "@/lib/client/settings";

export function AssistantPanel({ open, onClose, context, view }: {
  open: boolean;
  onClose: () => void;
  context: AIContext;
  view: string;
}) {
  const { addNotification } = useWorkspace();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const hasContext = Boolean(context.selectedDocument || context.selectedFiles?.length || context.selectedNote || context.selectedSpreadsheet);

  const handleAsk = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    const settings = loadSettings();
    setLoading(true);
    setOutput("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const text = await executeAI({
        model: settings.model,
        toolId: "general",
        input: trimmed,
        context,
        signal: controller.signal,
        onDelta: (d) => setOutput((prev) => prev + d),
      });
      addNotification({ title: "Assistant replied", message: `Context: ${view} • ${hasContext ? "with selected context" : "no extra context"}`, type: "success" });
    } catch (e: any) {
      if (e?.code === "aborted") return;
      const msg = e?.message || "AI request failed";
      setOutput(`Error: ${msg}`);
      addNotification({ title: "Assistant error", message: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-[hsl(var(--border))] bg-white dark:bg-[#202124]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8ab4f8] text-[#202124]">
            <Sparkles size={14} />
          </div>
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 rounded-xl bg-[#e8f0fe] p-3 text-xs dark:bg-[#394457]">
          <div className="font-medium">Current view: {view}</div>
          {hasContext ? (
            <div className="mt-1 text-[hsl(var(--muted-foreground))] dark:text-[#bdc1c6]">
              Context attached: {[
                context.selectedDocument && `Document: ${context.selectedDocument.title}`,
                context.selectedFiles?.length ? `Files: ${context.selectedFiles.map((f) => f.name).join(", ")}` : null,
                context.selectedNote && `Note: ${context.selectedNote.title}`,
                context.selectedSpreadsheet && `Sheet: ${context.selectedSpreadsheet.title}`,
              ].filter(Boolean).join(" • ") || "minimal context"}
            </div>
          ) : (
            <div className="mt-1 text-[hsl(var(--muted-foreground))] dark:text-[#bdc1c6]">No extra context selected. Attach a file or select a document to give the AI more to work with.</div>
          )}
          <div className="mt-2 text-[11px] text-[#1a73e8] dark:text-[#8ab4f8]">Only the selected context is sent to OpenRouter.</div>
        </div>

        {output && (
          <div className="mb-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-sm leading-6">
            <div className="mb-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">Response</div>
            <div className="whitespace-pre-wrap">{output}</div>
          </div>
        )}

        {!output && !loading && (
          <div className="space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
            <p className="font-medium text-[hsl(var(--foreground))]">Try:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Summarize this document.</li>
              <li>Find the biggest changes.</li>
              <li>Organize these files.</li>
              <li>Create a plan for these tasks.</li>
            </ul>
          </div>
        )}

        {loading && <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]"><Loader2 size={16} className="animate-spin" /> Generating…</div>}
      </div>

      <div className="border-t border-[hsl(var(--border))] p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
            placeholder={hasContext ? "Ask about the selected context..." : "Ask the assistant..."}
            className="flex-1 rounded-full border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1a73e8]"
          />
          <button
            onClick={handleAsk}
            disabled={loading || !input.trim()}
            className="rounded-full bg-[#1a73e8] p-2.5 text-white hover:bg-[#1765cc] disabled:opacity-50"
            aria-label="Send"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
          <span>Powered by OpenRouter</span>
          <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">Manage key <ExternalLink size={10} /></a>
        </div>
      </div>
    </div>
  );
}
