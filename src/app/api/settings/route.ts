import { NextRequest, NextResponse } from "next/server";
import {
  getServerStatus,
  saveServerConfig,
} from "@/lib/server/config";
import { makeApiError, validateModel } from "@/lib/server/openrouter";
import { SettingsInput, SettingsStatus } from "@/lib/shared/types";

export async function GET() {
  const status: SettingsStatus = getServerStatus();
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  let input: SettingsInput;
  try {
    const data = await request.json();
    if (typeof data !== "object" || data === null) {
      throw new Error("Body must be an object");
    }
    input = data;
  } catch {
    return NextResponse.json(
      makeApiError(
        "invalid_request",
        "The request body is not valid JSON.",
        "Send a JSON object with optional `apiKey` and `model` fields."
      ),
      { status: 400 }
    );
  }

  const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  const model = typeof input.model === "string" ? input.model.trim() : "";

  if (!apiKey && !model) {
    return NextResponse.json(
      makeApiError(
        "invalid_request",
        "Nothing to save.",
        "Provide an API key and/or a model identifier."
      ),
      { status: 400 }
    );
  }

  if (model) {
    try {
      validateModel(model);
    } catch (error) {
      const err = error as { message: string };
      return NextResponse.json(
        makeApiError("invalid_model", err.message || "Invalid model identifier"),
        { status: 400 }
      );
    }
  }

  try {
    await saveServerConfig({ apiKey: apiKey || undefined, model: model || undefined });
  } catch {
    return NextResponse.json(
      makeApiError(
        "unknown",
        "Could not save the server configuration.",
        "Make sure the application has write access to .env.local in development."
      ),
      { status: 500 }
    );
  }

  return NextResponse.json(getServerStatus());
}
