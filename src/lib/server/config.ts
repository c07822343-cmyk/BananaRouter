import { promises as fs } from "fs";
import path from "path";

const DEFAULT_MODEL = "openrouter/free";
const DEFAULT_APP_NAME = "BananaRouter";
const DEFAULT_APP_DESCRIPTION =
  "BananaRouter — An AI-powered workspace built around OpenRouter.";
const DEFAULT_REFERER = "http://localhost:3000";

interface RuntimeConfig {
  apiKey?: string;
  model?: string;
}

let runtimeConfig: RuntimeConfig = {};

export function getRuntimeApiKey(): string | null {
  const runtime = runtimeConfig.apiKey?.trim();
  if (runtime) return runtime;
  const env = process.env.OPENROUTER_API_KEY?.trim();
  if (env) return env;
  return null;
}

export function getApiKeySource(): "environment" | "runtime" | "none" {
  if (runtimeConfig.apiKey?.trim()) return "runtime";
  if (process.env.OPENROUTER_API_KEY?.trim()) return "environment";
  return "none";
}

export function isApiKeyConfigured(): boolean {
  return getApiKeySource() !== "none";
}

export function getDefaultModel(): string {
  const runtime = runtimeConfig.model?.trim();
  if (runtime) return runtime;
  const env = process.env.OPENROUTER_MODEL?.trim();
  if (env) return env;
  return DEFAULT_MODEL;
}

export function getAppName(): string {
  return process.env.APP_NAME?.trim() || DEFAULT_APP_NAME;
}

export function getAppDescription(): string {
  return process.env.APP_DESCRIPTION?.trim() || DEFAULT_APP_DESCRIPTION;
}

export function getAppVersion(): string {
  return process.env.OSS_APP_VERSION?.trim() || "1.0.0";
}

export function getReferer(): string {
  return (
    process.env.HTTP_REFERER?.trim() ||
    process.env.APP_URL?.trim() ||
    DEFAULT_REFERER
  );
}

export function getDefaultRequestTimeoutMs(): number {
  const parsed = Number(process.env.OPENROUTER_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed >= 5000 ? parsed : 120000;
}

export function getServerStatus() {
  return {
    apiKeyConfigured: isApiKeyConfigured(),
    apiKeySource: getApiKeySource(),
    model: getDefaultModel(),
    appName: getAppName(),
    appDescription: getAppDescription(),
    appVersion: getAppVersion(),
  };
}

function sanitizeEnvValue(value: string): string {
  return value.replace(/\r?\n/g, "").replace(/#/g, "").trim();
}

async function readEnvFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

/**
 * Persists a setting to `.env.local` for development use. The running Next.js
 * server keeps the value in memory (runtimeConfig) so it works immediately.
 */
export async function persistServerSetting(
  key: string,
  value: string
): Promise<void> {
  const safeValue = sanitizeEnvValue(value);
  if (!safeValue) return;

  const filePath = path.join(process.cwd(), ".env.local");
  const existing = await readEnvFile(filePath);
  const lines = existing.split("\n").filter((l) => l.trim() !== "");
  const keyPattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=`);

  const nextLines = lines.filter((line) => !keyPattern.test(line));
  nextLines.push(`${key}=${safeValue}`);

  await fs.writeFile(filePath, nextLines.join("\n") + "\n", "utf8");
}

export async function saveServerConfig(input: {
  apiKey?: string;
  model?: string;
}): Promise<void> {
  if (input.apiKey?.trim()) {
    runtimeConfig.apiKey = input.apiKey.trim();
    await persistServerSetting("OPENROUTER_API_KEY", runtimeConfig.apiKey);
  }

  if (input.model?.trim()) {
    runtimeConfig.model = input.model.trim();
    await persistServerSetting("OPENROUTER_MODEL", runtimeConfig.model);
  }
}
