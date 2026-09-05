"use client";

import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import { Conversation, ApiError } from "@/lib/shared/types";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { EmptyState } from "./EmptyState";
import { ErrorBanner } from "./ErrorBanner";
import { ModelSelector } from "@/components/settings/ModelSelector";

interface ChatPanelProps {
  conversation: Conversation | null;
  streamingMessage: string;
  isGenerating: boolean;
  error: ApiError | null;
  currentModel: string;
  onModelChange: (model: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
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
  onModelChange,
  onSend,
  onStop,
  onRegenerate,
  onNewChat,
  onDismissError,
  disabled = false,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && shouldAutoScroll.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [conversation?.messages, streamingMessage]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    shouldAutoScroll.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const messages = conversation?.messages ?? [];
  const showStreaming = isGenerating && streamingMessage.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2">
        <div className="hidden items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))] sm:flex">
          <Bot size={13} className="text-[hsl(var(--primary))]" />
          Powered by OpenRouter
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Model
          </span>
          <ModelSelector
            compact
            value={currentModel}
            onChange={onModelChange}
          />
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6"
      >
        {messages.length === 0 && !isGenerating ? (
          <div className="h-full">
            <EmptyState onPickPrompt={(prompt) => onSend(prompt)} />
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.role}-${index}`}
                message={message}
                isStreaming={isGenerating && index === messages.length - 1 && message.role === "assistant"}
              />
            ))}

            {showStreaming && (
              <MessageBubble
                message={{ role: "assistant", content: streamingMessage }}
                isStreaming
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
                message={error.message}
                detail={error.detail}
                onDismiss={onDismissError}
              />
            )}
          </div>
        )}
      </div>

      <MessageComposer
        onSend={onSend}
        onStop={onStop}
        isGenerating={isGenerating}
        disabled={disabled}
      />
    </div>
  );
}
