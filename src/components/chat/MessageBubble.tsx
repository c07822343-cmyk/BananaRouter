"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Copy, User, Bot, RotateCcw } from "lucide-react";
import { ChatMessage } from "@/lib/shared/types";
import { MarkdownMessage } from "./MarkdownMessage";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

export function MessageBubble({
  message,
  isStreaming = false,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = message.content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className={clsx(
        "flex animate-fade-in gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm">
          <Bot size={16} />
        </div>
      )}

      <div
        className={clsx(
          "group max-w-[88%] rounded-2xl px-4 py-3 md:max-w-[min(720px,80%)]",
          isUser
            ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
            : "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]"
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-7">
            {message.content}
          </div>
        ) : (
          <MarkdownMessage content={message.content} />
        )}

        {!isUser && (
          <div className="mt-2 flex items-center gap-1 border-t border-[hsl(var(--border))] pt-2 opacity-0 transition group-hover:opacity-100">
            <button
              aria-label="Copy response"
              onClick={handleCopy}
              className="focus-ring flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
            {onRegenerate && !isStreaming && (
              <button
                aria-label="Regenerate response"
                onClick={onRegenerate}
                className="focus-ring flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              >
                <RotateCcw size={12} />
                Regenerate
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
          <User size={16} />
        </div>
      )}
    </div>
  );
}
