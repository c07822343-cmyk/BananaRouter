"use client";

import { useState } from "react";
import { CheckSquare, Plus, Trash2, Star, Calendar, Flag, Sparkles, ListChecks } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { executeAI, tryParseTaskJson } from "@/lib/ai/service";
import { loadSettings } from "@/lib/client/settings";

export function TasksView() {
  const { state, createTask, updateTask, deleteTask, addNotification } = useWorkspace();
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [newTitle, setNewTitle] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const tasks = state.tasks.filter((t) => !t.trashed).sort((a, b) => Number(a.completed) - Number(b.completed) || b.updatedAt - a.updatedAt);
  const filtered = tasks.filter((t) => filter === "all" ? true : filter === "active" ? !t.completed : t.completed);

  const handleBreakdown = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    const settings = loadSettings();
    try {
      const out = await executeAI({ model: settings.model, toolId: "task.breakdown", input: aiInput, signal: new AbortController().signal });
      const parsed = tryParseTaskJson(out);
      if (parsed && parsed.length) {
        for (const p of parsed.slice(0, 10)) createTask(p.title, { description: p.description });
        addNotification({ title: "Tasks created", message: `${parsed.length} tasks created from AI breakdown. Preview: ${parsed[0].title}`, type: "success" });
        setAiInput("");
      } else {
        addNotification({ title: "Could not parse tasks", message: out.slice(0, 200), type: "warning" });
      }
    } catch (e: any) {
      addNotification({ title: "AI failed", message: e?.message ?? "Breakdown failed", type: "error" });
    } finally { setAiLoading(false); }
  };

  return (
    <div className="mx-auto max-w-[900px] p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-medium"><CheckSquare size={20} className="text-[#b45309]" /> Tasks</h1>
        <div className="flex gap-1 rounded-full bg-[#f1f3f4] p-1 dark:bg-[#303134]">
          {(["all", "active", "done"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${filter === f ? "bg-white shadow dark:bg-[#3c4043]" : ""}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 dark:bg-[#303134]">
        <div className="mb-3 flex items-center gap-2">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) { createTask(newTitle.trim()); setNewTitle(""); } }} placeholder="Add a task…" className="flex-1 rounded-full border bg-[#f8f9fa] px-4 py-2 text-sm dark:bg-[#202124]" />
          <button onClick={() => { if (newTitle.trim()) { createTask(newTitle.trim()); setNewTitle(""); } }} className="rounded-full bg-[#b45309] px-4 py-2 text-sm font-medium text-white"><Plus size={14} className="inline" /> Add</button>
        </div>

        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${t.completed ? "bg-[#f8f9fa] opacity-70 dark:bg-[#202124]" : "bg-white dark:bg-[#303134]"}`}>
              <button onClick={() => updateTask(t.id, { completed: !t.completed })} className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${t.completed ? "bg-[#b45309] text-white" : "bg-white"}`}>{t.completed ? "✓" : ""}</button>
              <div className="min-w-0 flex-1">
                <input value={t.title} onChange={(e) => updateTask(t.id, { title: e.target.value })} className={`w-full bg-transparent text-sm font-medium outline-none ${t.completed ? "line-through" : ""}`} />
                <input value={t.description ?? ""} onChange={(e) => updateTask(t.id, { description: e.target.value })} placeholder="Description" className="w-full bg-transparent text-xs text-[hsl(var(--muted-foreground))] outline-none" />
                <div className="mt-1 flex flex-wrap gap-1">
                  <select value={t.priority} onChange={(e) => updateTask(t.id, { priority: e.target.value as any })} className="rounded-full border bg-[#f1f3f4] px-2 py-1 text-xs">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                  <input type="date" value={t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 10) : ""} onChange={(e) => updateTask(t.id, { dueAt: e.target.value ? new Date(e.target.value).getTime() : null })} className="rounded-full border px-2 py-1 text-xs" />
                  {t.dueAt && <span className="rounded-full bg-[#fef7e0] px-2 py-1 text-xs">Due {new Date(t.dueAt).toLocaleDateString()}</span>}
                </div>
                {t.subtasks && t.subtasks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {t.subtasks.map((st) => (
                      <label key={st.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={st.completed} onChange={() => updateTask(t.id, { subtasks: t.subtasks!.map((x) => x.id === st.id ? { ...x, completed: !x.completed } : x) })} /> {st.title}</label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => updateTask(t.id, { starred: !t.starred })} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><Star size={14} className={t.starred ? "fill-[#fbbc04] text-[#fbbc04]" : ""} /></button>
                <button onClick={() => { if (confirm("Delete task?")) deleteTask(t.id); }} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">No tasks in this view.</div>}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-[#f8f9fa] p-4 dark:bg-[#303134]">
        <div className="flex items-center gap-2 text-sm font-medium"><Sparkles size={16} className="text-[#b45309]" /> AI: Break into tasks</div>
        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Describe a goal and the AI will create structured tasks (validated before applying).</p>
        <div className="mt-2 flex gap-2">
          <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="e.g., Launch a Roblox game in 4 weeks" className="flex-1 rounded-full border bg-white px-4 py-2 text-sm dark:bg-[#202124]" />
          <button onClick={handleBreakdown} disabled={aiLoading || !aiInput.trim()} className="rounded-full bg-[#b45309] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{aiLoading ? "Creating…" : "Create plan"}</button>
        </div>
        <div className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">AI returns JSON — we validate it. No bulk creation without confirmation.</div>
      </div>
    </div>
  );
}
