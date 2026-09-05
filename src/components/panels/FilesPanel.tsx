"use client";

import { useWorkspace } from "@/lib/workspace/context";
import { Search, FileText, Trash2, Download, Eye, HardDrive, Folder, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

export function FilesPanel({ onAttach }: { onAttach?: (id: string) => void }) {
  const { state, createFile, deleteFile } = useWorkspace();
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<any | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return state.files.filter((f) => !f.trashed);
    return state.files.filter((f) => !f.trashed && `${f.name} ${f.textContent ?? ""}`.toLowerCase().includes(q));
  }, [state.files, query]);

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      for (const file of files.slice(0, 5)) {
        if (file.size > 10 * 1024 * 1024) continue;
        const text = await file.text().catch(() => "");
        createFile({
          name: file.name,
          mime: file.type || "text/plain",
          size: file.size,
          textContent: text.slice(0, 20000),
        } as any);
      }
    };
    input.click();
  };

  return (
    <div className="flex h-full flex-col bg-[#121214] text-zinc-300">
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1e] py-1.5 pl-7 pr-2 text-xs placeholder:text-zinc-500 focus:border-amber-500/40 focus:outline-none"
            />
          </div>
          <button onClick={handleUpload} className="rounded-lg bg-amber-400 px-2.5 py-1.5 text-xs font-medium text-black hover:bg-amber-300">
            <Plus size={12} className="inline" /> Upload
          </button>
        </div>
        <div className="mt-2 text-[11px] text-zinc-500">{filtered.length} file{filtered.length !== 1 ? "s" : ""} · drag to chat to attach</div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid gap-1">
          {filtered.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 hover:bg-white/5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 border border-white/10">
                <FileText size={14} className="text-zinc-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-zinc-200">{f.name}</div>
                <div className="truncate text-[11px] text-zinc-500">
                  {(f.size ? `${(f.size / 1024).toFixed(1)} KB` : "—") + (f.textContent ? ` · ${f.textContent.slice(0, 40)}` : "")}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPreview(f)} className="rounded p-1 hover:bg-white/10">
                  <Eye size={12} />
                </button>
                {onAttach && (
                  <button onClick={() => onAttach(f.id)} className="rounded-full bg-white/10 px-2 py-1 text-[11px] hover:bg-amber-500/20 hover:text-amber-300">
                    Attach
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete ${f.name}?`)) deleteFile(f.id, false);
                  }}
                  className="rounded p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-6 text-center text-xs text-zinc-500">No files. Upload to use as context.</div>}
        </div>
      </div>

      {preview && (
        <div className="absolute inset-0 z-10 flex flex-col bg-[#121214] border border-white/10 rounded-xl m-2 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-xs font-medium truncate">{preview.name}</span>
            <button onClick={() => setPreview(null)} className="rounded p-1 hover:bg-white/10">
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3 text-xs leading-5 whitespace-pre-wrap text-zinc-300">{preview.textContent?.slice(0, 10000) || "(no preview)"}</div>
          <div className="border-t border-white/10 p-2 flex justify-end gap-2">
            {onAttach && (
              <button
                onClick={() => {
                  onAttach(preview.id);
                  setPreview(null);
                }}
                className="rounded-full bg-amber-400 px-3 py-1.5 text-xs font-medium text-black"
              >
                Attach to chat
              </button>
            )}
            <button onClick={() => setPreview(null)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
