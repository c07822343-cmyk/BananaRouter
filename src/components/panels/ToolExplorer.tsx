"use client";

import { getToolRegistry, searchTools, setToolEnabled, requiresApproval } from "@/lib/tools/registry";
import { ToolDefinition } from "@/lib/tools/types";
import { Search, Shield, Boxes } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

export function ToolExplorer() {
  const [query, setQuery] = useState("");
  const [tools, setTools] = useState<ToolDefinition[]>(() => getToolRegistry());

  useEffect(() => {
    setTools(getToolRegistry());
  }, [query]);

  const filtered = useMemo(() => (query.trim() ? searchTools(query) : getToolRegistry()), [query]);

  const byGroup = useMemo(() => {
    const m: Record<string, ToolDefinition[]> = {};
    for (const t of filtered) {
      if (!m[t.group]) m[t.group] = [];
      m[t.group].push(t);
    }
    return m;
  }, [filtered]);

  return (
    <div className="flex h-full flex-col bg-[#121214] text-zinc-300">
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1e] py-1.5 pl-7 pr-2 text-xs placeholder:text-zinc-500 focus:border-amber-500/40 focus:outline-none"
          />
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
          <Boxes size={12} /> {filtered.length} tools · model can discover via tool_search
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(byGroup).map(([group, list]) => (
          <div key={group} className="mb-4">
            <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-widest text-zinc-500">{group}</div>
            <div className="space-y-1.5">
              {list.map((t) => (
                <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-100">{t.name}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] leading-none text-zinc-400">{t.id}</span>
                        {requiresApproval(t.permission) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                            <Shield size={8} /> {t.permission}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-zinc-400">{t.description}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">{t.source}</span>
                        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">{t.permission}</span>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={t.enabled}
                        onChange={(e) => {
                          setToolEnabled(t.id, e.target.checked);
                          setTools([...getToolRegistry()]);
                        }}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-white/10 peer-checked:bg-amber-400 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-2 text-[11px] text-zinc-500">Policy: MODEL proposes → BANANAROUTER checks permissions → TOOLS execute.</div>
    </div>
  );
}
