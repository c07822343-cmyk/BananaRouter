export type ChatRole = "system" | "user" | "assistant";

export type MessageFeedback = "up" | "down" | null;

export interface ChatMessage {
  /** Client-generated id for local editing/actions. Stripped before OpenRouter. */
  id?: string;
  role: ChatRole;
  content: string;
  feedback?: MessageFeedback;
  interrupted?: boolean;
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
  requestTimeout?: number;
  debug?: boolean;
}

export interface ChatStreamOptions {
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (error: ApiError) => void;
  onUsage?: (usage: unknown) => void;
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
  | "context_limit"
  | "unknown";

export type ApiErrorCategory =
  | "configuration"
  | "network"
  | "authentication"
  | "rate_limit"
  | "model"
  | "context_limit"
  | "server"
  | "unknown";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  detail?: string;
  status?: number;
  category?: ApiErrorCategory;
  retryable?: boolean;
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
  appDescription: string;
  appVersion: string;
}

export interface TestConnectionResult {
  ok: boolean;
  model: string;
  selectedModel?: string;
  latencyMs?: number;
  message?: string;
  error?: ApiError;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextLength?: number;
  free: boolean;
  paid: boolean;
  provider?: string;
  pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
  };
}

export interface ModelsResult {
  source: "openrouter" | "config";
  models: ModelInfo[];
  fallback: string;
  message?: string;
}

export interface UsageInfo {
  available: boolean;
  limit?: number;
  usage?: number;
  reset?: string | null;
  isFreeTier?: boolean;
  message: string;
  raw?: unknown;
}

export interface AppDebugInfo {
  enabled: boolean;
  model: string;
  durationMs?: number;
  status?: number;
  streaming?: boolean;
  errorCode?: ApiErrorCode;
  errorCategory?: ApiErrorCategory;
  partial?: boolean;
  tokenUsage?: string;
}
