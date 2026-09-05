"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Check } from "lucide-react";

export interface Activity {
  id: string;
  tool: string;
  status: "running" | "completed" | "error";
  args?: Record<string, any>;
  result?: any;
  durationMs?: number;
}

export function ToolActivity({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {activities.map((a) => (
        <ActivityItem key={a.id} activity={a} />
      ))}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1a1e] px-2.5 py-2 text-xs">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-left">
        {activity.status === "running" ? <Loader2 size={12} className="animate-spin text-amber-400" /> : activity.status === "completed" ? <Check size={12} className="text-emerald-400" /> : <span className="h-2 w-2 rounded-full bg-red-400" />}
        <span className="font-medium text-zinc-300">
          {activity.status === "running" ? `Using ${activity.tool}…` : activity.tool}
        </span>
        <span className="ml-auto text-[11px] text-zinc-500">{activity.status === "running" ? "Running" : activity.status === "completed" ? `Completed${activity.durationMs ? ` · ${activity.durationMs}ms` : ""}` : "Error"}</span>
        {open ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
          {activity.args && (
            <div>
              <div className="text-[11px] font-medium text-zinc-400">Arguments</div>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-black/30 p-2 text-[11px] text-zinc-400">{JSON.stringify(activity.args, null, 2)}</pre>
            </div>
          )}
          {activity.result !== undefined && (
            <div>
              <div className="text-[11px] font-medium text-zinc-400">Result</div>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-black/30 p-2 text-[11px] text-zinc-300">{typeof activity.result === "string" ? activity.result.slice(0, 2000) : JSON.stringify(activity.result, null, 2).slice(0, 2000)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
