"use client";

import { Sparkles, MessageSquare, ArrowUpRight } from "lucide-react";

interface EmptyStateProps {
  appName: string;
  onPickPrompt: (prompt: string) => void;
}

const EXAMPLES: Array<{ title: string; prompt: string }> = [
  {
    title: "Explain a difficult topic",
    prompt:
      "Explain a difficult topic to me using a simple analogy. Choose the topic: the difference between symmetric and asymmetric encryption.",
  },
  {
    title: "Help me write code",
    prompt:
      "Help me write code that sorts a list of objects by a nested property in JavaScript. Include a short explanation and edge cases.",
  },
  {
    title: "Brainstorm a business idea",
    prompt:
      "Brainstorm a small online business idea that could be started on a weekend budget. Give three options with pros and cons.",
  },
  {
    title: "Analyze this text",
    prompt:
      "Analyze this text for tone, clarity, and structure, then offer three specific edits to improve it: \"We are happy to announce a new feature next week.\"",
  },
  {
    title: "Create a study plan",
    prompt:
      "Create a two-week study plan for learning TypeScript fundamentals, with daily goals and a short practice exercise each day.",
  },
];

export function EmptyState({ appName, onPickPrompt }: EmptyStateProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg">
        <Sparkles size={26} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight md:text-[2rem]">
        How can I help you today?
      </h1>
      <p className="mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
        Ask anything or pick an example below. AI inference is provided through
        the OpenRouter API.
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {EXAMPLES.map((example) => (
          <button
            key={example.title}
            onClick={() => onPickPrompt(example.prompt)}
            className="focus-ring group flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left transition hover:border-[hsl(var(--primary))] hover:shadow-sm"
          >
            <MessageSquare
              size={16}
              className="mt-0.5 shrink-0 text-[hsl(var(--primary))]"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {example.title}
                <ArrowUpRight
                  size={13}
                  className="opacity-0 transition group-hover:opacity-100"
                />
              </span>
              <span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                {example.prompt}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-4 py-2 text-xs text-[hsl(var(--muted-foreground))]">
        <Sparkles size={12} className="text-[hsl(var(--primary))]" />
        {appName} · Powered by OpenRouter
      </div>
    </div>
  );
}
