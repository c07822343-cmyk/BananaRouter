"use client";

import { Loader2, Sparkles, X } from "lucide-react";

interface EnhancePromptDialogProps {
  open: boolean;
  original: string;
  enhanced: string | null;
  loading: boolean;
  error: string | null;
  onUse: () => void;
  onKeepOriginal: () => void;
  onClose: () => void;
}

export function EnhancePromptDialog({
  open,
  original,
  enhanced,
  loading,
  error,
  onUse,
  onKeepOriginal,
  onClose,
}: EnhancePromptDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enhance prompt"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--border))] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[hsl(var(--primary))]" />
            <h2 className="text-base font-semibold">Enhance prompt</h2>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <p className="mb-4 rounded-lg bg-[hsl(var(--muted))] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
            This sends your prompt to the configured AI model for an additional
            request and asks it to improve clarity and structure.
          </p>

          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            Original
          </label>
          <pre className="mb-4 max-h-32 overflow-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3 text-sm whitespace-pre-wrap">
            {original}
          </pre>

          {loading && (
            <div className="flex items-center gap-2 py-4 text-sm text-[hsl(var(--muted-foreground))]">
              <Loader2 size={16} className="animate-spin" />
              Enhancing prompt…
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5 px-3 py-2 text-sm text-[hsl(var(--destructive))]">
              {error}
            </div>
          )}

          {!loading && enhanced && (
            <>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                Enhanced prompt
              </label>
              <pre className="max-h-56 overflow-auto rounded-lg border border-[hsl(var(--primary))]/30 bg-[hsl(var(--muted))] p-3 text-sm leading-6 whitespace-pre-wrap">
                {enhanced}
              </pre>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[hsl(var(--border))] px-5 py-3.5">
          <button
            onClick={onKeepOriginal}
            disabled={loading}
            className="focus-ring rounded-lg border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium hover:bg-[hsl(var(--muted))] disabled:opacity-50"
          >
            Keep Original
          </button>
          <button
            onClick={onUse}
            disabled={loading || !enhanced}
            className="focus-ring rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
          >
            Use Enhanced Prompt
          </button>
        </div>
      </div>
    </div>
  );
}
