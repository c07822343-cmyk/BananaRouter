"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Check,
  Copy,
  User,
  Bot,
  RotateCcw,
  Pencil,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
} from "lucide-react";
import { ChatMessage } from "@/lib/shared/types";
import { MarkdownMessage } from "./MarkdownMessage";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLast?: boolean;
  onRegenerate?: () => void;
  onRetry?: () => void;
  onEdit?: (newText: string) => void;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}

export function MessageBubble({
  message,
  isStreaming = false,
  isLast = false,
  onRegenerate,
  onRetry,
  onEdit,
  onFeedback,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
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

  const showFeedback = !isUser && !isStreaming && !!onFeedback;
  const needsRetry = !isUser && (message.interrupted || !message.content.trim());

  return (
    <div
      className={clsx(
        "content-sparse flex animate-fade-in gap-3",
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
            : "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]",
          isStreaming && "border-[hsl(var(--primary))]/40"
        )}
      >
        {editing && isUser ? (
          <div>
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (editValue.trim()) {
                    onEdit?.(editValue.trim());
                    setEditing(false);
                  }
                }
                if (e.key === "Escape") setEditing(false);
              }}
              aria-label="Edit message"
              className="focus-ring min-h-[80px] w-[min(80vw,520px)] resize-y rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-[15px] leading-7 text-[hsl(var(--foreground))]"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  if (editValue.trim()) {
                    onEdit?.(editValue.trim());
                    setEditing(false);
                  }
                }}
                className="focus-ring rounded-lg bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))]"
              >
                Save & resend
              </button>
              <button
                onClick={() => setEditing(false)}
                className="focus-ring rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isUser ? (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-7">
            {message.content}
          </div>
        ) : (
          <MarkdownMessage content={message.content} />
        )}

        {!isUser && !isStreaming && (
          <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-[hsl(var(--border))] pt-2 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              aria-label="Copy response"
              onClick={handleCopy}
              className="focus-ring flex items-center gap-1 rounded px-2 py-1.5 text-[11px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            {onRegenerate && isLast && (
              <button
                aria-label="Regenerate response"
                onClick={onRegenerate}
                className="focus-ring flex items-center gap-1 rounded px-2 py-1.5 text-[11px] text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
              >
                <RotateCcw size={12} />
                Regenerate
              </button>
            )}
            {needsRetry && onRetry && isLast && (
              <button
                aria-label="Retry response"
                onClick={onRetry}
                className="focus-ring flex items-center gap-1 rounded px-2 py-1.5 text-[11px] text-[hsl(var(--destructive))] transition hover:bg-[hsl(var(--destructive))]/10"
              >
                <AlertCircle size={12} />
                Retry
              </button>
            )}
            {message.interrupted && (
              <span className="flex items-center gap-1 px-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                <AlertCircle size={11} /> interrupted
              </span>
            )}
            {showFeedback && message.id && (
              <>
                <button
                  aria-label="Good response"
                  onClick={() => onFeedback?.(message.id!, "up")}
                  className={clsx(
                    "focus-ring rounded px-2 py-1.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
                    message.feedback === "up" &&
                      "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                  )}
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  aria-label="Bad response"
                  onClick={() => onFeedback?.(message.id!, "down")}
                  className={clsx(
                    "focus-ring rounded px-2 py-1.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
                    message.feedback === "down" &&
                      "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                  )}
                >
                  <ThumbsDown size={12} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex flex-col items-end gap-1">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
            <User size={16} />
          </div>
          {!editing && onEdit && (
            <button
              aria-label="Edit message"
              onClick={() => {
                setEditValue(message.content);
                setEditing(true);
              }}
              className="focus-ring mt-1 rounded p-1.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))]"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
