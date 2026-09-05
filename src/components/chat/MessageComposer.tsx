"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowUp, Loader2, Paperclip, Square, Wand2, X, FileText } from "lucide-react";
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
  const [dragOver, setDragOver] = useState(false);
  const [contextFiles, setContextFiles] = useState<{ name: string }[]>([]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isGenerating && !enhancing && !disabled;

  const submit = () => {
    if (!canSend) return;
    // include context if any
    const text = contextFiles.length ? `[Context: ${contextFiles.map(f=>f.name).join(", ")}]\n${value.trim()}` : value.trim();
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="border-t border-[hsl(var(--border))] bg-white/80 dark:bg-[#1a1a1e]/80 backdrop-blur px-3 pb-3 pt-3 md:px-6 sticky bottom-0"
      onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={(e)=>{
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files||[]);
        if (files.length) setContextFiles(prev=>[...prev, ...files.slice(0, 3).map(f=>({ name: f.name }))]);
      }}
    >
      <div className="mx-auto max-w-[var(--chat-max)]">
        {/* Context chips */}
        {contextFiles.length>0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {contextFiles.map((f,i)=>(
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFBEB] dark:bg-[#2a2210] border border-[#FDE68A]/60 px-2.5 py-1 text-xs">
                <FileText size={12} className="text-[#b45309]" /> {f.name}
                <button aria-label="Remove" onClick={()=>setContextFiles(prev=>prev.filter((_,j)=>j!==i))} className="rounded-full hover:bg-black/5 p-0.5"><X size={12} /></button>
              </span>
            ))}
            <button onClick={()=>setContextFiles([])} className="text-xs text-[hsl(var(--muted-foreground))] hover:underline">clear</button>
          </div>
        )}
        {dragOver && (
          <div className="mb-2 rounded-xl border-2 border-dashed border-[#F6C446] bg-[#FFFBEB] dark:bg-[#2a2210] px-4 py-3 text-sm text-[#92400e] dark:text-[#fde68a]">Drop files to add as context (preview only – text will be included)</div>
        )}
        <div className={clsx("relative flex items-end gap-2 rounded-[20px] border bg-white dark:bg-[#252529] px-3 py-2 shadow-sm transition", dragOver ? "border-[#F6C446] ring-2 ring-[#FDE68A]/50" : "border-[hsl(var(--border))] focus-within:border-[#F6C446] focus-within:ring-2 focus-within:ring-[#FDE68A]/40")}>
          <button
            aria-label="Attach files"
            title="Drag & drop or click to add context (local preview)"
            onClick={()=>{
              const inp = document.createElement("input");
              inp.type="file"; inp.multiple=true;
              inp.onchange=()=>{ const files = Array.from(inp.files||[]); if(files.length) setContextFiles(prev=>[...prev, ...files.slice(0,3).map(f=>({name:f.name}))]);};
              inp.click();
            }}
            className="mb-1 rounded-xl p-2 text-[hsl(var(--muted-foreground))] hover:bg-[#FFFBEB] dark:hover:bg-[#2a2210] hover:text-[#b45309] transition"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            id="chat-input"
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask BananaRouter anything…"
            rows={1}
            aria-label="Message input"
            className="max-h-[220px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-6 outline-none placeholder:text-[hsl(var(--muted-foreground))]"
          />

          {isGenerating ? (
            <button
              aria-label="Stop generating"
              onClick={onStop}
              className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] transition hover:opacity-90 shadow-sm"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              aria-label="Send message"
              onClick={submit}
              disabled={!canSend}
              className={clsx(
                "mb-1 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition",
                canSend ? "bg-[#F6C446] text-[#1a1a1a] hover:brightness-95" : "bg-[#f1f3f4] dark:bg-[#3c4043] text-[hsl(var(--muted-foreground))] opacity-60"
              )}
            >
              <ArrowUp size={18} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[11px] text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-3">
            <button
              aria-label="Enhance prompt"
              title="Improve this prompt with AI (extra request)"
              disabled={!value.trim() || isGenerating || enhancing}
              onClick={() => onEnhance(value.trim())}
              className="flex items-center gap-1 rounded-full border border-transparent hover:border-[hsl(var(--border))] hover:bg-white dark:hover:bg-[#252529] px-2 py-1 transition disabled:opacity-40"
            >
              {enhancing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              Enhance
            </button>
            <span className="hidden sm:inline">Enter to send · Shift+Enter for new line · Drag files for context</span>
          </div>
          <span className="hidden sm:inline">{estimateTokens(value)} tokens</span>
        </div>
      </div>
    </div>
  );
}

export { copyToClipboard };
