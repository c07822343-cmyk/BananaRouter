import { NextRequest, NextResponse } from "next/server";
import { getDefaultModel, isApiKeyConfigured } from "@/lib/server/config";
import { makeApiError } from "@/lib/server/openrouter";
import { fetchModelCatalog } from "@/lib/server/openrouterMeta";
import { ModelsResult } from "@/lib/shared/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      makeApiError(
        "missing_api_key",
        "OpenRouter API key is missing.",
        "Add it in Settings or set OPENROUTER_API_KEY in .env.local to refresh models."
      ),
      { status: 401 }
    );
  }

  try {
    const result = await fetchModelCatalog();
    const fallback = getDefaultModel();
    const response: ModelsResult = {
      source: result.source,
      models: result.models,
      fallback,
      message: result.message,
    };
    return NextResponse.json(response);
  } catch (error) {
    const err = error as { code?: string; message?: string; status?: number };
    return NextResponse.json(
      makeApiError(
        "openrouter_error",
        "Could not refresh models from OpenRouter.",
        err.message || "The model catalog is unavailable. The configured model will be used.",
        err.status ?? 502
      ),
      { status: err.status ?? 502 }
    );
  }
}
