"use client";

import { useMemo, useState, useRef } from "react";
import { Folder as FolderIcon, File as FileIcon, Upload, Grid3X3, List, Star, Trash2, MoreHorizontal, Search, FolderPlus, Image as ImageIcon, FileText, Table2, FileJson, HardDrive, Eye, Download, Copy, Sparkles } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { WorkspaceFile, Folder } from "@/lib/workspace/types";
import { executeAI } from "@/lib/ai/service";
import { loadSettings } from "@/lib/client/settings";

type ViewMode = "grid" | "list";

export function DriveView({ onAskFile }: { onAskFile?: (f: WorkspaceFile) => void }) {
  const { state, createFolder, createFile, updateFile, updateFolder, deleteFile, deleteFolder, addNotification } = useWorkspace();
  const [view, setView] = useState<ViewMode>("grid");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<WorkspaceFile | null>(null);
  const [aiFile, setAiFile] = useState<WorkspaceFile | null>(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const breadcrumbs = useMemo(() => {
    const chain: Folder[] = [];
    let cur = currentFolder;
    while (cur) {
      const f = state.folders.find((x) => x.id === cur);
      if (!f) break;
      chain.unshift(f);
      cur = f.parentId;
    }
    return chain;
  }, [currentFolder, state.folders]);

  const folders = state.folders.filter((f) => !f.trashed && f.parentId === currentFolder);
  const files = useMemo(() => {
    let list = state.files.filter((f) => !f.trashed && (f.folderId ?? null) === currentFolder);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || (f.textContent ?? "").toLowerCase().includes(q));
    }
    if (starredOnly) list = list.filter((f) => f.starred);
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [state.files, currentFolder, query, starredOnly]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      let textContent: string | undefined;
      let dataUrl: string | undefined;
      const size = file.size;
      if (size > 10 * 1024 * 1024) {
        addNotification({ title: "File too large", message: `${file.name} exceeds 10MB and was skipped.`, type: "warning" });
        continue;
      }
      try {
        if (isImage) {
          dataUrl = await readAsDataUrl(file);
          textContent = `[Image: ${file.name}, ${file.type}, ${size} bytes]`;
        } else if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".csv") || file.name.endsWith(".json") || file.type === "application/json") {
          textContent = await file.text();
          textContent = textContent.slice(0, 20000);
        } else if (file.name.endsWith(".pdf")) {
          textContent = `[PDF: ${file.name} — text extraction not supported in browser preview. Metadata only.]`;
        } else {
          textContent = `[File: ${file.name}, type ${file.type || "unknown"}, ${size} bytes]`;
        }
      } catch {
        textContent = `[Could not read file: ${file.name}]`;
      }
      const kind: WorkspaceFile["kind"] =
        file.name.endsWith(".csv") ? "csv" :
        file.name.endsWith(".json") ? "json" :
        isImage ? "image" :
        file.type.includes("pdf") ? "pdf" :
        file.type.includes("text") || file.name.endsWith(".md") || file.name.endsWith(".txt") ? "text" : "other";
      createFile({
        name: file.name,
        originalName: file.name,
        mime: file.type || "application/octet-stream",
        size,
        kind,
        textContent,
        dataUrl,
        folderId: currentFolder,
        projectId: state.activeProjectId,
      });
    }
    addNotification({ title: "Upload complete", message: `${files.length} file(s) added to Drive.`, type: "success" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (dt.files.length) {
      const fake = { target: { files: dt.files } } as any;
      handleUpload(fake);
    }
  };

  const askAi = async (file: WorkspaceFile, prompt: string) => {
    if (!file.textContent && !file.dataUrl) { addNotification({ title: "No text", message: "This file has no extractable text.", type: "warning" }); return; }
    setAiFile(file);
    setAiResult("");
    setAiLoading(true);
    const settings = loadSettings();
    try {
      const ctxText = file.textContent?.slice(0, 8000) ?? "";
      const out = await executeAI({ model: settings.model, toolId: "general", input: `${prompt}\n\nFile: ${file.name}\n\n${ctxText}`, contextText: ctxText, signal: new AbortController().signal });
      setAiResult(out);
    } catch (err: any) {
      setAiResult(`Error: ${err?.message ?? "AI failed"}`);
    } finally {
      setAiLoading(false);
    }
  };

  const iconFor = (f: WorkspaceFile) => {
    if (f.kind === "image") return <ImageIcon size={20} className="text-[#34a853]" />;
    if (f.kind === "csv" || f.kind === "json" || f.name.endsWith(".csv")) return <Table2 size={20} className="text-[#1a73e8]" />;
    if (f.kind === "pdf") return <FileText size={20} className="text-[#ea4335]" />;
    return <FileIcon size={20} className="text-[#5f6368]" />;
  };

  return (
    <div className="flex h-full flex-col" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-white px-4 py-2.5 dark:bg-[#202124]">
        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => setCurrentFolder(null)} className={`rounded px-2 py-1 ${!currentFolder ? "bg-[#e8f0fe] text-[#1a73e8]" : "hover:bg-[hsl(var(--muted))]"}`}>My Files</button>
          {breadcrumbs.map((b) => (
            <span key={b.id} className="flex items-center gap-1">
              <span className="text-[hsl(var(--muted-foreground))]">/</span>
              <button onClick={() => setCurrentFolder(b.id)} className="rounded px-2 py-1 hover:bg-[hsl(var(--muted))]">{b.name}</button>
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white hover:bg-[#1765cc]">
            <Upload size={14} /> Upload
            <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} accept=".txt,.md,.csv,.json,.pdf,image/*" />
          </label>
          <button onClick={() => { const name = prompt("Folder name"); if (name) createFolder(name, currentFolder); }} className="rounded-full border bg-white px-3 py-2 text-sm dark:bg-[#303134]">
            <FolderPlus size={16} />
          </button>
          <div className="hidden items-center rounded-full bg-[#f1f3f4] p-1 dark:bg-[#303134] md:flex">
            <button onClick={() => setView("grid")} className={`rounded-full p-1.5 ${view === "grid" ? "bg-white shadow dark:bg-[#3c4043]" : ""}`}><Grid3X3 size={16} /></button>
            <button onClick={() => setView("list")} className={`rounded-full p-1.5 ${view === "list" ? "bg-white shadow dark:bg-[#3c4043]" : ""}`}><List size={16} /></button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[#f8f9fa] px-4 py-2 dark:bg-[#202124]">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in Drive" className="w-full rounded-full bg-white py-1.5 pl-9 pr-3 text-sm dark:bg-[#303134]" />
        </div>
        <button onClick={() => setStarredOnly((v) => !v)} className={`rounded-full px-3 py-1.5 text-xs ${starredOnly ? "bg-[#fef7e0] text-[#e37400]" : "bg-white dark:bg-[#303134]"}`}>⭐ Starred</button>
        <span className="hidden text-xs text-[hsl(var(--muted-foreground))] md:block">Drop files here to upload • Max 10MB per file</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {folders.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">Folders</div>
              <div className={view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" : "space-y-1"}>
                {folders.map((f) => (
                  <div key={f.id} onDoubleClick={() => setCurrentFolder(f.id)} className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-white px-3 py-3 hover:shadow dark:bg-[#303134]">
                    <FolderIcon size={20} className="text-[#5f6368]" />
                    <span className="flex-1 truncate text-sm font-medium">{f.name}</span>
                    <button onClick={() => updateFolder(f.id, { starred: !f.starred })} className="opacity-0 group-hover:opacity-100"><Star size={14} className={f.starred ? "fill-[#fbbc04] text-[#fbbc04]" : ""} /></button>
                    <button onClick={() => { if (confirm("Move folder to trash?")) deleteFolder(f.id); }} className="opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Files • {files.length}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Processing: files are parsed locally; only selected file content is sent to OpenRouter when you use AI.</span>
          </div>

          {files.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[hsl(var(--border))] bg-white p-10 text-center dark:bg-[#303134]">
              <HardDrive size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No files here</p>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Upload files or drop them here. Supported: TXT, MD, JSON, CSV, PDF (metadata), images.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {files.map((f) => (
                <div key={f.id} className="group relative overflow-hidden rounded-xl border bg-white hover:shadow-md dark:bg-[#303134]">
                  <div className="flex h-28 items-center justify-center bg-[#f8f9fa] dark:bg-[#3c4043]">
                    {f.dataUrl ? <img src={f.dataUrl} alt={f.name} className="h-full w-full object-cover" /> : iconFor(f)}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{(f.size / 1024).toFixed(1)} KB • {f.kind}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button onClick={() => setPreview(f)} className="rounded-full bg-[#e8f0fe] px-2 py-1 text-xs text-[#1a73e8]"><Eye size={10} className="inline" /> Preview</button>
                      <button onClick={() => askAi(f, "Summarize this file")} className="rounded-full bg-[#fef7e0] px-2 py-1 text-xs">Summarize</button>
                    </div>
                  </div>
                  <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => updateFile(f.id, { starred: !f.starred })} className="rounded-full bg-white p-1.5 shadow"><Star size={12} className={f.starred ? "fill-[#fbbc04] text-[#fbbc04]" : ""} /></button>
                    <button onClick={() => { if (confirm("Move to trash?")) deleteFile(f.id); }} className="rounded-full bg-white p-1.5 shadow"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-white dark:bg-[#303134]">
              <div className="grid grid-cols-[1fr_120px_80px] bg-[#f1f3f4] px-3 py-2 text-xs font-medium dark:bg-[#3c4043]">
                <span>Name</span><span>Size</span><span>Actions</span>
              </div>
              {files.map((f) => (
                <div key={f.id} className="grid grid-cols-[1fr_120px_80px] items-center border-t px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 truncate">{iconFor(f)} {f.name}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{(f.size / 1024).toFixed(1)} KB</span>
                  <span className="flex gap-1">
                    <button onClick={() => setPreview(f)} className="rounded p-1 hover:bg-[hsl(var(--muted))]"><Eye size={14} /></button>
                    <button onClick={() => askAi(f, "Summarize this file")} className="rounded p-1 hover:bg-[hsl(var(--muted))]"><Sparkles size={14} /></button>
                    <button onClick={() => { if (confirm("Delete?")) deleteFile(f.id); }} className="rounded p-1 hover:bg-[hsl(var(--muted))]"><Trash2 size={14} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* preview / AI panel */}
        {(preview || aiFile) && (
          <div className="hidden w-[420px] shrink-0 flex-col border-l bg-white dark:bg-[#202124] lg:flex">
            {preview && !aiFile && (
              <>
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="truncate text-sm font-medium">{preview.name}</span>
                  <button onClick={() => setPreview(null)} className="rounded-full p-1 hover:bg-[hsl(var(--muted))]">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {preview.dataUrl ? (
                    <img src={preview.dataUrl} alt={preview.name} className="mx-auto max-h-[320px] rounded-xl" />
                  ) : preview.kind === "csv" ? (
                    <div className="overflow-auto rounded-xl border">
                      <table className="min-w-full text-xs">
                        <tbody>
                          {preview.textContent?.split("\n").slice(0, 20).map((line, i) => (
                            <tr key={i} className={i === 0 ? "bg-[#f1f3f4] font-medium" : ""}>
                              {line.split(",").map((cell, j) => <td key={j} className="border px-2 py-1">{cell}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="p-2 text-[11px] text-[hsl(var(--muted-foreground))]">Previewing first 20 rows</div>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap rounded-xl bg-[#f8f9fa] p-3 text-xs dark:bg-[#303134]">{preview.textContent?.slice(0, 5000) || "No preview available."}</pre>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => askAi(preview, "Summarize this")} className="rounded-full bg-[#1a73e8] px-3 py-1.5 text-xs font-medium text-white">Ask AI: Summarize</button>
                    <button onClick={() => askAi(preview, "Extract action items")} className="rounded-full bg-white px-3 py-1.5 text-xs shadow">Action items</button>
                    <button
                      onClick={() => {
                        const blob = new Blob([preview.textContent ?? ""], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = preview.name; a.click(); URL.revokeObjectURL(url);
                      }}
                      className="rounded-full border px-3 py-1.5 text-xs"
                    >
                      <Download size={12} className="inline" /> Download
                    </button>
                  </div>
                </div>
              </>
            )}
            {aiFile && (
              <>
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="text-sm font-medium">AI: {aiFile.name}</span>
                  <button onClick={() => setAiFile(null)} className="rounded-full p-1 hover:bg-[hsl(var(--muted))]">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 text-sm leading-6">
                  {aiLoading ? <span className="text-[hsl(var(--muted-foreground))]">Analyzing with OpenRouter… Only this file is sent.</span> : <div className="whitespace-pre-wrap">{aiResult || "No result"}</div>}
                </div>
                <div className="border-t p-3">
                  <div className="flex gap-1">
                    <button onClick={() => askAi(aiFile, "Find the important points")} className="rounded-full bg-[hsl(var(--muted))] px-3 py-1.5 text-xs">Important points</button>
                    <button onClick={() => askAi(aiFile, "Turn this into a study guide")} className="rounded-full bg-[hsl(var(--muted))] px-3 py-1.5 text-xs">Study guide</button>
                  </div>
                  <button onClick={() => { setAiFile(null); setPreview(aiFile); }} className="mt-2 text-xs text-[hsl(var(--muted-foreground))] hover:underline">Back to preview</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
