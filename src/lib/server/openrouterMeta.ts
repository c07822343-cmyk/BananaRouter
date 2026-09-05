import { ModelInfo, UsageInfo } from "@/lib/shared/types";
import { getAppName, getReferer, getRuntimeApiKey } from "./config";

export const OPENROUTER_MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";
export const OPENROUTER_KEY_ENDPOINT = "https://openrouter.ai/api/v1/auth/key";

function redactSecrets(value: string): string {
  return value
    .replace(/sk-or-v[0-9a-zA-Z_-]+/gi, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
}

function headers(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": getReferer(),
    "X-Title": getAppName(),
    "X-OpenRouter-Title": getAppName(),
  };
}

function isFreeModel(id: string, pricing: any): boolean {
  const prompt = pricing?.prompt;
  const completion = pricing?.completion;
  const request = pricing?.request;
  const zeroPricing =
    (prompt === undefined || prompt === 0 || prompt === "0") &&
    (completion === undefined || completion === 0 || completion === "0") &&
    (request === undefined || request === 0 || request === "0");
  return /:free$/.test(id) || zeroPricing;
}

export async function fetchModelCatalog(): Promise<{
  models: ModelInfo[];
  source: "openrouter";
  message?: string;
}> {
  const apiKey = getRuntimeApiKey();
  if (!apiKey) {
    throw Object.assign(new Error("OpenRouter API key is missing."), {
      code: "missing_api_key",
      status: 401,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let response: Response;
  try {
    response = await fetch(OPENROUTER_MODELS_ENDPOINT, {
      headers: headers(apiKey),
      signal: controller.signal,
    });
  } catch (error) {
    throw Object.assign(
      new Error(
        (error as Error)?.name === "AbortError"
          ? "OpenRouter model lookup timed out."
          : "Unable to reach OpenRouter."
      ),
      { code: "network_error", status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = redactSecrets((await response.text()).slice(0, 2000));
    throw Object.assign(new Error(text || `HTTP ${response.status}`), {
      code: "openrouter_error",
      status: response.status,
    });
  }

  const data = (await response.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      context_length?: number;
      pricing?: any;
      architecture?: { input_modalities?: string[] };
    }>;
  };

  const models: ModelInfo[] = (data.data ?? []).map((m) => {
    const free = isFreeModel(m.id, m.pricing);
    return {
      id: m.id,
      name: m.name || m.id,
      contextLength: m.context_length,
      free,
      paid: !free,
      pricing: m.pricing,
    };
  });

  models.sort((a, b) => {
    if (a.free !== b.free) return a.free ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { models, source: "openrouter" };
}

export async function fetchUsage(): Promise<UsageInfo> {
  const apiKey = getRuntimeApiKey();
  if (!apiKey) {
    return {
      available: false,
      message:
        "Usage information is unavailable because the OpenRouter API key is not configured.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(OPENROUTER_KEY_ENDPOINT, {
      headers: headers(apiKey),
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        available: false,
        message: `Usage information unavailable (OpenRouter returned HTTP ${response.status}).`,
      };
    }
    const data = (await response.json()) as {
      data?: {
        label?: string;
        usage?: number;
        limit?: number;
        is_free_tier?: boolean;
        rate_limit?: number;
        reset?: string;
        type?: string;
      };
    };
    const info = data.data;
    if (!info || (info.usage === undefined && info.limit === undefined)) {
      return {
        available: false,
        message: "Usage information unavailable.",
      };
    }
    return {
      available: true,
      usage: info.usage,
      limit: info.limit,
      isFreeTier: info.is_free_tier,
      reset: info.reset ?? null,
      message: "",
      raw: {
        type: info.type,
        rateLimit: info.rate_limit,
        label: info.label,
      },
    };
  } catch (error) {
    return {
      available: false,
      message:
        (error as Error)?.name === "AbortError"
          ? "Usage information unavailable (lookup timed out)."
          : "Usage information unavailable (could not reach OpenRouter).",
    };
  }
}
