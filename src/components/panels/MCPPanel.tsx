"use client";

import { useEffect, useState } from "react";
import { MCPServerConfig, MCPTransport } from "@/lib/mcp/types";
import { loadMcpServers, saveMcpServers, addMcpServer, updateMcpServer, removeMcpServer, testMcpConnection } from "@/lib/mcp/manager";
import { Plus, Trash2, Plug, CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { MCPResources } from "./MCPResources";

export function MCPPanel() {
  const [servers, setServers] = useState<MCPServerConfig[]>(() => loadMcpServers());
  const [editing, setEditing] = useState<Partial<MCPServerConfig> | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [tab, setTab] = useState<"servers" | "resources">("servers");

  const refresh = () => setServers(loadMcpServers());
  const handleAdd = () => {
    setEditing({ name: "", transport: "http", url: "https://", enabled: true } as any);
  };
  const handleSave = () => {
    if (!editing?.name) return;
    if ((editing as any).id) {
      updateMcpServer((editing as any).id, editing as any);
    } else {
      addMcpServer({
        name: editing.name!,
        transport: editing.transport as MCPTransport,
        url: editing.url,
        command: editing.command,
        args: editing.args as any,
        enabled: editing.enabled ?? true,
      } as any);
    }
    setEditing(null);
    refresh();
  };

  const handleTest = async (s: MCPServerConfig) => {
    setTesting(s.id);
    const res = await testMcpConnection(s);
    updateMcpServer(s.id, { status: res.ok ? "connected" : "error", lastError: res.error });
    refresh();
    setTesting(null);
  };

  return (
    <div className="flex h-full flex-col bg-[#121214] text-zinc-300">
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-zinc-100">MCP</div>
          <div className="text-[11px] text-zinc-500">Model Context Protocol · tools · resources · prompts</div>
        </div>
        <button onClick={handleAdd} className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-300">
          <Plus size={12} className="inline" /> Add
        </button>
      </div>
      <div className="flex border-b border-white/10 px-2">
        <button onClick={() => setTab("servers")} className={`flex-1 rounded-md px-2 py-1.5 text-xs ${tab === "servers" ? "bg-white/10 text-white" : "text-zinc-500"}`}>Servers</button>
        <button onClick={() => setTab("resources")} className={`flex-1 rounded-md px-2 py-1.5 text-xs ${tab === "resources" ? "bg-white/10 text-white" : "text-zinc-500"}`}>Resources</button>
      </div>
      {tab === "resources" ? (
        <MCPResources />
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {servers.length === 0 && <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-zinc-500">No servers configured. Add an MCP server to expose tools/resources to BananaRouter.</div>}
          {servers.map((s) => (
            <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{s.name}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] border ${s.status === "connected" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : s.status === "error" ? "bg-red-500/15 text-red-400 border-red-500/20" : s.status === "disabled" ? "bg-zinc-800 text-zinc-400 border-white/10" : "bg-white/5 text-zinc-400 border-white/10"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.status === "connected" ? "bg-emerald-400" : s.status === "error" ? "bg-red-400" : "bg-zinc-500"}`} />
                      {s.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {s.transport} {s.url ? `· ${s.url}` : s.command ? `· ${s.command} ${(s.args ?? []).join(" ")}` : ""}
                  </div>
                  {s.lastError && <div className="mt-1 text-xs text-red-400">{s.lastError}</div>}
                  <div className="mt-1 text-[11px] text-zinc-500">{s.enabled ? "Enabled" : "Disabled"} · {s.transport}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => handleTest(s)} disabled={testing === s.id} className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-50">
                    {testing === s.id ? <Loader2 size={12} className="animate-spin inline" /> : <Plug size={12} className="inline" />} Test
                  </button>
                  <button onClick={() => setEditing(s)} className="rounded-full border border-white/10 px-2 py-1 text-xs hover:bg-white/10">Edit</button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${s.name}?`)) {
                        removeMcpServer(s.id);
                        refresh();
                      }
                    }}
                    className="rounded p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={!!s.enabled}
                    onChange={(e) => {
                      updateMcpServer(s.id, { enabled: e.target.checked, status: e.target.checked ? "disconnected" : "disabled" });
                      refresh();
                    }}
                  />
                  Enabled
                </label>
                <span className="text-zinc-600">Transport: {s.transport} · keep credentials server-side</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[480px] rounded-2xl border border-white/10 bg-[#1a1a1e] p-4">
            <div className="text-sm font-medium">MCP Server</div>
            <div className="mt-3 space-y-2">
              <input
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Name (Filesystem, Git, Custom)"
                className="w-full rounded-lg border border-white/10 bg-[#121214] px-3 py-2 text-sm outline-none focus:border-amber-500/40"
              />
              <select
                value={editing.transport}
                onChange={(e) => setEditing({ ...editing, transport: e.target.value as MCPTransport })}
                className="w-full rounded-lg border border-white/10 bg-[#121214] px-3 py-2 text-sm"
              >
                <option value="http">streamable HTTP</option>
                <option value="sse">SSE</option>
                <option value="stdio">stdio (backend)</option>
              </select>
              {(editing.transport === "http" || editing.transport === "sse") && (
                <input
                  value={editing.url ?? ""}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://your-mcp-server/mcp"
                  className="w-full rounded-lg border border-white/10 bg-[#121214] px-3 py-2 text-sm outline-none"
                />
              )}
              {editing.transport === "stdio" && (
                <>
                  <input
                    value={editing.command ?? ""}
                    onChange={(e) => setEditing({ ...editing, command: e.target.value })}
                    placeholder="command (e.g. node)"
                    className="w-full rounded-lg border border-white/10 bg-[#121214] px-3 py-2 text-sm"
                  />
                  <input
                    value={(editing.args as any)?.join(" ") ?? ""}
                    onChange={(e) => setEditing({ ...editing, args: e.target.value.split(" ").filter(Boolean) as any })}
                    placeholder="args"
                    className="w-full rounded-lg border border-white/10 bg-[#121214] px-3 py-2 text-sm"
                  />
                </>
              )}
              <div className="text-[11px] text-zinc-500">Credentials are stored locally; never expose them in prompts. stdio servers run via backend.</div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-full px-3 py-1.5 text-sm hover:bg-white/10">Cancel</button>
              <button onClick={handleSave} className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium text-black">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
