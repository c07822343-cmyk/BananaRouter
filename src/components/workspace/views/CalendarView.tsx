"use client";

import { useState, useMemo } from "react";
import { Calendar as CalIcon, Plus, ChevronLeft, ChevronRight, Trash2, Sparkles } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { executeAI } from "@/lib/ai/service";
import { loadSettings } from "@/lib/client/settings";

type ViewMode = "month" | "week" | "day";

export function CalendarView() {
  const { state, createEvent, updateEvent, deleteEvent, addNotification } = useWorkspace();
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const events = state.calendarEvents.filter((e) => !e.trashed).sort((a, b) => a.start - b.start);

  const monthDays = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const days: Date[] = [];
    const startPad = first.getDay();
    for (let i = 0; i < startPad; i++) days.push(new Date(y, m, 1 - startPad + i));
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d));
    while (days.length % 7 !== 0) days.push(new Date(y, m, last.getDate() + (days.length - (startPad + last.getDate()) + 1)));
    return days;
  }, [cursor]);

  const handleCreate = () => {
    const title = prompt("Event title");
    if (!title) return;
    const start = selectedDate.getTime();
    const end = start + 3600000;
    createEvent({ title, start, end, description: "", location: "" });
  };

  const handleAiPlan = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    const settings = loadSettings();
    try {
      const out = await executeAI({ model: settings.model, toolId: "general", input: `Create a study schedule for: ${aiPrompt}. Return a list like: YYYY-MM-DD HH:MM - Title. Keep it under 8 events.`, signal: new AbortController().signal });
      // Preview: show out, then offer to create 4 events starting tomorrow
      if (confirm(`AI suggested:\n\n${out.slice(0, 600)}\n\nCreate 4 preview events starting tomorrow?`)) {
        const base = Date.now() + 86400000;
        for (let i = 0; i < 4; i++) {
          createEvent({ title: `AI: ${aiPrompt.slice(0, 30)} #${i + 1}`, start: base + i * 86400000 + 9 * 3600000, end: base + i * 86400000 + 10 * 3600000, description: out.slice(0, 200) });
        }
        addNotification({ title: "Calendar preview applied", message: "4 events created. Review and keep what you need.", type: "success" });
      }
    } catch (e: any) {
      addNotification({ title: "AI failed", message: e?.message ?? "plan failed", type: "error" });
    } finally { setAiLoading(false); }
  };

  const dayEvents = (d: Date) => events.filter((e) => {
    const ed = new Date(e.start);
    return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth() && ed.getDate() === d.getDate();
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2.5 dark:bg-[#202124]">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><ChevronLeft size={16} /></button>
        <span className="text-sm font-medium">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><ChevronRight size={16} /></button>
        <button onClick={() => setCursor(new Date())} className="ml-2 rounded-full border px-3 py-1 text-xs">Today</button>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-[#f1f3f4] p-1 dark:bg-[#303134]">
          {(["month", "week", "day"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-xs capitalize ${view === v ? "bg-white shadow dark:bg-[#3c4043]" : ""}`}>{v}</button>
          ))}
        </div>
        <button onClick={handleCreate} className="rounded-full bg-[#b45309] px-4 py-1.5 text-sm font-medium text-white"><Plus size={14} className="inline" /> Create</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#202124]">
          {view === "month" && (
            <div className="grid grid-cols-7 gap-px bg-[hsl(var(--border))]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="bg-[#f8f9fa] py-2 text-center text-xs font-medium dark:bg-[#303134]">{d}</div>
              ))}
              {monthDays.map((d, i) => {
                const isCurMonth = d.getMonth() === cursor.getMonth();
                const isToday = new Date().toDateString() === d.toDateString();
                const evs = dayEvents(d);
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(d)}
                    className={`min-h-[96px] cursor-pointer bg-white p-1 dark:bg-[#202124] ${!isCurMonth ? "opacity-40" : ""} ${selectedDate.toDateString() === d.toDateString() ? "ring-1 ring-[#b45309]" : ""}`}
                  >
                    <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-[#b45309] text-white" : ""}`}>{d.getDate()}</div>
                    <div className="mt-1 space-y-1">
                      {evs.slice(0, 3).map((e) => (
                        <div key={e.id} className="truncate rounded bg-[#FFFBEB] px-1 py-0.5 text-[11px] text-[#b45309] dark:bg-[#2a2210] dark:text-[#fcd34d]">{new Date(e.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {e.title}</div>
                      ))}
                      {evs.length > 3 && <div className="text-[11px] text-[hsl(var(--muted-foreground))]">+{evs.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view !== "month" && (
            <div className="p-4">
              <div className="rounded-2xl border bg-[#f8f9fa] p-4 dark:bg-[#303134]">
                <div className="text-sm font-medium">{view === "week" ? "Week" : "Day"} view • {selectedDate.toLocaleDateString()}</div>
                <div className="mt-3 space-y-2">
                  {dayEvents(selectedDate).length === 0 ? (
                    <div className="py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No events this {view}.</div>
                  ) : (
                    dayEvents(selectedDate).map((e) => (
                      <div key={e.id} className="flex items-center gap-3 rounded-xl border bg-white px-3 py-2 dark:bg-[#202124]">
                        <div className="h-8 w-1 rounded-full" style={{ background: e.color ?? "#b45309" }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{e.title}</div>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(e.start).toLocaleString()} → {new Date(e.end).toLocaleTimeString()}</div>
                        </div>
                        <button onClick={() => { if (confirm("Delete event?")) deleteEvent(e.id); }} className="rounded-full p-1.5 hover:bg-[hsl(var(--muted))]"><Trash2 size={14} /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="hidden w-[340px] shrink-0 flex-col border-l bg-[#f8f9fa] dark:bg-[#202124] lg:flex">
          <div className="border-b bg-white p-4 dark:bg-[#202124]">
            <div className="text-sm font-medium">{selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
            <div className="mt-2 space-y-2">
              {dayEvents(selectedDate).map((e) => (
                <div key={e.id} className="rounded-xl border bg-white p-2 dark:bg-[#303134]">
                  <div className="text-sm font-medium">{e.title}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(e.start).toLocaleTimeString()} • {e.location ?? ""}</div>
                  <input value={e.title} onChange={(ev) => updateEvent(e.id, { title: ev.target.value })} className="mt-1 w-full rounded border px-2 py-1 text-xs" />
                </div>
              ))}
              {dayEvents(selectedDate).length === 0 && <div className="text-xs text-[hsl(var(--muted-foreground))]">No events.</div>}
              <button onClick={handleCreate} className="w-full rounded-full bg-[#b45309] py-1.5 text-xs font-medium text-white">Add event</button>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Sparkles size={14} className="text-[#b45309]" /> AI Planner</div>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Does not auto-create without preview. AI suggests, you confirm.</p>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Create a study schedule for finals" className="mt-2 min-h-[80px] w-full rounded-xl border bg-white p-2 text-sm dark:bg-[#303134]" />
            <button onClick={handleAiPlan} disabled={aiLoading || !aiPrompt.trim()} className="mt-2 w-full rounded-full bg-[#b45309] py-2 text-sm font-medium text-white disabled:opacity-50">{aiLoading ? "Planning…" : "Generate plan (preview)"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
