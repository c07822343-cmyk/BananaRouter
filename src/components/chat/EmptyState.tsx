"use client";

import { Sparkles, MessageSquare } from "lucide-react";

interface EmptyStateProps {
  onPickPrompt: (prompt: string) => void;
}

const EXAMPLES: Array<{ title: string; prompt: string }> = [
  {
    title: "Brainstorm project ideas",
    prompt:
      "Give me five creative project ideas for a weekend productivity app.",
  },
  {
    title: "Explain a concept",
    prompt:
      "Explain how an API works using a simple analogy. Keep it to a few paragraphs.",
  },
  {
    title: "Draft an email",
    prompt:
      "Write a friendly, professional email asking my team for meeting availability next week.",
  },
  {
    title: "Debug code",
    prompt:
      "Explain the difference between a promise and async/await in JavaScript with a short code example.",
  },
];

export function EmptyState({ onPickPrompt }: EmptyStateProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg">
        <Sparkles size={26} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        How can I help you today?
      </h1>
      <p className="mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
        Ask anything or pick an example below. AI inference is provided through
        the OpenRouter API.
      </p>

      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
        {EXAMPLES.map((example) => (
          <button
            key={example.title}
            onClick={() => onPickPrompt(example.prompt)}
            className="focus-ring group rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left transition hover:border-[hsl(var(--primary))] hover:shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare size={14} className="text-[hsl(var(--primary))]" />
              {example.title}
            </div>
            <div className="mt-1.5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              {example.prompt}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-4 py-2 text-xs text-[hsl(var(--muted-foreground))]">
        <Sparkles size={12} className="text-[hsl(var(--primary))]" />
        Powered by OpenRouter
      </div>
    </div>
  );
}
