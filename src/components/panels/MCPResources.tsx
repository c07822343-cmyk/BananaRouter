"use client";

import { useEffect, useState } from "react";
import { loadMcpServers } from "@/lib/mcp/manager";
import { MCPResource } from "@/lib/mcp/types";
import { Search, FileText } from "lucide-react";

export function MCPResources() {
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const servers = loadMcpServers().filter((s) => s.status === "connected");
    // mock resources — in real backend these would come from MCP list_resources
    const mock: MCPResource[] = servers.flatMap((s) => [
      { uri: `mcp://${s.id}/resource/docs`, name: "Docs", mimeType: "text/markdown", serverId: s.id, status: "available" },
      { uri: `mcp://${s.id}/resource/data`, name: "Data", mimeType: "application/json", serverId: s.id, status: "available" },
    ]);
    setResources(mock);
  }, []);
  const filtered = resources.filter((r) => `${r.name} ${r.uri}`.toLowerCase().includes(query.toLowerCase()));
  if (resources.length === 0) return <div className="p-6 text-center text-xs text-zinc-500">No MCP resources. Connect a server to discover resources.</div>;
  return (
    <div className="flex h-full flex-col bg-[#121214] text-zinc-300">
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resources…" className="w-full rounded-lg border border-white/10 bg-[#1a1a1e] py-1.5 pl-7 pr-2 text-xs" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map((r) => (
          <div key={r.uri} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 hover:bg-white/5">
            <FileText size={14} className="text-zinc-500" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{r.name}</div>
              <div className="truncate text-[11px] text-zinc-500">{r.uri} · {r.serverId}</div>
            </div>
            <button className="rounded-full border border-white/10 px-2 py-1 text-xs hover:bg-white/10">Open</button>
          </div>
        ))}
      </div>
      <div className="p-2 text-[11px] text-zinc-500">Only selected resources are sent as context. Not auto-injected.</div>
    </div>
  );
}
