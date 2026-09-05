// BananaRouter Tool-Centric Architecture
export type ToolPermission = "READ" | "WRITE" | "DELETE" | "NETWORK" | "SYSTEM";
export type ToolSource = "builtin" | "mcp" | "custom";

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, { type: string; description?: string; enum?: string[]; required?: boolean }>;
  required?: string[];
}

export interface ToolCall {
  id: string;
  name: string; // tool id e.g. filesystem.search
  arguments: Record<string, any>;
}

export interface ToolResult {
  callId: string;
  name: string;
  status: "ok" | "error" | "needs_approval";
  output?: any;
  error?: string;
  durationMs?: number;
}

export interface ToolDefinition {
  id: string; // e.g. filesystem.search
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: ToolInputSchema;
  source: ToolSource;
  group: string; // Files, Search, System etc
  enabled: boolean;
  // handler is server-agnostic: executed in browser sandbox (safe). MCP handlers delegate to server.
  handler?: (args: Record<string, any>, ctx: ToolExecutionCtx) => Promise<any>;
  // whether tool may use OpenRouter tool-calling
  supportsStreaming?: boolean;
}

export interface ToolExecutionCtx {
  workspaceState?: any; // WorkspaceState
  signal?: AbortSignal;
}

export interface ApprovalRequest {
  id: string;
  toolId: string;
  toolName: string;
  permission: ToolPermission;
  arguments: Record<string, any>;
  reason: string; // e.g. "Delete 4 files"
}
