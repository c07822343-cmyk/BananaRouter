"use client";

import { Sparkles, MessageSquare, ArrowUpRight, Banana } from "lucide-react";
import { BananaLogo } from "@/components/branding/BananaLogo";

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
    <div className="mx-auto flex min-h-full max-w-[var(--chat-max)] flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F6C446] text-[#1a1a1a] shadow-sm">
        <BananaLogo size={44} />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">
        How can <span className="bg-[#F6C446] px-1.5 rounded">BananaRouter</span> help?
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
        Ask anything — draft, summarize, analyze, plan. Your files and chats stay local; AI runs via OpenRouter.
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 text-left">
        {EXAMPLES.map((example) => (
          <button
            key={example.title}
            onClick={() => onPickPrompt(example.prompt)}
            className="group flex items-start gap-3 rounded-2xl border border-[hsl(var(--border))] bg-white dark:bg-[#1e1e22] p-4 text-left transition hover:border-[#FDE68A] hover:shadow-md hover:bg-[#FFFBEB]/40 dark:hover:bg-[#2a2210]/40"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFFBEB] dark:bg-[#2a2210] border border-[#FDE68A]/50 text-[#b45309]"><MessageSquare size={14} /></span>
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

      <div className="mt-10 flex items-center gap-2 rounded-full border border-[#FDE68A]/50 bg-[#FFFBEB] dark:bg-[#2a2210] px-4 py-2 text-xs font-medium text-[#92400e] dark:text-[#fde68a]">
        <BananaLogo size={16} />
        BananaRouter · Powered by OpenRouter
      </div>
    </div>
  );
}
