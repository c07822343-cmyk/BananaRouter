export type MCPTransport = "stdio" | "sse" | "http"; // streamable HTTP
export type MCPStatus = "connected" | "connecting" | "disconnected" | "error" | "disabled";

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: MCPTransport;
  // For http/sse: url ; for stdio: command + args (server must run where BananaRouter backend can spawn, otherwise use remote)
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
  status: MCPStatus;
  lastError?: string;
  discoveredAt?: number;
}

export interface MCPToolDef {
  id: string; // e.g. mcp.filesystem.search
  name: string;
  description: string;
  inputSchema: any;
  serverId: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
  serverId: string;
  status: "available" | "loading" | "error";
}

export interface MCPPrompt {
  name: string;
  description?: string;
  serverId: string;
}
