"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  detail?: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, detail, onDismiss }: ErrorBannerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto my-4 w-full max-w-3xl rounded-xl border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/5 p-4 text-left">
      <div className="flex items-start gap-3">
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0 text-[hsl(var(--destructive))]"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[hsl(var(--foreground))]">
            {message}
          </div>
          {detail && (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="focus-ring mt-1 flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Details
            </button>
          )}
          {open && detail && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[hsl(var(--muted))] p-3 text-[11px] leading-5 whitespace-pre-wrap">
              {detail}
            </pre>
          )}
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
