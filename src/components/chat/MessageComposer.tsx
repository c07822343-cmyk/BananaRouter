"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { ArrowUp, Paperclip, Square } from "lucide-react";
import { estimateTokens } from "@/lib/client/utils";

interface MessageComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function MessageComposer({
  onSend,
  onStop,
  isGenerating,
  disabled = false,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !isGenerating && !disabled;

  const submit = () => {
    if (!canSend) return;
    const text = value.trim();
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  return (
    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 pb-3 pt-3 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 shadow-sm transition focus-within:border-[hsl(var(--primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--ring))]/30">
          <button
            aria-label="Attach files (coming soon)"
            title="Attachments are not supported yet"
            disabled
            className="focus-ring mb-1 rounded-lg p-2 text-[hsl(var(--muted-foreground)] opacity-50"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            id="chat-input"
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Send a message…"
            rows={1}
            aria-label="Message input"
            className="max-h-[180px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-[hsl(var(--muted-foreground))]"
          />

          {isGenerating ? (
            <button
              aria-label="Stop generating"
              onClick={onStop}
              className="focus-ring mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] transition hover:opacity-90"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              aria-label="Send message"
              onClick={submit}
              disabled={!canSend}
              className={clsx(
                "focus-ring mb-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition hover:opacity-90",
                !canSend && "opacity-40 hover:opacity-40"
              )}
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-[hsl(var(--muted-foreground))]">
          <span className="hidden sm:block">
            Enter to send · Shift+Enter for a new line
          </span>
          <span className="ml-auto">{estimateTokens(value)} tokens</span>
        </div>
      </div>
    </div>
  );
}
