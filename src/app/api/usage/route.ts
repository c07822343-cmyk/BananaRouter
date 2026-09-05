import { NextRequest } from "next/server";
import { isApiKeyConfigured } from "@/lib/server/config";
import { fetchUsage } from "@/lib/server/openrouterMeta";

export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  if (!isApiKeyConfigured()) {
    return Response.json({
      available: false,
      message:
        "Usage information is unavailable because the OpenRouter API key is not configured.",
    });
  }

  const usage = await fetchUsage();
  return Response.json(usage);
}
