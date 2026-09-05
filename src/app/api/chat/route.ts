import { NextRequest, NextResponse } from "next/server";
import { ChatRequestPayload, ApiError } from "@/lib/shared/types";
import {
  makeApiError,
  requestOpenRouter,
  validateModel,
} from "@/lib/server/openrouter";
import { getDefaultRequestTimeoutMs } from "@/lib/server/config";

const MAX_BODY_BYTES = 1_500_000;
const MAX_MESSAGES = 200;
const MAX_CONTENT_LENGTH = 100000;

/**
 * Minimal in-memory rate limiter (per process). This is a practical safeguard
 * for local/self-hosted use; production deployments behind a proxy should add
 * their own IP-based limits.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const buckets = new Map<string, { count: number; resetAt: number }>();

function consumeRateLimit(key: string): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (existing.count >= RATE_MAX) return false;
  existing.count += 1;
  return true;
}

function errorStatus(error: ApiError): number {
  switch (error.code) {
    case "missing_api_key":
      return 401;
    case "invalid_request":
    case "invalid_model":
      return 400;
    case "aborted":
      return 408;
    case "insufficient_credits":
      return 402;
    case "model_unavailable":
      return 404;
    case "rate_limited":
      return 429;
    case "timeout":
      return 504;
    case "network_error":
    case "openrouter_error":
    case "upstream_error":
    case "context_limit":
      return 502;
    default:
      return 500;
  }
}

function streamHeaders(): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  headers.set("X-Accel-Buffering", "no");
  return headers;
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!consumeRateLimit(clientIp)) {
    return NextResponse.json(
      makeApiError(
        "rate_limited",
        "Too many requests. Please slow down.",
        "The local request limit was reached. Wait a moment and try again.",
        429
      ),
      { status: 429 }
    );
  }

  let payload: Partial<ChatRequestPayload>;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        makeApiError(
          "invalid_request",
          "The request is too large.",
          "Reduce the conversation length and try again.",
          400
        ),
        { status: 400 }
      );
    }
    const data = JSON.parse(text);
    if (typeof data === "object" && data !== null) {
      payload = data;
    } else {
      throw new Error("Request body must be a JSON object");
    }
  } catch {
    return NextResponse.json(
      makeApiError(
        "invalid_request",
        "The request body is not valid JSON.",
        "Send a JSON object with a `messages` array."
      ),
      { status: 400 }
    );
  }

  const messages = payload.messages;
  const model = payload.model ?? process.env.OPENROUTER_MODEL ?? "openrouter/free";
  const streaming = payload.streaming === undefined ? true : Boolean(payload.streaming);

  try {
    validateModel(model);
  } catch (error) {
    const err = error as ApiError;
    return NextResponse.json(err, { status: errorStatus(err) });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      makeApiError(
        "invalid_request",
        "Messages must be a non-empty array.",
        "Send `messages` as a JSON array of { role, content } objects."
      ),
      { status: 400 }
    );
  }
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      makeApiError(
        "invalid_request",
        "The conversation is too long.",
        `OpenRouter requests are limited to ${MAX_MESSAGES} messages. Start a new conversation.`,
        400
      ),
      { status: 400 }
    );
  }
  for (const message of messages) {
    if (typeof message?.content !== "string" || message.content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        makeApiError(
          "invalid_request",
          "A message is invalid or too long.",
          "Message content must be a string within the allowed length.",
          400
        ),
        { status: 400 }
      );
    }
  }

  const timeoutMs =
    typeof payload.requestTimeout === "number" && payload.requestTimeout > 0
      ? Math.min(Math.max(payload.requestTimeout, 5000), 300000)
      : getDefaultRequestTimeoutMs();

  try {
    const upstream = await requestOpenRouter({
      messages,
      model,
      systemPrompt: payload.systemPrompt,
      temperature: payload.temperature,
      maxTokens: payload.maxTokens,
      streaming,
      signal: request.signal,
      timeoutMs,
    });

    if (streaming) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: streamHeaders(),
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    const apiError: ApiError =
      error && typeof error === "object" && "code" in (error as object)
        ? (error as ApiError)
        : makeApiError(
            "unknown",
            "An unexpected error occurred.",
            error instanceof Error ? error.message : String(error)
          );
    return NextResponse.json(apiError, { status: errorStatus(apiError) });
  }
}
