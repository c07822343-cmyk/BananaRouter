"use client";

import { AppDebugInfo } from "@/lib/shared/types";

interface DebugPanelProps {
  info: AppDebugInfo | null;
}

export function DebugPanel({ info }: DebugPanelProps) {
  if (!info) return null;

  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
      <div className="mb-1 font-semibold uppercase tracking-wide">
        Debug information
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
        <div><dt className="inline font-medium">Model:</dt> <dd className="inline">{info.model}</dd></div>
        <div><dt className="inline font-medium">Streaming:</dt> <dd className="inline">{info.streaming ? "on" : "off"}</dd></div>
        {info.status !== undefined && <div><dt className="inline font-medium">HTTP status:</dt> <dd className="inline">{info.status}</dd></div>}
        {info.durationMs !== undefined && <div><dt className="inline font-medium">Duration:</dt> <dd className="inline">{info.durationMs}ms</dd></div>}
        {info.partial !== undefined && <div><dt className="inline font-medium">Partial:</dt> <dd className="inline">{info.partial ? "yes" : "no"}</dd></div>}
        {info.errorCode && <div><dt className="inline font-medium">Error:</dt> <dd className="inline">{info.errorCode}{info.errorCategory ? ` (${info.errorCategory})` : ""}</dd></div>}
        {info.tokenUsage && <div><dt className="inline font-medium">Token usage:</dt> <dd className="inline">{info.tokenUsage}</dd></div>}
      </dl>
    </div>
  );
}
