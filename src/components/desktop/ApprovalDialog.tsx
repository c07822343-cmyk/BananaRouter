"use client";

import { ApprovalRequest } from "@/lib/tools/types";

export function ApprovalDialog({
  request,
  onAllowOnce,
  onAlways,
  onDeny,
}: {
  request: ApprovalRequest | null;
  onAllowOnce: () => void;
  onAlways: () => void;
  onDeny: () => void;
}) {
  if (!request) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#1a1a1e] p-4 shadow-2xl">
        <div className="text-sm font-medium text-zinc-100">Tool wants to perform a sensitive action</div>
        <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="text-xs font-medium text-amber-300">{request.toolName} · {request.permission}</div>
          <div className="mt-1 text-xs text-amber-200/80">{request.reason}</div>
          <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-black/30 p-2 text-[11px] text-zinc-400">{JSON.stringify(request.arguments, null, 2)}</pre>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onDeny} className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10">
            Deny
          </button>
          <button onClick={onAlways} className="rounded-full border border-white/10 px-3 py-1.5 text-sm hover:bg-white/10">
            Always Allow
          </button>
          <button onClick={onAllowOnce} className="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-medium text-black hover:bg-amber-300">
            Allow Once
          </button>
        </div>
      </div>
    </div>
  );
}
