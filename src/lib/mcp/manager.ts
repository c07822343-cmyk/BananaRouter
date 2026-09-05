"use client";

import { MCPServerConfig } from "./types";
import { registerMcpTool, disableMcpToolsForServer } from "@/lib/tools/registry";

const LS_KEY = "bananarouter:mcp-servers";

export function loadMcpServers(): MCPServerConfig[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

export function saveMcpServers(servers: MCPServerConfig[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(servers));
  } catch {}
}

// Mock discovery — in a real backend, this would hit BananaRouter backend which speaks MCP.
// For the private desktop, we simulate discovery locally and expose actual tool registration.
export async function testMcpConnection(server: MCPServerConfig): Promise<{ ok: boolean; error?: string; tools?: string[] }> {
  // Never echo secrets.
  // Simulate HTTP probe if url present, otherwise stdio is not probeable from browser — mark as error with guidance.
  if (server.transport === "stdio") {
    return { ok: false, error: "stdio requires backend process. Configure via BananaRouter backend or use HTTP/SSE transport." };
  }
  if (server.transport === "sse" || server.transport === "http") {
    if (!server.url) return { ok: false, error: "Missing URL" };
    try {
      const res = await fetch(server.url, { method: "GET", headers: { Accept: "application/json" } });
      // Expect any JSON; we treat any 2xx as connected
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json().catch(() => ({}));
      const tools = Array.isArray((data as any).tools) ? (data as any).tools.map((t: any) => t.name) : ["remote.tool"];
      // register discovered tools (ephemeral)
      for (const name of tools.slice(0, 20)) {
        registerMcpTool({
          id: `mcp.${server.id}.${name}`,
          name: `${name}`,
          description: `MCP ${server.name}: ${name}`,
          permission: "READ",
          inputSchema: { type: "object", properties: {} },
          source: "mcp",
          group: `MCP:${server.name}`,
          enabled: true,
        });
      }
      return { ok: true, tools };
    } catch (e: any) {
      return { ok: false, error: e?.message || "fetch failed" };
    }
  }
  return { ok: false, error: "unknown transport" };
}

export function addMcpServer(partial: Omit<MCPServerConfig, "id" | "status">): MCPServerConfig {
  const id = `mcp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const s: MCPServerConfig = { id, status: "disconnected", ...partial };
  const all = loadMcpServers();
  all.push(s);
  saveMcpServers(all);
  return s;
}

export function updateMcpServer(id: string, patch: Partial<MCPServerConfig>) {
  const all = loadMcpServers();
  const idx = all.findIndex((s) => s.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...patch };
    saveMcpServers(all);
    if (patch.enabled === false) disableMcpToolsForServer(id);
  }
}

export function removeMcpServer(id: string) {
  const all = loadMcpServers().filter((s) => s.id !== id);
  saveMcpServers(all);
  disableMcpToolsForServer(id);
}
