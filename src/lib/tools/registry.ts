"use client";

import { ToolDefinition, ToolPermission } from "./types";

// Centralized tool registry — BananaRouter policy & execution layer
// MODEL proposes, BANANAROUTER decides, TOOLS execute.

let registry: Record<string, ToolDefinition> = {};

function define(t: ToolDefinition) {
  registry[t.id] = t;
}

// Built-in tools — genuinely useful, no fakes
define({
  id: "files.list",
  name: "List files",
  description: "List files and folders. Supports browsing by folder.",
  permission: "READ",
  source: "builtin",
  group: "Files",
  enabled: true,
  inputSchema: { type: "object", properties: { folderId: { type: "string", description: "Folder id or null for root" }, query: { type: "string" } } },
});
define({
  id: "files.read",
  name: "Read file",
  description: "Read text content of a file by id.",
  permission: "READ",
  source: "builtin",
  group: "Files",
  enabled: true,
  inputSchema: { type: "object", properties: { fileId: { type: "string" } }, required: ["fileId"] },
});
define({
  id: "files.search",
  name: "Search files",
  description: "Fuzzy search across file names and content.",
  permission: "READ",
  source: "builtin",
  group: "Files",
  enabled: true,
  inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
});
define({
  id: "files.create",
  name: "Create file",
  description: "Create a new text file.",
  permission: "WRITE",
  source: "builtin",
  group: "Files",
  enabled: true,
  inputSchema: {
    type: "object",
    properties: { name: { type: "string" }, content: { type: "string" }, folderId: { type: "string" } },
    required: ["name"],
  },
});
define({
  id: "workspace.search",
  name: "Search workspace",
  description: "Search across sessions, files, notes, tasks, etc.",
  permission: "READ",
  source: "builtin",
  group: "Search",
  enabled: true,
  inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
});
define({
  id: "workspace.context",
  name: "Get context",
  description: "Get selected session/files/context window info.",
  permission: "READ",
  source: "builtin",
  group: "Context",
  enabled: true,
  inputSchema: { type: "object", properties: {} },
});

define({
  id: "time.now",
  name: "Current time",
  description: "Get current date/time in ISO format.",
  permission: "READ",
  source: "builtin",
  group: "System",
  enabled: true,
  inputSchema: { type: "object", properties: {} },
});
define({
  id: "calc.evaluate",
  name: "Calculate",
  description: "Evaluate a math expression safely.",
  permission: "READ",
  source: "builtin",
  group: "System",
  enabled: true,
  inputSchema: { type: "object", properties: { expression: { type: "string" } }, required: ["expression"] },
});
define({
  id: "json.format",
  name: "Format JSON",
  description: "Pretty-print or validate JSON.",
  permission: "READ",
  source: "builtin",
  group: "Text",
  enabled: true,
  inputSchema: { type: "object", properties: { json: { type: "string" } }, required: ["json"] },
});

export function getToolRegistry(): ToolDefinition[] {
  return Object.values(registry);
}

export function getTool(id: string): ToolDefinition | undefined {
  return registry[id];
}

export function setToolEnabled(id: string, enabled: boolean) {
  if (registry[id]) registry[id] = { ...registry[id], enabled };
  persistToolState();
}

export function registerMcpTool(tool: ToolDefinition) {
  registry[tool.id] = tool;
}

export function disableMcpToolsForServer(serverId: string) {
  for (const k of Object.keys(registry)) {
    if (registry[k].source === "mcp" && k.startsWith(`mcp.${serverId}.`)) delete registry[k];
  }
}

export function searchTools(query: string): ToolDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return getToolRegistry().slice(0, 20);
  return getToolRegistry()
    .filter((t) => `${t.id} ${t.name} ${t.description}`.toLowerCase().includes(q))
    .slice(0, 30);
}

const LS_KEY = "bananarouter:tool-enabled";
function persistToolState() {
  try {
    const map: Record<string, boolean> = {};
    for (const t of Object.values(registry)) map[t.id] = t.enabled;
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {}
}
export function loadToolState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, boolean>;
    for (const [id, enabled] of Object.entries(map)) if (registry[id]) registry[id].enabled = enabled;
  } catch {}
}

// dangerous permissions require approval
export function requiresApproval(permission: ToolPermission): boolean {
  return permission === "WRITE" || permission === "DELETE" || permission === "NETWORK" || permission === "SYSTEM";
}

// OpenRouter tool calling helpers — convert registry to OpenAI-style tools array
export function toOpenRouterTools(): any[] | undefined {
  const enabled = getToolRegistry().filter((t) => t.enabled);
  if (enabled.length === 0) return undefined;
  // limit context size: only send first 12 tools if too many — AI can search for more via tool_search
  const toSend = enabled.slice(0, 12);
  return toSend.map((t) => ({
    type: "function",
    function: {
      name: t.id,
      description: t.description,
      parameters: t.inputSchema as any,
    },
  }));
}
