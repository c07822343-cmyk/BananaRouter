"use client";

import { AIToolId, AIContext } from "@/lib/workspace/types";
import { getPrompt, truncateContext, MAX_OUTPUT_TOKENS } from "./prompts";
import { streamChat } from "@/lib/client/api";

export interface AIServiceOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIExecuteParams {
  toolId: AIToolId;
  input: string;
  context?: AIContext;
  contextText?: string; // already prepared minimal context
  extraSystem?: string;
  sourceLabel?: string; // for citations
}

/**
 * Centralized AI execution. All features go through this.
 * - Builds prompt from central registry
 * - Applies context size safeguards
 * - Streams via OpenRouter backend
 * - Returns text
 */
export async function executeAI(
  params: AIServiceOptions & AIExecuteParams & { onDelta?: (t: string) => void; onDone?: () => void; onError?: (e: any) => void }
): Promise<string> {
  const def = getPrompt(params.toolId);
  const ctxText = params.contextText ?? buildContextText(params.context);
  const { text: safeCtx } = truncateContext(ctxText ?? "");
  const userPrompt = def.userTemplate(params.input, safeCtx || undefined);
  const { text: safeInput } = truncateContext(userPrompt, 15000);

  const system = params.extraSystem ? `${def.system}\n\n${params.extraSystem}` : def.system;

  let full = "";
  await new Promise<void>((resolve, reject) => {
    streamChat(
      [{ role: "user", content: safeInput }],
      {
        model: params.model,
        temperature: params.temperature ?? 0.7,
        maxTokens: params.maxTokens ?? MAX_OUTPUT_TOKENS,
        systemPrompt: system,
        streaming: true,
        requestTimeout: 120,
      },
      {
        onDelta: (d) => {
          full += d;
          params.onDelta?.(d);
        },
        onDone: () => {
          params.onDone?.();
          resolve();
        },
        onError: (e) => {
          params.onError?.(e);
          reject(e);
        },
        signal: params.signal,
      }
    );
  }).catch((e) => {
    throw e;
  });

  return full;
}

export function buildContextText(ctx?: AIContext): string | undefined {
  if (!ctx) return undefined;
  const parts: string[] = [];
  if (ctx.selectedDocument) {
    parts.push(`Document: ${ctx.selectedDocument.title}\n${ctx.selectedDocument.content.slice(0, 8000)}`);
  }
  if (ctx.selectedFiles && ctx.selectedFiles.length) {
    for (const f of ctx.selectedFiles.slice(0, 4)) {
      const txt = f.textContent?.slice(0, 4000) ?? `(no extractable text, type: ${f.mime})`;
      parts.push(`File: ${f.name}\n${txt}`);
    }
  }
  if (ctx.selectedNote) {
    parts.push(`Note: ${ctx.selectedNote.title}\n${ctx.selectedNote.content.slice(0, 4000)}`);
  }
  if (ctx.selectedSpreadsheet) {
    const sheet = ctx.selectedSpreadsheet.sheets.find((s) => s.id === ctx.selectedSheetId) ?? ctx.selectedSpreadsheet.sheets[0];
    if (sheet) {
      const cells = Object.entries(sheet.cells).slice(0, 50).map(([k, v]) => `${k}=${v.value}`).join(", ");
      parts.push(`Spreadsheet: ${ctx.selectedSpreadsheet.title} / ${sheet.title}\nCells: ${cells}`);
    }
  }
  if (ctx.selectedTasks && ctx.selectedTasks.length) {
    parts.push(`Tasks:\n${ctx.selectedTasks.map((t) => `- ${t.title}${t.description ? `: ${t.description}` : ""}`).join("\n")}`);
  }
  if (ctx.selectedEvents && ctx.selectedEvents.length) {
    parts.push(`Calendar:\n${ctx.selectedEvents.map((e) => `- ${e.title}: ${new Date(e.start).toLocaleString()} -> ${new Date(e.end).toLocaleString()}`).join("\n")}`);
  }
  if (ctx.selectedMessages && ctx.selectedMessages.length) {
    parts.push(`Chat context:\n${ctx.selectedMessages.map((m) => `${m.role}: ${m.content.slice(0, 500)}`).join("\n")}`);
  }
  if (parts.length === 0) return undefined;
  return parts.join("\n\n---\n\n");
}

// Structured output helper
export function tryParseTaskJson(text: string): { title: string; description?: string }[] | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fence ? fence[1] : text;
  try {
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed) && parsed.every((x) => x && typeof x.title === "string")) return parsed;
  } catch {}
  // fallback: lines
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 20);
  if (lines.length) return lines.map((l) => ({ title: l.replace(/^[-*]\s*/, "").slice(0, 80) }));
  return null;
}
