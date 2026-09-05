"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import { ApiError, AppDebugInfo, Conversation } from "@/lib/shared/types";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { EmptyState } from "./EmptyState";
import { ErrorBanner } from "./ErrorBanner";
import { ModelSelector } from "@/components/settings/ModelSelector";
import { DebugPanel } from "./DebugPanel";
import { BananaLogo } from "@/components/branding/BananaLogo";

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
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#0f0f10]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[hsl(var(--border))]/60 bg-white/80 dark:bg-[#0f0f10]/80 backdrop-blur px-3 py-2.5 md:px-5 sticky top-0 z-10">
        <div className="flex items-center gap-2 text-[12px]">
          <BananaLogo size={20} />
          <span className="font-semibold tracking-tight">BananaRouter AI</span>
          <span className="text-[hsl(var(--muted-foreground))] hidden sm:inline">Powered by OpenRouter</span>
          <span className="hidden sm:inline-flex rounded-full bg-[#FFFBEB] dark:bg-[#2a2210] border border-[#FDE68A]/50 px-2 py-0.5 text-[11px] font-medium text-[#92400e] dark:text-[#fde68a]">{currentModel?.includes("free") ? "Free Router" : currentModel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-[11px] text-[hsl(var(--muted-foreground))]">Model</span>
          <ModelSelector compact value={currentModel} onChange={onModelChange} />
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="relative min-h-0 flex-1 overflow-y-auto px-4 py-8 md:px-6 bg-[#fcfaf7] dark:bg-[#0f0f10]">
        {messages.length === 0 && !isGenerating ? (
          <div className="h-full">
            <EmptyState appName={appName} onPickPrompt={(prompt) => {
              onDraftChange(prompt);
              document.getElementById("chat-input")?.focus();
            }} />
          </div>
        ) : (
          <div className="mx-auto flex max-w-[var(--chat-max)] flex-col gap-8 pb-24">
            {messages.map((message, index) => (
              <div key={message.id ?? `${message.role}-${index}`} className={index !== 0 ? "pt-6 border-t border-[hsl(var(--border))]/40" : ""}>
                <MessageBubble
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
              </div>
            ))}

            {showStreaming && (
              <div className="pt-6 border-t border-[hsl(var(--border))]/40">
                <MessageBubble
                  message={{ role: "assistant", content: streamingMessage }}
                  isStreaming
                  isLast
                />
              </div>
            )}

            {isGenerating && !streamingMessage && (
              <div className="flex items-start gap-3 pt-6 border-t border-[hsl(var(--border))]/40">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F6C446] text-[#1a1a1a] shadow-sm">
                  <Sparkles size={14} />
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-[#FDE68A]/50 bg-[#FFFBEB] dark:bg-[#2a2210] px-4 py-2.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#F6C446]" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#F6C446]" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#F6C446]" style={{ animationDelay: "300ms" }} />
                  <span className="ml-2 text-xs font-medium text-[#92400e] dark:text-[#fde68a]">BananaRouter is thinking…</span>
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
            className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-white dark:bg-[#252529] px-4 py-2 text-xs font-medium shadow-lg hover:bg-[#FFFBEB] dark:hover:bg-[#2a2210] transition"
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
