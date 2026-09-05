"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { ArrowUp, Loader2, Paperclip, Square, Wand2 } from "lucide-react";
import { estimateTokens } from "@/lib/client/utils";

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onEnhance: (text: string) => void;
  isGenerating: boolean;
  enhancing: boolean;
  disabled?: boolean;
}

function copyToClipboard(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function MessageComposer({
  value,
  onChange,
  onSend,
  onStop,
  onEnhance,
  isGenerating,
  enhancing,
  disabled = false,
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isGenerating && !enhancing && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 pb-3 pt-3 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-1.5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 shadow-sm transition focus-within:border-[hsl(var(--primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--ring))]/30">
          <button
            aria-label="Attach files (coming soon)"
            title="Attachments are not supported yet"
            disabled
            className="focus-ring mb-1 rounded-lg p-2 text-[hsl(var(--muted-foreground))] opacity-40"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            id="chat-input"
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message…"
            rows={1}
            aria-label="Message input"
            className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-[hsl(var(--muted-foreground))]"
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

        <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-3">
            <button
              aria-label="Enhance prompt"
              title="Send this prompt to the AI to improve it (creates an additional AI request)"
              disabled={!value.trim() || isGenerating || enhancing}
              onClick={() => onEnhance(value.trim())}
              className="focus-ring flex items-center gap-1 rounded hover:text-[hsl(var(--primary))] disabled:opacity-40 disabled:hover:text-[hsl(var(--muted-foreground))]"
            >
              {enhancing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Wand2 size={12} />
              )}
              Enhance
            </button>
            <span className="hidden sm:block">
              Enter to send · Shift+Enter for a new line
            </span>
          </div>
          <span>{estimateTokens(value)} tokens</span>
        </div>
      </div>
    </div>
  );
}

export { copyToClipboard };
