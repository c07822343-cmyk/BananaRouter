import {
  ApiError,
  ApiErrorCode,
  ApiErrorCategory,
  ChatMessage,
  ChatStreamOptions,
  ModelsResult,
  SettingsInput,
  SettingsStatus,
  TestConnectionResult,
  UsageInfo,
} from "@/lib/shared/types";

export interface ChatRequestOptions {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  streaming: boolean;
  requestTimeout?: number;
  debug?: boolean;
}

function errorCategoryForCode(code: ApiErrorCode): ApiErrorCategory {
  switch (code) {
    case "missing_api_key":
      return "configuration";
    case "invalid_request":
    case "invalid_model":
      return "configuration";
    case "rate_limited":
      return "rate_limit";
    case "insufficient_credits":
      return "authentication";
    case "model_unavailable":
      return "model";
    case "context_limit":
      return "context_limit";
    case "timeout":
    case "network_error":
    case "upstream_error":
      return "network";
    case "aborted":
      return "server";
    case "openrouter_error":
      return "server";
    default:
      return "unknown";
  }
}

function redactSecrets(value: string): string {
  return value
    .replace(/sk-or-v[0-9a-zA-Z_-]+/gi, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}).`
    );
  }
}

async function parseApiError(response: Response): Promise<ApiError> {
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as ApiError;
    if (parsed && typeof parsed.message === "string") {
      return {
        ...parsed,
        category: parsed.category ?? errorCategoryForCode(parsed.code ?? "unknown"),
        detail: parsed.detail ? redactSecrets(parsed.detail) : undefined,
      };
    }
  } catch {
    // fall through
  }
  return {
    code: "unknown",
    message: `Server error (HTTP ${response.status}).`,
    detail: redactSecrets(text.slice(0, 2000)),
    status: response.status,
    category: "unknown",
  };
}

export async function getSettingsStatus(): Promise<SettingsStatus> {
  const response = await fetch("/api/settings");
  if (!response.ok) throw await parseApiError(response);
  return parseJson<SettingsStatus>(response);
}

export async function saveSettingsToServer(input: SettingsInput): Promise<SettingsStatus> {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseApiError(response);
  return parseJson<SettingsStatus>(response);
}

export async function testConnection(model: string): Promise<TestConnectionResult> {
  const response = await fetch("/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) {
        return {
          ok: false,
          model,
          message: parsed.message,
          error: parsed as ApiError,
        };
      }
    } catch {
      // fall through
    }
    return {
      ok: false,
      model,
      message: `Connection test failed (HTTP ${response.status}).`,
    };
  }
  return parseJson<TestConnectionResult>(response);
}

export async function fetchModels(): Promise<ModelsResult> {
  const response = await fetch("/api/models");
  if (!response.ok) throw await parseApiError(response);
  return parseJson<ModelsResult>(response);
}

export async function fetchUsage(): Promise<UsageInfo> {
  const response = await fetch("/api/usage");
  if (!response.ok) {
    return { available: false, message: "Usage information unavailable." };
  }
  return parseJson<UsageInfo>(response);
}

export async function enhancePrompt(
  prompt: string,
  model: string
): Promise<string> {
  const systemPrompt =
    "You are a prompt-improvement assistant. Rewrite the user's request into a clearer, more specific, well-structured prompt. Respond with only the rewritten prompt in plain text. Do not add extra commentary, quotes, or labels.";
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model,
      temperature: 0.4,
      maxTokens: 600,
      systemPrompt,
      streaming: false,
      requestTimeout: 60,
    }),
  });

  if (!response.ok) {
    const error = await parseApiError(response);
    throw error;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw {
      code: "openrouter_error" as ApiErrorCode,
      message: "The model returned an empty enhanced prompt.",
      category: "server" as ApiErrorCategory,
    } as ApiError;
  }
  return content;
}

export async function streamChat(
  messages: ChatMessage[],
  requestOptions: ChatRequestOptions,
  handlers: ChatStreamOptions
): Promise<string> {
  const { onDelta, onDone, onError, onUsage, signal } = handlers;

  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model: requestOptions.model,
        temperature: requestOptions.temperature,
        maxTokens: requestOptions.maxTokens,
        systemPrompt: requestOptions.systemPrompt,
        streaming: requestOptions.streaming,
        requestTimeout: requestOptions.requestTimeout,
        debug: requestOptions.debug,
      }),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      onError({
        code: "aborted",
        message: "Generation stopped.",
        category: "server",
      });
      return "";
    }
    onError({
      code: "network_error",
      message: "Unable to connect to the application backend.",
      detail: redactSecrets(error instanceof Error ? error.message : String(error)),
      category: "network",
    });
    return "";
  }

  if (!response.ok) {
    const apiError = await parseApiError(response);
    onError(apiError);
    return "";
  }

  if (!requestOptions.streaming) {
    let data: {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: unknown;
    };
    try {
      data = await response.json();
    } catch {
      onError({
        code: "openrouter_error",
        message: "The model returned a malformed response.",
        detail: "The server response could not be parsed as JSON.",
        category: "server",
      });
      return "";
    }
    const content = data.choices?.[0]?.message?.content ?? "";
    if (data.usage) onUsage?.(data.usage);
    onDelta(content);
    onDone();
    return content;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError({
      code: "openrouter_error",
      message: "Streaming is not supported by this browser.",
      category: "server",
    });
    return "";
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let sawDone = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          sawDone = true;
          continue;
        }

        const parsed = parseSseLine(data);
        if (!parsed) continue;

        if (parsed.error) {
          const errorDetail = parsed.error;
          onError({
            code: "openrouter_error",
            message:
              typeof errorDetail === "string"
                ? redactSecrets(errorDetail)
                : "The model returned an error.",
            detail:
              typeof errorDetail === "string"
                ? redactSecrets(errorDetail)
                : redactSecrets(JSON.stringify(errorDetail)),
            category: "server",
          });
          return fullContent;
        }

        if (parsed.usage) {
          onUsage?.(parsed.usage);
        }

        const delta = extractDelta(parsed);
        if (delta) {
          fullContent += delta;
          onDelta(delta);
        }
      }
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      onError({ code: "aborted", message: "Generation stopped.", category: "server" });
      return fullContent;
    }
    onError({
      code: "network_error",
      message: "The stream was interrupted.",
      detail: redactSecrets(error instanceof Error ? error.message : String(error)),
      category: "network",
    });
    return fullContent;
  }

  onDone();
  return fullContent;
}

function parseSseLine(data: string): any {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function extractDelta(data: any): string {
  if (data?.choices?.[0]?.delta?.content && typeof data.choices[0].delta.content === "string") {
    return data.choices[0].delta.content;
  }
  if (data?.choices?.[0]?.message?.content && typeof data.choices[0].message.content === "string") {
    return data.choices[0].message.content;
  }
  return "";
}
