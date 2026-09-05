import {
  ChatMessage,
  ChatRole,
  ApiError,
  ApiErrorCode,
} from "@/lib/shared/types";
import { getApiKeySource, getAppName, getReferer, getRuntimeApiKey } from "./config";

export const OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";

const VALID_ROLES: ChatRole[] = ["system", "user", "assistant"];

export interface RequestOpenRouterParams {
  messages: ChatMessage[];
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function makeApiError(
  code: ApiErrorCode,
  message: string,
  detail?: string,
  status?: number
): ApiError {
  return { code, message, detail, status };
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages)) {
    throw makeApiError(
      "invalid_request",
      "Messages must be an array.",
      "Expected a JSON array in the `messages` field."
    );
  }
  if (messages.length === 0) {
    throw makeApiError(
      "invalid_request",
      "At least one message is required.",
      "The `messages` array must contain at least one item."
    );
  }

  return messages.map((message, index) => {
    if (typeof message !== "object" || message === null) {
      throw makeApiError(
        "invalid_request",
        "Message entries must be objects.",
        `Messages[${index}] is not a valid message object.`
      );
    }
    const role = message.role;
    const content = typeof message.content === "string" ? message.content.trim() : "";
    if (!VALID_ROLES.includes(role)) {
      throw makeApiError(
        "invalid_request",
        "Message role is invalid.",
        `Messages[${index}].role must be one of system, user, assistant.`
      );
    }
    if (!content) {
      throw makeApiError(
        "invalid_request",
        "Message content cannot be empty.",
        `Messages[${index}].content must be a non-empty string.`
      );
    }
    return { role, content };
  });
}

export function validateModel(model: unknown): string {
  if (typeof model !== "string" || !model.trim()) {
    throw makeApiError(
      "invalid_model",
      "A model identifier is required.",
      "Select a model in Settings or provide a valid model in the request."
    );
  }
  const trimmed = model.trim();
  if (trimmed.length > 200) {
    throw makeApiError(
      "invalid_model",
      "The selected model identifier is too long.",
      "Model identifiers must be 200 characters or fewer."
    );
  }
  if (!/^[A-Za-z0-9._:/-]+$/.test(trimmed)) {
    throw makeApiError(
      "invalid_model",
      "The selected model identifier contains unsupported characters.",
      `Model \"${trimmed}\" is not a valid OpenRouter model identifier.`
    );
  }
  return trimmed;
}

export function validateAndBuildMessages(
  messages: ChatMessage[],
  systemPrompt?: string
): ChatMessage[] {
  const normalized = normalizeMessages(messages);
  const prompt = systemPrompt?.trim();
  if (prompt) {
    const systemIndex = normalized.findIndex((m) => m.role === "system");
    if (systemIndex !== -1) {
      normalized[systemIndex] = {
        role: "system",
        content: `${prompt}\n\n${normalized[systemIndex].content}`,
      };
    } else {
      normalized.unshift({ role: "system", content: prompt });
    }
  }
  return normalized;
}

function buildRequestBody(params: RequestOpenRouterParams) {
  const messages = validateAndBuildMessages(params.messages, params.systemPrompt);
  const model = validateModel(params.model);

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: Boolean(params.streaming),
  };

  const temperature = clampNumber(
    params.temperature,
    0,
    2,
    process.env.OPENROUTER_TEMPERATURE
      ? Number(process.env.OPENROUTER_TEMPERATURE)
      : 0.7
  );
  body.temperature = temperature;

  if (params.maxTokens !== undefined) {
    body.max_tokens = clampNumber(params.maxTokens, 1, 32768, 4096);
  }

  return { body, messages, model };
}

export async function requestOpenRouter(
  params: RequestOpenRouterParams
): Promise<Response> {
  const apiKey = getRuntimeApiKey();
  if (!apiKey) {
    throw makeApiError(
      "missing_api_key",
      "OpenRouter API key is missing.",
      "Set OPENROUTER_API_KEY in .env.local, or add it in Settings > API Configuration."
    );
  }

  const { body } = buildRequestBody(params);

  const controller = new AbortController();
  const timeoutMs = params.timeoutMs ?? 120000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const signals = [controller.signal];
  if (params.signal) {
    signals.push(params.signal);
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": getReferer(),
        "X-Title": getAppName(),
        "X-OpenRouter-Title": getAppName(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.any(signals),
    });
  } catch (error) {
    if (isAbortError(error)) {
      if (controller.signal.aborted && !params.signal?.aborted) {
        throw makeApiError(
          "timeout",
          "The request to OpenRouter timed out.",
          "OpenRouter did not respond within the configured time limit."
        );
      }
      throw makeApiError(
        "aborted",
        "The request was cancelled.",
        "The request was aborted before OpenRouter responded."
      );
    }
    throw makeApiError(
      "network_error",
      "Unable to connect to OpenRouter.",
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw await parseOpenRouterResponseError(response);
  }

  return response;
}

async function parseOpenRouterResponseError(response: Response): Promise<ApiError> {
  const status = response.status;
  const rawText = await response.text();

  let parsed: {
    error?: { message?: string; code?: string; type?: string };
    message?: string;
  } = {};
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // OpenRouter occasionally returns HTML for gateway errors.
  }

  const upstreamMessage =
    parsed?.error?.message || parsed?.message || rawText || `HTTP ${status}`;
  const detail = rawText.slice(0, 4000);

  if (status === 401 || status === 403) {
    return makeApiError(
      "missing_api_key",
      "OpenRouter rejected the API key.",
      "Please check your OpenRouter API key in Settings or the OPENROUTER_API_KEY environment variable.",
      status
    );
  }
  if (status === 404) {
    return makeApiError(
      "model_unavailable",
      "The selected model is unavailable.",
      `${detail || upstreamMessage}`,
      status
    );
  }
  if (status === 429) {
    return makeApiError(
      "rate_limited",
      "OpenRouter rate limit reached.",
      `${detail || upstreamMessage}\n\nFree models are limited. Wait a moment and try again.`,
      status
    );
  }
  if (status === 402 || status === 400 && /credits|balance|insufficient/i.test(upstreamMessage)) {
    return makeApiError(
      "insufficient_credits",
      "Insufficient OpenRouter credits.",
      `${detail || upstreamMessage}`,
      status
    );
  }
  if (status >= 500) {
    return makeApiError(
      "openrouter_error",
      "OpenRouter returned an error.",
      `${detail || upstreamMessage}`,
      status
    );
  }
  if (/context|too long|maximum.*token/i.test(upstreamMessage)) {
    return makeApiError(
      "openrouter_error",
      "The request exceeded the model's context limit.",
      `${detail || upstreamMessage}`,
      status
    );
  }

  return makeApiError(
    "openrouter_error",
    "The selected model returned an error.",
    `${detail || upstreamMessage}`,
    status
  );
}

export { getApiKeySource };
