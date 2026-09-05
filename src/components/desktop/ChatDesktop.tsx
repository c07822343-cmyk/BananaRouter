"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/lib/workspace/context";
import { loadSettings, saveSettings } from "@/lib/client/settings";
import { DEFAULT_SETTINGS } from "@/lib/client/settings";
import { ApiError, ChatMessage, Conversation } from "@/lib/shared/types";
import { generateTitle } from "@/lib/client/utils";
import { uid } from "@/lib/client/storage";
import { streamChat } from "@/lib/client/api";
import { buildContextText } from "@/lib/ai/service";
import { AIContext } from "@/lib/workspace/types";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ErrorBanner } from "@/components/chat/ErrorBanner";
import { ArrowDown, Square, ArrowUp, Copy, RotateCcw, Sparkles } from "lucide-react";

export function ChatDesktop({ sessionId, onNewTitle }: { sessionId: string | null; onNewTitle?: (id: string) => void }) {
  const { state, setConversations, addNotification } = useWorkspace();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeId, setActiveId] = useState<string | null>(sessionId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [draft, setDraft] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const tokenRef = useRef(0);
  const streamedRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [attachedIds, setAttachedIds] = useState<string[]>([]);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);
  useEffect(() => {
    setActiveId(sessionId);
  }, [sessionId]);

  const active = state.conversations.find((c) => c.id === activeId) ?? null;

  const buildAIContext = (): AIContext => {
    const ctx: AIContext = { currentView: "chat", projectId: state.activeProjectId };
    if (attachedIds.length) ctx.selectedFiles = state.files.filter((f) => attachedIds.includes(f.id));
    if (active) ctx.selectedMessages = active.messages.slice(-6);
    return ctx;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && shouldAutoScroll.current) {
      el.scrollTop = el.scrollHeight;
      setShowJump(false);
    }
  }, [active?.messages.length, streaming]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const startGeneration = useCallback(
    (convoId: string, msgs: ChatMessage[], model: string) => {
      const token = ++tokenRef.current;
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      setIsGenerating(true);
      setError(null);
      setStreaming("");
      streamedRef.current = "";
      const started = Date.now();
      let acc = "";
      const ctxText = buildContextText(buildAIContext());
      const systemWithContext = ctxText ? `${settings.systemPrompt}\n\nWorkspace context:\n${ctxText.slice(0, 4000)}` : settings.systemPrompt;
      const srcLabel = attachedIds.length ? `Based on ${attachedIds.length} file(s)` : undefined;

      streamChat(
        msgs,
        {
          model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          systemPrompt: systemWithContext,
          streaming: settings.streaming,
          requestTimeout: settings.requestTimeout,
          debug: settings.debugLogging,
        },
        {
          onDelta: (d) => {
            acc += d;
            streamedRef.current = acc;
            setStreaming(acc);
          },
          onDone: () => {
            if (token !== tokenRef.current) return;
            const content = acc ? acc + (srcLabel ? `\n\n*${srcLabel}*` : "") : "…";
            setConversations(state.conversations.map((c) => (c.id === convoId ? { ...c, messages: [...c.messages, { id: uid(), role: "assistant", content }], updatedAt: Date.now() } : c)));
            setStreaming("");
            setIsGenerating(false);
            streamedRef.current = "";
          },
          onError: (err) => {
            if (token !== tokenRef.current) return;
            if (err.code === "aborted") return;
            setError(err);
            setStreaming("");
            setIsGenerating(false);
            if (acc) setConversations(state.conversations.map((c) => (c.id === convoId ? { ...c, messages: [...c.messages, { id: uid(), role: "assistant", content: acc, interrupted: true }], updatedAt: Date.now() } : c)));
          },
          signal: controller.signal,
        }
      );
    },
    [state.conversations, setConversations, settings, attachedIds]
  );

  const handleSend = (text: string) => {
    const content = text.trim();
    if (!content || isGenerating) return;
    setDraft("");
    let convo = active;
    if (!convo) {
      const nc: Conversation = { id: uid(), title: generateTitle(content), model: settings.model, createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
      setConversations([nc, ...state.conversations]);
      setActiveId(nc.id);
      onNewTitle?.(nc.id);
      convo = nc;
    }
    const userMessage: ChatMessage = { id: uid(), role: "user", content };
    const messages = [...convo.messages, userMessage];
    const updated: Conversation = {
      ...convo,
      title: convo.messages.length === 0 ? generateTitle(content) : convo.title,
      model: settings.model,
      updatedAt: Date.now(),
      messages,
    };
    setConversations(state.conversations.some((c) => c.id === updated.id) ? state.conversations.map((c) => (c.id === updated.id ? updated : c)) : [updated, ...state.conversations]);
    startGeneration(updated.id, messages, settings.model);
  };

  const handleStop = () => {
    tokenRef.current += 1;
    abortRef.current?.abort();
    const partial = streamedRef.current;
    if (partial && activeId) setConversations(state.conversations.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, { id: uid(), role: "assistant", content: partial, interrupted: true }], updatedAt: Date.now() } : c)));
    setIsGenerating(false);
    setStreaming("");
    streamedRef.current = "";
  };

  const handleRegenerate = () => {
    if (!active || isGenerating) return;
    const msgs = [...active.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    if (msgs.length === 0) return;
    setConversations(state.conversations.map((c) => (c.id === active.id ? { ...c, messages: msgs, updatedAt: Date.now() } : c)));
    startGeneration(active.id, msgs, settings.model);
  };

  const messages = active?.messages ?? [];
  const showStreaming = isGenerating && streaming.length > 0;

  // Empty state minimal
  if (!active || (messages.length === 0 && !isGenerating)) {
    return (
      <div className="flex h-full flex-col bg-[#121214]">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-[640px] text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
              <Sparkles size={16} className="text-zinc-400" />
            </div>
            <h1 className="text-sm font-medium text-zinc-100">New session</h1>
            <p className="mt-1 text-xs text-zinc-500">Ask anything. Attach files as context when needed. Tools are available when you need them.</p>
            <div className="mt-6 grid grid-cols-1 gap-2 text-left">
              {[
                "Summarize my project files and find TODOs.",
                "Search the workspace and explain what changed yesterday.",
                "Take these notes and create a structured plan.",
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setDraft(p)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-white/10"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Composer even on empty */}
        <Composer draft={draft} setDraft={setDraft} onSend={handleSend} onStop={handleStop} isGenerating={isGenerating} model={settings.model} attachedIds={attachedIds} setAttachedIds={setAttachedIds} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#121214]">
      <div ref={scrollRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-8">
          <div className="space-y-6">
            {messages.map((m, i) => (
              <div key={m.id ?? `${m.role}-${i}`} className={i !== 0 ? "border-t border-white/5 pt-6" : ""}>
                <MessageBubble
                  message={m}
                  isStreaming={isGenerating && i === messages.length - 1 && m.role === "assistant"}
                  isLast={i === messages.length - 1 && !isGenerating}
                  onRegenerate={m.role === "assistant" && i === messages.length - 1 ? handleRegenerate : undefined}
                  onRetry={m.role === "assistant" && i === messages.length - 1 ? handleRegenerate : undefined}
                  onEdit={
                    m.role === "user" && m.id
                      ? (nt) => {
                          const idx = active.messages.findIndex((x) => x.id === m.id);
                          if (idx === -1) return;
                          const msgs = [...active.messages.slice(0, idx), { id: m.id!, role: "user" as const, content: nt }];
                          setConversations(state.conversations.map((c) => (c.id === active.id ? { ...c, messages: msgs, updatedAt: Date.now() } : c)));
                          startGeneration(active.id, msgs, settings.model);
                        }
                      : undefined
                  }
                />
              </div>
            ))}
            {showStreaming && (
              <div className="border-t border-white/5 pt-6">
                <MessageBubble message={{ role: "assistant", content: streaming }} isStreaming isLast />
              </div>
            )}
            {isGenerating && !streaming && (
              <div className="flex items-center gap-3 border-t border-white/5 pt-6 text-xs text-zinc-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Thinking…
              </div>
            )}
            {error && <ErrorBanner error={error} onDismiss={() => setError(null)} onRetry={error.retryable ? handleRegenerate : undefined} />}
          </div>
        </div>
        {showJump && (
          <button
            onClick={() => {
              shouldAutoScroll.current = true;
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
              setShowJump(false);
            }}
            className="absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[#1a1a1e] px-3 py-1.5 text-xs text-zinc-300 shadow-lg"
          >
            <ArrowDown size={12} /> Jump to latest
          </button>
        )}
      </div>
      <Composer draft={draft} setDraft={setDraft} onSend={handleSend} onStop={handleStop} isGenerating={isGenerating} model={settings.model} attachedIds={attachedIds} setAttachedIds={setAttachedIds} />
    </div>
  );
}

function Composer({
  draft,
  setDraft,
  onSend,
  onStop,
  isGenerating,
  model,
  attachedIds,
  setAttachedIds,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSend: (t: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  model: string;
  attachedIds: string[];
  setAttachedIds: (v: string[]) => void;
}) {
  const { state } = useWorkspace();
  const canSend = draft.trim().length > 0 && !isGenerating;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [draft]);

  return (
    <div
      className="border-t border-white/10 bg-[#0f0f10] p-3"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) {
          // create local file entries as context only
          // For desktop minimal, we just keep names as pending attachments — user must have files in Files panel to select
          // Instead we prompt to import via Files
        }
      }}
    >
      <div className="mx-auto max-w-[720px]">
        {attachedIds.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {attachedIds.map((id) => {
              const f = state.files.find((x) => x.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300">
                  {f?.name ?? id}
                  <button onClick={() => setAttachedIds(attachedIds.filter((x) => x !== id))} className="ml-1 text-zinc-500 hover:text-zinc-200">
                    ×
                  </button>
                </span>
              );
            })}
            <button onClick={() => setAttachedIds([])} className="text-xs text-zinc-500 hover:text-zinc-300">
              clear
            </button>
          </div>
        )}
        {dragOver && <div className="mb-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Drop files to attach as context (file must exist in Files panel)</div>}
        <div className={`flex items-end gap-2 rounded-xl border bg-[#1a1a1e] px-3 py-2 ${dragOver ? "border-amber-500/50" : "border-white/10"}`}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (canSend) onSend(draft);
              }
            }}
            placeholder="Ask BananaRouter…"
            rows={1}
            className="max-h-[180px] min-h-[44px] flex-1 resize-none bg-transparent py-2 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          {isGenerating ? (
            <button onClick={onStop} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-white hover:bg-zinc-600">
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              disabled={!canSend}
              onClick={() => onSend(draft)}
              className={`flex h-8 w-8 items-center justify-center rounded-full ${canSend ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-white/10 text-zinc-500"}`}
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-2">
            <span className="hidden sm:inline">↵ send · ⇧↵ newline · drag files for context</span>
            {attachedIds.length > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">{attachedIds.length} attached</span>}
          </span>
          <span className="flex items-center gap-2">
            <span className="hidden sm:inline">{model === "openrouter/free" ? "Free Router" : model}</span>
            <span>{draft.length > 0 ? `${Math.ceil(draft.length / 4)} tokens` : ""}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
