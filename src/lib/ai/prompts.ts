import { AIToolId } from "@/lib/workspace/types";

export interface PromptDef {
  id: AIToolId;
  system: string;
  userTemplate: (input: string, context?: string) => string;
  permission: "READ" | "SUGGEST" | "MODIFY" | "CREATE" | "DELETE";
  output: "text" | "structured";
}

export const PROMPTS: Record<AIToolId, PromptDef> = {
  chat: {
    id: "chat",
    system: "You are a helpful AI workspace assistant. Answer clearly and concisely.",
    userTemplate: (input) => input,
    permission: "READ",
    output: "text",
  },
  "document.summarize": {
    id: "document.summarize",
    system: "You are a document summarizer. Produce a concise, well-structured summary. Use bullet points when helpful. Do not invent facts.",
    userTemplate: (input, ctx) => `Summarize this document:\n\n${ctx ? `Context: ${ctx}\n\n` : ""}${input}`,
    permission: "READ",
    output: "text",
  },
  "document.rewrite": {
    id: "document.rewrite",
    system: "You are a writing assistant. Rewrite the provided text to be clearer and more polished while preserving meaning. Return only the rewritten text.",
    userTemplate: (input, ctx) => `Rewrite:\n\n${input}${ctx ? `\n\nInstructions: ${ctx}` : ""}`,
    permission: "SUGGEST",
    output: "text",
  },
  "document.expand": {
    id: "document.expand",
    system: "You are a writing assistant. Expand the text with helpful detail without inventing false claims. Keep tone consistent.",
    userTemplate: (input) => `Expand this text with more detail:\n\n${input}`,
    permission: "SUGGEST",
    output: "text",
  },
  "document.shorten": {
    id: "document.shorten",
    system: "You are an editor. Shorten the text while keeping key information.",
    userTemplate: (input) => `Shorten this:\n\n${input}`,
    permission: "SUGGEST",
    output: "text",
  },
  "document.grammar": {
    id: "document.grammar",
    system: "Fix grammar, spelling, and punctuation. Preserve meaning. Return only the corrected text.",
    userTemplate: (input) => `Fix grammar:\n\n${input}`,
    permission: "SUGGEST",
    output: "text",
  },
  "document.tone": {
    id: "document.tone",
    system: "Rewrite the text in the requested tone. Preserve facts.",
    userTemplate: (input, ctx) => `Rewrite in a ${ctx || "professional"} tone:\n\n${input}`,
    permission: "SUGGEST",
    output: "text",
  },
  "document.continue": {
    id: "document.continue",
    system: "Continue writing the document in a natural, helpful way. Keep style consistent. Do not repeat the prompt.",
    userTemplate: (input) => `Continue writing:\n\n${input}`,
    permission: "SUGGEST",
    output: "text",
  },
  "document.outline": {
    id: "document.outline",
    system: "Create a clear outline for the document. Use markdown headings and bullets.",
    userTemplate: (input) => `Create an outline for:\n\n${input}`,
    permission: "READ",
    output: "text",
  },
  "document.title": {
    id: "document.title",
    system: "Generate a short, descriptive title (max 8 words) for the document. Return only the title.",
    userTemplate: (input) => `Generate a title for:\n\n${input.slice(0, 2000)}`,
    permission: "READ",
    output: "text",
  },
  "sheet.analyze": {
    id: "sheet.analyze",
    system: "You are a data analyst. Analyze the spreadsheet data provided as text/CSV. Summarize insights, trends, and anomalies. Do not invent data.",
    userTemplate: (input, ctx) => `Analyze this spreadsheet data:\n\n${ctx ? ctx + "\n\n" : ""}${input}`,
    permission: "READ",
    output: "text",
  },
  "sheet.clean": {
    id: "sheet.clean",
    system: "You are a data cleaning assistant. Identify issues like duplicates, inconsistent formatting, missing values. Provide a cleaned version as a markdown table and list changes. Do not invent missing source values.",
    userTemplate: (input) => `Clean this dataset. Provide a markdown table of the cleaned data and a short changelog:\n\n${input}`,
    permission: "SUGGEST",
    output: "text",
  },
  "sheet.trends": {
    id: "sheet.trends",
    system: "Find trends in the spreadsheet data. Explain in plain language.",
    userTemplate: (input) => `Find trends:\n\n${input}`,
    permission: "READ",
    output: "text",
  },
  "note.organize": {
    id: "note.organize",
    system: "Organize the notes into a clear structure. Group related ideas and produce markdown.",
    userTemplate: (input) => `Organize these notes:\n\n${input}`,
    permission: "SUGGEST",
    output: "text",
  },
  "note.summarize": {
    id: "note.summarize",
    system: "Summarize the notes concisely.",
    userTemplate: (input) => `Summarize:\n\n${input}`,
    permission: "READ",
    output: "text",
  },
  "task.breakdown": {
    id: "task.breakdown",
    system: "Break the goal into actionable tasks. Return JSON array of objects with title and description. Example: [{\"title\":\"...\",\"description\":\"...\"}] Keep it valid JSON only.",
    userTemplate: (input) => `Break this into tasks:\n\n${input}`,
    permission: "CREATE",
    output: "structured",
  },
  "email.draft": {
    id: "email.draft",
    system: "You are an email writing assistant. Draft a clear email. Use the provided tone if specified. Return subject and body clearly. Do not claim to send the email.",
    userTemplate: (input, ctx) => `Draft an email${ctx ? ` in a ${ctx} tone` : ""}:\n\n${input}`,
    permission: "CREATE",
    output: "text",
  },
  "email.rewrite": {
    id: "email.rewrite",
    system: "Rewrite the email to improve clarity and tone. Preserve intent.",
    userTemplate: (input, ctx) => `Rewrite this email${ctx ? ` to be more ${ctx}` : ""}:\n\n${input}`,
    permission: "SUGGEST",
    output: "text",
  },
  general: {
    id: "general",
    system: "You are a helpful AI assistant inside a productivity workspace.",
    userTemplate: (input) => input,
    permission: "READ",
    output: "text",
  },
};

export function getPrompt(id: AIToolId): PromptDef {
  return PROMPTS[id] ?? PROMPTS.general;
}

export function applyVariables(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v).replaceAll(`{{ ${k} }}`, v);
  }
  return out;
}

// Context size safety
export const MAX_CONTEXT_CHARS = 12000;
export const MAX_OUTPUT_TOKENS = 4096;

export function truncateContext(text: string, max = MAX_CONTEXT_CHARS): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max) + "\n\n…[truncated for context limits]", truncated: true };
}
