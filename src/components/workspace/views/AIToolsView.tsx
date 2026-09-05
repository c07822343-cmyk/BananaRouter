"use client";

import { useState } from "react";
import { Sparkles, FileText, Table2, StickyNote, Mail, CheckSquare, Languages, Code2, GraduationCap, Search, Wand2 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { executeAI } from "@/lib/ai/service";
import { loadSettings } from "@/lib/client/settings";
import { AIToolId } from "@/lib/workspace/types";

const TOOLS: { id: AIToolId; title: string; desc: string; icon: React.ReactNode; placeholder: string }[] = [
  { id: "document.summarize", title: "Summarizer", desc: "Summarize documents or notes", icon: <FileText size={18} />, placeholder: "Paste content to summarize..." },
  { id: "document.rewrite", title: "Writing Assistant", desc: "Rewrite, improve, change tone", icon: <Wand2 size={18} />, placeholder: "Text to rewrite..." },
  { id: "sheet.analyze", title: "Data Analyzer", desc: "Analyze sheets or CSV", icon: <Table2 size={18} />, placeholder: "Paste CSV or describe data..." },
  { id: "task.breakdown", title: "Planner", desc: "Break goals into tasks", icon: <CheckSquare size={18} />, placeholder: "Goal to break down..." },
  { id: "email.draft", title: "Email Assistant", desc: "Draft or rewrite emails", icon: <Mail size={18} />, placeholder: "What should the email say?" },
  { id: "general", title: "Research Assistant", desc: "Ask anything", icon: <Search size={18} />, placeholder: "Your question..." },
  { id: "note.organize", title: "Brainstormer", desc: "Organize notes & ideas", icon: <StickyNote size={18} />, placeholder: "Notes to organize..." },
  { id: "document.grammar", title: "Text Formatter", desc: "Fix grammar", icon: <Languages size={18} />, placeholder: "Text to fix..." },
  { id: "document.title", title: "Study Assistant", desc: "Create outlines and titles", icon: <GraduationCap size={18} />, placeholder: "Content to create study guide..." },
  { id: "document.continue", title: "Code Assistant", desc: "Continue writing or code", icon: <Code2 size={18} />, placeholder: "Code or text to continue..." },
];

export function AIToolsView() {
  const { addNotification, createDocument, createTask } = useWorkspace();
  const [active, setActive] = useState<AIToolId>("document.summarize");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const tool = TOOLS.find((t) => t.id === active)!;

  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");
    const settings = loadSettings();
    try {
      let full = "";
      await executeAI({ model: settings.model, toolId: active, input: input.trim(), signal: new AbortController().signal, onDelta: (d) => { full += d; setOutput(full); } });
      setOutput(full);
    } catch (e: any) {
      setOutput(`Error: ${e?.message ?? "failed"}`);
      addNotification({ title: "AI tool failed", message: e?.message ?? "failed", type: "error" });
    } finally { setLoading(false); }
  };

  const handleApply = (mode: string) => {
    if (!output) return;
    if (mode === "doc") {
      const doc = createDocument(`AI: ${tool.title}`, output);
      addNotification({ title: "Tool → Document", message: `Created "${doc.title}"`, type: "success" });
    } else if (mode === "task") {
      createTask(output.split("\n")[0].slice(0, 80) || tool.title, { description: output.slice(0, 300) });
      addNotification({ title: "Tool → Task", message: "Task created from output.", type: "success" });
    } else if (mode === "copy") {
      navigator.clipboard.writeText(output).then(() => addNotification({ title: "Copied", message: "Output copied to clipboard.", type: "success" }));
    }
  };

  return (
    <div className="flex h-full">
      <div className="hidden w-[280px] shrink-0 flex-col border-r bg-[#f8f9fa] p-3 dark:bg-[#202124] md:flex">
        <div className="mb-2 flex items-center gap-2 px-2 text-sm font-medium"><Sparkles size={16} className="text-[#1a73e8]" /> AI Toolbox</div>
        <div className="space-y-1 overflow-y-auto">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => { setActive(t.id as AIToolId); setOutput(""); }} className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left ${active === t.id ? "bg-white shadow dark:bg-[#303134]" : "hover:bg-white dark:hover:bg-white/10"}`}>
              <span className="rounded-lg bg-[#e8f0fe] p-1.5 text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8]">{t.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{t.title}</span>
                <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">{t.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#202124]">
        <div className="border-b bg-[#f8f9fa] px-4 py-3 dark:bg-[#202124]">
          <div className="flex items-center gap-2 text-sm font-medium">{tool.icon} {tool.title}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">{tool.desc} • Powered by OpenRouter — only this input is sent.</div>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:flex-row">
          <div className="flex flex-1 flex-col">
            <label className="mb-1 text-xs font-medium">Input</label>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={tool.placeholder} className="min-h-[180px] flex-1 rounded-2xl border bg-[#f8f9fa] p-3 text-sm dark:bg-[#303134]" />
            <div className="mt-2 flex gap-2">
              <button onClick={run} disabled={loading || !input.trim()} className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"><Sparkles size={14} className="inline" /> {loading ? "Running…" : "Run tool"}</button>
              <button onClick={() => setInput("")} className="rounded-full border bg-white px-4 py-2 text-sm dark:bg-[#303134]">Clear</button>
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <label className="mb-1 flex items-center justify-between text-xs font-medium"><span>Result</span><span className="text-[11px] font-normal text-[hsl(var(--muted-foreground))]">Streaming</span></label>
            <div className="min-h-[180px] flex-1 overflow-y-auto whitespace-pre-wrap rounded-2xl border bg-white p-3 text-sm leading-6 dark:bg-[#303134]">{output || <span className="text-[hsl(var(--muted-foreground))]">Output will appear here. For important operations you must confirm before applying.</span>}</div>
            {output && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => handleApply("doc")} className="rounded-full bg-[#e8f0fe] px-3 py-1.5 text-xs font-medium text-[#1a73e8]">Create document</button>
                <button onClick={() => handleApply("task")} className="rounded-full bg-[#fef7e0] px-3 py-1.5 text-xs">Create task</button>
                <button onClick={() => handleApply("copy")} className="rounded-full border bg-white px-3 py-1.5 text-xs">Copy</button>
              </div>
            )}
            <div className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">All AI tools go through the same centralized service with prompt registry, size checks, and cancellation support.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
