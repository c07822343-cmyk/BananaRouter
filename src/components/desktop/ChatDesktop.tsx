"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/lib/workspace/context";
import { loadSettings } from "@/lib/client/settings";
import { DEFAULT_SETTINGS } from "@/lib/client/settings";
import { ApiError, ChatMessage, Conversation } from "@/lib/shared/types";
import { generateTitle } from "@/lib/client/utils";
import { uid } from "@/lib/client/storage";
import { streamChat } from "@/lib/client/api";
import { buildContextText } from "@/lib/ai/service";
import { AIContext } from "@/lib/workspace/types";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ErrorBanner } from "@/components/chat/ErrorBanner";
import { ArrowDown, Square, ArrowUp, Sparkles, Paperclip } from "lucide-react";

export function ChatDesktop({
  sessionId,
  onNewTitle,
  onOpenSessions,
  attachedIds: attachedIdsProp,
  setAttachedIds: setAttachedIdsProp,
}: {
  sessionId: string | null;
  onNewTitle?: (id: string) => void;
  onOpenSessions?: () => void;
  attachedIds?: string[];
  setAttachedIds?: (v: string[]) => void;
}) {
  const { state, setConversations } = useWorkspace();
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
  const [attachedIdsInternal, setAttachedIdsInternal] = useState<string[]>([]);
  const attachedIds = attachedIdsProp ?? attachedIdsInternal;
  const setAttachedIds = setAttachedIdsProp ?? setAttachedIdsInternal;

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
            window.dispatchEvent(new CustomEvent("bananarouter:request", { detail: { model, durationMs: Date.now() - Date.now(), status: 200, messageCount: msgs.length, inputSize: JSON.stringify(msgs).length, outputSize: acc.length, toolsAvailable: 8 } } as any));
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

  // --- Questioning dashboard: calm, human, one core action ---
  if (!active || (messages.length === 0 && !isGenerating)) {
    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return "Good morning";
      if (h < 18) return "Good afternoon";
      return "Good evening";
    })();
    const recent = [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
    const grouped = (() => {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startYesterday = startToday - 86400000;
      const today = recent.filter((c) => c.updatedAt >= startToday);
      const yesterday = recent.filter((c) => c.updatedAt >= startYesterday && c.updatedAt < startToday);
      const older = recent.filter((c) => c.updatedAt < startYesterday);
      return { today, yesterday, older };
    })();

    return (
      <div className="flex h-full flex-col overflow-y-auto bg-[#09090b]">
        <div className="flex flex-1 flex-col items-center px-4 py-10 md:py-16">
          <div className="w-full max-w-[680px]">
            {/* small identity */}
            <div className="mb-8 flex items-center gap-2 text-xs text-zinc-500">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
                <Sparkles size={12} className="text-zinc-400" />
              </span>
              <span className="font-medium tracking-tight text-zinc-300">BananaRouter</span>
              <span className="text-zinc-600">·</span>
              <span>{greeting}</span>
            </div>

            <h1 className="text-[26px] md:text-[30px] font-[380] tracking-tight text-zinc-100 leading-tight">What do you want to figure out?</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Ask anything — we’ll keep it simple.</p>

            {/* Big question box */}
            <div className="mt-6">
              <Composer draft={draft} setDraft={setDraft} onSend={handleSend} onStop={handleStop} isGenerating={isGenerating} model={settings.model} attachedIds={attachedIds} setAttachedIds={setAttachedIds} large />
            </div>

            {/* Subtle suggestions — natural language */}
            <div className="mt-4">
              <div className="text-xs text-zinc-500 mb-2">Try</div>
              <div className="flex flex-wrap gap-2">
                {["Explain this code in plain language", "Help me plan this project", "Analyze these files and find issues"].map((p) => (
                  <button key={p} onClick={() => setDraft(p)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition">
                    “{p}”
                  </button>
                ))}
              </div>
            </div>

            {/* Recent — minimal, underneath */}
            <div className="mt-10">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xs font-medium tracking-wide text-zinc-300">Recent</h2>
                {recent.length > 0 && onOpenSessions && (
                  <button onClick={onOpenSessions} className="text-xs text-zinc-500 hover:text-zinc-300">
                    See all
                  </button>
                )}
              </div>

              {recent.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
                  <p className="text-xs text-zinc-500">Nothing here yet — your questions will show up here.</p>
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  {grouped.today.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[11px] uppercase tracking-widest text-zinc-600">Today</div>
                      <div className="space-y-1">
                        {grouped.today.map((c) => (
                          <button key={c.id} onClick={() => onNewTitle?.(c.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/[0.05] transition">
                            <span className="flex-1 truncate text-sm text-zinc-300">{c.title || "Untitled question"}</span>
                            <span className="text-[11px] text-zinc-600">{new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {grouped.yesterday.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[11px] uppercase tracking-widest text-zinc-600">Yesterday</div>
                      <div className="space-y-1">
                        {grouped.yesterday.map((c) => (
                          <button key={c.id} onClick={() => onNewTitle?.(c.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/[0.05] transition">
                            <span className="flex-1 truncate text-sm text-zinc-300">{c.title || "Untitled question"}</span>
                            <span className="text-[11px] text-zinc-600">{new Date(c.updatedAt).toLocaleDateString()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {grouped.older.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[11px] uppercase tracking-widest text-zinc-600">Earlier</div>
                      <div className="space-y-1">
                        {grouped.older.map((c) => (
                          <button key={c.id} onClick={() => onNewTitle?.(c.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/[0.05] transition">
                            <span className="flex-1 truncate text-sm text-zinc-300">{c.title || "Untitled question"}</span>
                            <span className="text-[11px] text-zinc-600">{new Date(c.updatedAt).toLocaleDateString()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 text-center text-[11px] tracking-wide text-zinc-600">Private workspace · calm, fast, yours</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#09090b]">
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
  large,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSend: (t: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  model: string;
  attachedIds: string[];
  setAttachedIds: (v: string[]) => void;
  large?: boolean;
}) {
  const { state } = useWorkspace();
  const canSend = draft.trim().length > 0 && !isGenerating;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, large ? 160 : 180)}px`;
    }
  }, [draft, large]);

  return (
    <div
      className={large ? "" : "border-t border-white/10 bg-[#0f0f10] p-3"}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
    >
      <div className={`mx-auto ${large ? "max-w-none" : "max-w-[720px]"}`}>
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
        {dragOver && <div className="mb-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">Drop files to use as context</div>}
        <div className={`flex flex-col gap-2 rounded-2xl border bg-[#141416] px-3 py-3 ${dragOver ? "border-amber-500/50" : "border-white/10"} ${large ? "min-h-[110px] shadow-sm" : ""}`}>
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
            placeholder="Ask anything..."
            rows={large ? 3 : 1}
            className={`w-full resize-none bg-transparent text-[15px] leading-6 text-zinc-100 placeholder:text-zinc-500 outline-none ${large ? "min-h-[64px]" : "max-h-[180px] min-h-[44px]"}`}
          />
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
                <Paperclip size={12} /> Attach
              </span>
              <span className="hidden sm:inline">Shift+Enter for a new line</span>
            </span>
            {isGenerating ? (
              <button onClick={onStop} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-white hover:bg-zinc-600">
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button disabled={!canSend} onClick={() => onSend(draft)} className={`flex h-8 w-8 items-center justify-center rounded-full ${canSend ? "bg-white text-black hover:bg-zinc-200" : "bg-white/10 text-zinc-500"}`}>
                <ArrowUp size={14} />
              </button>
            )}
          </div>
        </div>
        {!large && (
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="hidden sm:inline">↵ send · ⇧↵ newline</span>
            <span>{model === "openrouter/free" ? "Free Router" : model}</span>
          </div>
        )}
      </div>
    </div>
  );
}
