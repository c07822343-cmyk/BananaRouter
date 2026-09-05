export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string | null;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface ChatRequestPayload {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  streaming?: boolean;
}

export interface ChatStreamOptions {
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (error: ApiError) => void;
  signal?: AbortSignal;
}

export type ApiErrorCode =
  | "missing_api_key"
  | "invalid_request"
  | "invalid_model"
  | "rate_limited"
  | "insufficient_credits"
  | "model_unavailable"
  | "timeout"
  | "openrouter_error"
  | "upstream_error"
  | "network_error"
  | "aborted"
  | "unknown";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  detail?: string;
  status?: number;
}

export interface SettingsInput {
  apiKey?: string;
  model?: string;
}

export interface SettingsStatus {
  apiKeyConfigured: boolean;
  apiKeySource: "environment" | "runtime" | "none";
  model: string;
  appName: string;
}

export interface TestConnectionResult {
  ok: boolean;
  model: string;
  selectedModel?: string;
  latencyMs?: number;
  message?: string;
  error?: ApiError;
}
