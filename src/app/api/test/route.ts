import { NextRequest, NextResponse } from "next/server";
import { getDefaultModel, isApiKeyConfigured } from "@/lib/server/config";
import {
  makeApiError,
  requestOpenRouter,
  validateModel,
} from "@/lib/server/openrouter";
import { ApiError, TestConnectionResult } from "@/lib/shared/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let model: string;
  try {
    const data = await request.json();
    const requested = data?.model;
    model = requested ? validateModel(requested) : getDefaultModel();
  } catch (error) {
    const err = error as { message?: string };
    return NextResponse.json(
      makeApiError("invalid_model", err?.message || "Invalid model", String(error)),
      { status: 400 }
    );
  }

  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      makeApiError(
        "missing_api_key",
        "OpenRouter API key is missing.",
        "Add it in Settings or set OPENROUTER_API_KEY in .env.local."
      ),
      { status: 401 }
    );
  }

  const startedAt = Date.now();
  try {
    const upstream = await requestOpenRouter({
      messages: [{ role: "user", content: "Reply with exactly one word: ping" }],
      model,
      systemPrompt: undefined,
      temperature: 0,
      maxTokens: 16,
      streaming: false,
      signal: request.signal,
      timeoutMs: 45000,
    });

    let selectedModel = model;
    let ok = upstream.ok;
    let message = "Connection successful.";

    if (upstream.ok) {
      try {
        const data = (await upstream.json()) as { model?: string };
        if (data.model) selectedModel = data.model;
      } catch {
        // Ignore malformed bodies; the status was still 2xx.
      }
    } else {
      message = `OpenRouter returned HTTP ${upstream.status}.`;
    }

    const result: TestConnectionResult = {
      ok,
      model,
      selectedModel,
      latencyMs: Date.now() - startedAt,
      message,
    };
    return NextResponse.json(result, { status: ok ? 200 : 502 });
  } catch (error) {
    const err = error as ApiError;
    const apiError: ApiError =
      error && typeof error === "object" && "code" in (error as object)
        ? err
        : makeApiError("unknown", "Could not reach OpenRouter.", String(error));

    const result: TestConnectionResult = {
      ok: false,
      model,
      error: apiError,
      message: apiError.message,
    };
    return NextResponse.json(result, { status: apiError.status ?? 502 });
  }
}
