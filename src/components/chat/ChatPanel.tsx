"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, Bot } from "lucide-react";
import { ApiError, AppDebugInfo, Conversation } from "@/lib/shared/types";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { EmptyState } from "./EmptyState";
import { ErrorBanner } from "./ErrorBanner";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { DebugPanel } from "./DebugPanel";

interface ChatPanelProps {
  conversation: Conversation | null;
  streamingMessage: string;
  isGenerating: boolean;
  error: ApiError | null;
  currentModel: string;
  draft: string;
  debugInfo: AppDebugInfo | null;
  appName: string;
  onModelChange: (model: string) => void;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onRetry: () => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onFeedback: (messageId: string, feedback: "up" | "down") => void;
  onEnhance: (text: string) => void;
  enhancing: boolean;
  onNewChat: () => void;
  onDismissError: () => void;
  disabled?: boolean;
}

export function ChatPanel({
  conversation,
  streamingMessage,
  isGenerating,
  error,
  currentModel,
  draft,
  debugInfo,
  appName,
  onModelChange,
  onDraftChange,
  onSend,
  onStop,
  onRegenerate,
  onRetry,
  onEditMessage,
  onFeedback,
  onEnhance,
  enhancing,
  onNewChat,
  onDismissError,
  disabled = false,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const [showJump, setShowJump] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && shouldAutoScroll.current) {
      el.scrollTop = el.scrollHeight;
      setShowJump(false);
    }
  }, [conversation?.messages.length, streamingMessage]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    shouldAutoScroll.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 220);
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    shouldAutoScroll.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowJump(false);
  };

  const messages = conversation?.messages ?? [];
  const showStreaming = isGenerating && streamingMessage.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 md:px-5">
        <div className="hidden items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))] sm:flex">
          <Bot size={13} className="text-[hsl(var(--primary))]" />
          Powered by OpenRouter
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Model
          </span>
          <ModelSelector compact value={currentModel} onChange={onModelChange} />
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="relative min-h-0 flex-1 overflow-y-auto px-3 py-6 md:px-5">
        {messages.length === 0 && !isGenerating ? (
          <div className="h-full">
            <EmptyState appName={appName} onPickPrompt={(prompt) => {
              onDraftChange(prompt);
              document.getElementById("chat-input")?.focus();
            }} />
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-24">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id ?? `${message.role}-${index}`}
                message={message}
                isStreaming={isGenerating && index === messages.length - 1 && message.role === "assistant"}
                isLast={index === messages.length - 1 && !isGenerating}
                onRegenerate={
                  message.role === "assistant" && index === messages.length - 1
                    ? onRegenerate
                    : undefined
                }
                onRetry={
                  message.role === "assistant" && index === messages.length - 1
                    ? onRetry
                    : undefined
                }
                onEdit={
                  message.role === "user" && message.id
                    ? (newText: string) => onEditMessage(message.id!, newText)
                    : undefined
                }
                onFeedback={message.role === "assistant" ? onFeedback : undefined}
              />
            ))}

            {showStreaming && (
              <MessageBubble
                message={{ role: "assistant", content: streamingMessage }}
                isStreaming
                isLast
              />
            )}

            {isGenerating && !streamingMessage && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                  <Bot size={16} />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3">
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[hsl(var(--primary))]" />
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[hsl(var(--primary))] [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[hsl(var(--primary))] [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {error && (
              <ErrorBanner
                error={error}
                onDismiss={onDismissError}
                onRetry={error.retryable ? onRetry : undefined}
              />
            )}

            {debugInfo && <DebugPanel info={debugInfo} />}
          </div>
        )}

        {showJump && (
          <button
            onClick={jumpToLatest}
            aria-label="Jump to latest"
            className="focus-ring absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-xs font-medium shadow-lg hover:bg-[hsl(var(--muted))]"
          >
            <ArrowDown size={14} />
            Jump to latest
          </button>
        )}
      </div>

      <MessageComposer
        value={draft}
        onChange={onDraftChange}
        onSend={onSend}
        onStop={onStop}
        onEnhance={onEnhance}
        isGenerating={isGenerating}
        enhancing={enhancing}
        disabled={disabled}
      />
    </div>
  );
}
