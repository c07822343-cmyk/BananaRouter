import { NextRequest, NextResponse } from "next/server";
import {
  ChatRequestPayload,
  ApiError,
} from "@/lib/shared/types";
import { makeApiError, requestOpenRouter } from "@/lib/server/openrouter";

function errorStatus(error: ApiError): number {
  switch (error.code) {
    case "missing_api_key":
      return 401;
    case "invalid_request":
    case "invalid_model":
    case "aborted":
      return 400;
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
  let payload: Partial<ChatRequestPayload>;
  try {
    const data = await request.json();
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

  try {
    const upstream = await requestOpenRouter({
      messages,
      model,
      systemPrompt: payload.systemPrompt,
      temperature: payload.temperature,
      maxTokens: payload.maxTokens,
      streaming,
      signal: request.signal,
      timeoutMs: 120000,
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
