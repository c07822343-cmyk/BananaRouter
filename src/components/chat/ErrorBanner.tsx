"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, RotateCcw, X } from "lucide-react";
import { ApiError } from "@/lib/shared/types";

interface ErrorBannerProps {
  error: ApiError;
  onDismiss?: () => void;
  onRetry?: () => void;
}

const LABELS: Record<string, string> = {
  configuration: "Configuration",
  network: "Network",
  authentication: "Authentication",
  rate_limit: "Rate limit",
  model: "Model",
  context_limit: "Context limit",
  server: "Server",
  unknown: "Unknown",
};

export function ErrorBanner({ error, onDismiss, onRetry }: ErrorBannerProps) {
  const [open, setOpen] = useState(false);
  const category = error.category ?? "unknown";

  return (
    <div className="mx-auto my-4 w-full max-w-3xl rounded-xl border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5 p-4 text-left">
      <div className="flex items-start gap-3">
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0 text-[hsl(var(--destructive))]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[hsl(var(--foreground))]">
              {error.message}
            </span>
            <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              {LABELS[category] ?? category}
            </span>
          </div>
          {error.detail && (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="focus-ring mt-1 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Details
            </button>
          )}
          {open && error.detail && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[hsl(var(--muted))] p-3 text-[11px] leading-5 whitespace-pre-wrap">
              {error.detail}
            </pre>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {error.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="focus-ring flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium hover:bg-[hsl(var(--muted))]"
              >
                <RotateCcw size={12} />
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="focus-ring flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X size={12} />
                Dismiss
              </button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            aria-label="Dismiss error"
            onClick={onDismiss}
            className="focus-ring rounded p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
