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
import { BananaLogo } from "@/components/branding/BananaLogo";

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

  if (isUser) {
    return (
      <div className="group flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a1a] text-white dark:bg-white dark:text-[#1a1a1a] shadow-sm">
            <User size={14} />
          </div>
          <span className="text-sm font-semibold tracking-tight">You</span>
          {onEdit && !editing && (
            <button
              aria-label="Edit message"
              onClick={() => {
                setEditValue(message.content);
                setEditing(true);
              }}
              className="ml-auto rounded-full p-1.5 text-[hsl(var(--muted-foreground))] opacity-0 transition group-hover:opacity-100 hover:bg-[hsl(var(--muted))]"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
        {editing ? (
          <div className="ml-[36px]">
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (editValue.trim()) {
                    onEdit?.(editValue.trim());
                    setEditing(false);
                  }
                }
                if (e.key === "Escape") setEditing(false);
              }}
              aria-label="Edit message"
              className="focus-ring min-h-[80px] w-full resize-y rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-3 text-[15px] leading-7 text-[hsl(var(--foreground))]"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  if (editValue.trim()) {
                    onEdit?.(editValue.trim());
                    setEditing(false);
                  }
                }}
                className="rounded-full bg-[#1a1a1a] dark:bg-white px-4 py-1.5 text-xs font-semibold text-white dark:text-[#1a1a1a]"
              >
                Save & resend
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-full border border-[hsl(var(--border))] px-4 py-1.5 text-xs hover:bg-[hsl(var(--muted))]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="ml-[36px] whitespace-pre-wrap break-words text-[15px] leading-7">
            {message.content}
          </div>
        )}
      </div>
    );
  }

  // Assistant – document style (no bubble)
  return (
    <div className="group flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#F6C446] shadow-sm">
          {/* subtle B – but use BananaLogo fallback size */}
          <span className="text-[11px] font-bold text-[#1a1a1a]">B</span>
        </span>
        <span className="text-sm font-semibold tracking-tight">BananaRouter</span>
        <span className="text-xs font-normal text-[hsl(var(--muted-foreground))] hidden sm:inline">· Powered by OpenRouter</span>
        {isStreaming && <span className="ml-1 inline-flex items-center rounded-full bg-[#FFFBEB] dark:bg-[#2a2210] border border-[#FDE68A]/60 px-2 py-0.5 text-[11px] font-medium text-[#92400e] dark:text-[#fcd34d]">Streaming…</span>}
      </div>
      <div className={clsx("ml-[36px] prose-chat", isStreaming && "opacity-90")}>
        <MarkdownMessage content={message.content} />
      </div>

      {/* Actions bar – discrete, shows on hover */}
      {!isStreaming && (
        <div className="ml-[36px] flex flex-wrap items-center gap-1 border-t border-[hsl(var(--border))]/60 pt-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            aria-label="Copy response"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-white dark:bg-[#252529] px-2.5 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[#FFFBEB] dark:hover:bg-[#2a2210] transition"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {onRegenerate && isLast && (
            <button
              aria-label="Regenerate response"
              onClick={onRegenerate}
              className="flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-white dark:bg-[#252529] px-2.5 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition"
            >
              <RotateCcw size={12} />
              Regenerate
            </button>
          )}
          {needsRetry && onRetry && isLast && (
            <button
              aria-label="Retry response"
              onClick={onRetry}
              className="flex items-center gap-1 rounded-full bg-[#fef2f2] border border-red-200 px-2.5 py-1 text-xs font-medium text-[#991b1b] hover:bg-red-50 transition"
            >
              <AlertCircle size={12} />
              Retry
            </button>
          )}
          {message.interrupted && (
            <span className="flex items-center gap-1 px-2 text-[11px] text-[hsl(var(--muted-foreground))]">
              <AlertCircle size={11} /> interrupted
            </span>
          )}
          {showFeedback && message.id && (
            <>
              <button
                aria-label="Good response"
                onClick={() => onFeedback?.(message.id!, "up")}
                className={clsx(
                  "rounded-full border p-1.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))]",
                  message.feedback === "up" && "bg-[#FFFBEB] text-[#92400e] border-[#FDE68A]"
                )}
              >
                <ThumbsUp size={12} />
              </button>
              <button
                aria-label="Bad response"
                onClick={() => onFeedback?.(message.id!, "down")}
                className={clsx(
                  "rounded-full border p-1.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))]",
                  message.feedback === "down" && "bg-[#FFFBEB] text-[#92400e] border-[#FDE68A]"
                )}
              >
                <ThumbsDown size={12} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
