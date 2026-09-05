import {
  ApiError,
  ChatMessage,
  ChatStreamOptions,
  SettingsInput,
  SettingsStatus,
  TestConnectionResult,
} from "@/lib/shared/types";

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
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as ApiError;
    if (parsed && typeof parsed.message === "string") return parsed;
  } catch {
    // fall through
  }
  return {
    code: "unknown",
    message: `Server error (HTTP ${response.status}).`,
    detail: text.slice(0, 2000),
    status: response.status,
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

export async function streamChat(
  messages: ChatMessage[],
  requestOptions: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    streaming: boolean;
  },
  handlers: ChatStreamOptions
): Promise<string> {
  const { onDelta, onDone, onError, signal } = handlers;

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
      }),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      onError({
        code: "aborted",
        message: "Generation stopped.",
      });
      return "";
    }
    onError({
      code: "network_error",
      message: "Unable to connect to the application backend.",
      detail: error instanceof Error ? error.message : String(error),
    });
    return "";
  }

  if (!response.ok) {
    const apiError = await parseApiError(response);
    onError(apiError);
    return "";
  }

  if (!requestOptions.streaming) {
    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = await response.json();
    } catch {
      onError({
        code: "openrouter_error",
        message: "The model returned a malformed response.",
        detail: "The server response could not be parsed as JSON.",
      });
      return "";
    }
    const content = data.choices?.[0]?.message?.content ?? "";
    onDelta(content);
    onDone();
    return content;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError({
      code: "openrouter_error",
      message: "Streaming is not supported by this browser.",
    });
    return "";
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

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
        if (data === "[DONE]") continue;

        const parsed = parseSseLine(data);
        if (!parsed) continue;

        if (parsed.error) {
          const errorDetail = parsed.error;
          onError({
            code: "openrouter_error",
            message:
              typeof errorDetail === "string"
                ? errorDetail
                : "The model returned an error.",
            detail: typeof errorDetail === "string" ? errorDetail : JSON.stringify(errorDetail),
          });
          return fullContent;
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
      onError({ code: "aborted", message: "Generation stopped." });
      return fullContent;
    }
    onError({
      code: "network_error",
      message: "The stream was interrupted.",
      detail: error instanceof Error ? error.message : String(error),
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
