"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useWorkspace } from "@/lib/workspace/context";
import { loadSettings, saveSettings, loadTheme, applyTheme } from "@/lib/client/settings";
import { AppSettings, DEFAULT_SETTINGS, ThemeMode } from "@/lib/client/settings";
import { ApiError, AppDebugInfo, ChatMessage, Conversation } from "@/lib/shared/types";
import { generateTitle } from "@/lib/client/utils";
import { uid } from "@/lib/client/storage";
import { streamChat } from "@/lib/client/api";
import { AIContext } from "@/lib/workspace/types";
import { buildContextText } from "@/lib/ai/service";
import { Sparkles, Paperclip, FileText, StickyNote } from "lucide-react";

export function ChatView() {
  const { state, setConversations, updateConversation, createDocument, createTask, createNote, addNotification } = useWorkspace();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [activeId, setActiveId] = useState<string | null>(state.conversations[0]?.id ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [draft, setDraft] = useState("");
  const [debugInfo, setDebugInfo] = useState<AppDebugInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamedRef = useRef("");
  const tokenRef = useRef(0);

  // attached context
  const [attachedIds, setAttachedIds] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setTheme(loadTheme());
    applyTheme(loadTheme());
  }, []);

  useEffect(() => {
    if (state.conversations.length > 0 && !activeId) setActiveId(state.conversations[0].id);
  }, [state.conversations, activeId]);

  const activeConv = state.conversations.find((c) => c.id === activeId) ?? null;

  const buildAIContext = (): AIContext => {
    const ctx: AIContext = { currentView: "chat", projectId: state.activeProjectId };
    if (attachedFiles.length) ctx.selectedFiles = state.files.filter((f) => attachedFiles.includes(f.id));
    // also include selected messages if needed
    if (activeConv) ctx.selectedMessages = activeConv.messages.slice(-6);
    return ctx;
  };

  const commitAssistant = useCallback((convoId: string, content: string, interrupted: boolean) => {
    const assistant: ChatMessage = { id: uid(), role: "assistant", content, interrupted };
    setConversations(state.conversations.map((c) => c.id === convoId ? { ...c, messages: [...c.messages, assistant], updatedAt: Date.now() } : c));
  }, [state.conversations, setConversations]);

  const startGeneration = useCallback((convoId: string, msgs: ChatMessage[], model: string) => {
    const token = ++tokenRef.current;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setIsGenerating(true);
    setError(null);
    setStreamingMessage("");
    streamedRef.current = "";
    const started = Date.now();
    let accumulated = "";
    // include context if attached
    const ctxText = buildContextText(buildAIContext());
    const systemWithContext = ctxText ? `${settings.systemPrompt}\n\nWorkspace context:\n${ctxText.slice(0, 4000)}` : settings.systemPrompt;
    const sourceLabel = attachedFiles.length ? `Based on ${attachedFiles.length} file(s)` : undefined;

    streamChat(msgs, { model, temperature: settings.temperature, maxTokens: settings.maxTokens, systemPrompt: systemWithContext, streaming: settings.streaming, requestTimeout: settings.requestTimeout, debug: settings.debugLogging },
      {
        onDelta: (d) => { accumulated += d; streamedRef.current = accumulated; setStreamingMessage(accumulated); },
        onDone: () => {
          if (token !== tokenRef.current) return;
          const content = accumulated ? accumulated + (sourceLabel ? `\n\n*${sourceLabel}*` : "") : "…";
          setConversations(state.conversations.map((c) => c.id === convoId ? { ...c, messages: [...c.messages, { id: uid(), role: "assistant", content }], updatedAt: Date.now() } : c));
          setStreamingMessage(""); setIsGenerating(false); streamedRef.current = "";
          setDebugInfo({ enabled: settings.debugLogging, model, durationMs: Date.now() - started, status: 200, streaming: settings.streaming });
        },
        onError: (err) => {
          if (token !== tokenRef.current) return;
          if (err.code === "aborted") return;
          setError(err); setStreamingMessage(""); setIsGenerating(false);
          if (accumulated) setConversations(state.conversations.map((c) => c.id === convoId ? { ...c, messages: [...c.messages, { id: uid(), role: "assistant", content: accumulated, interrupted: true }], updatedAt: Date.now() } : c));
          setDebugInfo({ enabled: settings.debugLogging, model, durationMs: Date.now() - started, status: err.status, streaming: settings.streaming, errorCode: err.code, errorCategory: err.category, partial: Boolean(accumulated) });
        },
        signal: controller.signal,
      });
  }, [state.conversations, setConversations, settings, attachedFiles]);

  const handleSend = useCallback((text: string) => {
    const content = text.trim();
    if (!content || isGenerating) return;
    setDraft("");
    let convo = activeConv;
    if (!convo) {
      const nc: Conversation = { id: uid(), title: generateTitle(content), model: settings.model, createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
      setConversations([nc, ...state.conversations]);
      setActiveId(nc.id);
      convo = nc;
    }
    const userMessage: ChatMessage = { id: uid(), role: "user", content };
    const messages = [...convo.messages, userMessage];
    const updated: Conversation = { ...convo, title: convo.messages.length === 0 ? generateTitle(content) : convo.title, model: settings.model, updatedAt: Date.now(), messages };
    setConversations(state.conversations.some((c) => c.id === updated.id) ? state.conversations.map((c) => c.id === updated.id ? updated : c) : [updated, ...state.conversations]);
    startGeneration(updated.id, messages, settings.model);
  }, [activeConv, isGenerating, settings.model, startGeneration, state.conversations, setConversations]);

  const handleStop = useCallback(() => {
    tokenRef.current += 1;
    abortRef.current?.abort();
    const partial = streamedRef.current;
    if (partial && activeId) {
      setConversations(state.conversations.map((c) => c.id === activeId ? { ...c, messages: [...c.messages, { id: uid(), role: "assistant", content: partial, interrupted: true }], updatedAt: Date.now() } : c));
    }
    setIsGenerating(false); setStreamingMessage(""); streamedRef.current = "";
  }, [activeId, state.conversations, setConversations]);

  const handleRegenerate = useCallback(() => {
    if (!activeConv || isGenerating) return;
    const msgs = [...activeConv.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    if (msgs.length === 0) return;
    setConversations(state.conversations.map((c) => c.id === activeConv.id ? { ...c, messages: msgs, updatedAt: Date.now() } : c));
    startGeneration(activeConv.id, msgs, settings.model);
  }, [activeConv, isGenerating, settings.model, startGeneration, state.conversations, setConversations]);

  const handleNewChat = useCallback(() => {
    tokenRef.current += 1;
    abortRef.current?.abort();
    setIsGenerating(false); setStreamingMessage(""); setError(null); setDraft(""); setDebugInfo(null);
    const convo: Conversation = { id: uid(), title: "New conversation", model: settings.model, createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
    setConversations([convo, ...state.conversations]);
    setActiveId(convo.id);
    streamedRef.current = "";
  }, [settings.model, setConversations, state.conversations]);

  // cross-app workflows
  const lastAssistant = activeConv?.messages.filter((m) => m.role === "assistant").slice(-1)[0];
  const handleCreateDocFromChat = () => {
    const content = lastAssistant?.content ?? activeConv?.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n").slice(0, 8000) ?? "";
    if (!content) { addNotification({ title: "No chat content", message: "Start a conversation first.", type: "warning" }); return; }
    const doc = createDocument(activeConv?.title || "From chat", content);
    addNotification({ title: "Chat → Document", message: `Created "${doc.title}".`, type: "success" });
  };
  const handleCreateTasksFromChat = () => {
    const content = lastAssistant?.content ?? "";
    if (!content) return;
    // simple line split
    const lines = content.split("\n").filter((l) => l.trim().length > 10).slice(0, 6);
    lines.forEach((l) => createTask(l.replace(/^[-*]\s*/, "").slice(0, 80)));
    addNotification({ title: "Chat → Tasks", message: `${lines.length} tasks created.`, type: "success" });
  };

  // need to keep conversations in sync: when state.conversations changes from external, ensure activeId still valid
  useEffect(() => {
    if (activeId && !state.conversations.find((c) => c.id === activeId)) {
      setActiveId(state.conversations[0]?.id ?? null);
    }
  }, [state.conversations, activeId]);

  return (
    <div className="flex h-full flex-col">
      {/* context bar */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-[#f8f9fa] px-3 py-2 text-xs dark:bg-[#303134]">
        <span className="flex items-center gap-1 font-medium"><Sparkles size={12} className="text-[#b45309]" /> Chat with context:</span>
        {state.files.slice(0, 4).map((f) => (
          <label key={f.id} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 ${attachedFiles.includes(f.id) ? "bg-[#FFFBEB] text-[#b45309]" : "bg-white"}`}>
            <input type="checkbox" checked={attachedFiles.includes(f.id)} onChange={() => setAttachedFiles((prev) => prev.includes(f.id) ? prev.filter((x) => x !== f.id) : [...prev, f.id])} />
            <Paperclip size={10} /> {f.name.slice(0, 14)}
          </label>
        ))}
        <span className="text-[11px] text-[hsl(var(--muted-foreground))]" title="Only selected files are sent to OpenRouter">Only selected files sent</span>
        <div className="ml-auto flex gap-1">
          <button onClick={handleCreateDocFromChat} className="rounded-full bg-white px-3 py-1 shadow"><FileText size={12} className="inline" /> Create document</button>
          <button onClick={handleCreateTasksFromChat} className="rounded-full bg-white px-3 py-1 shadow">Create tasks</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* conversation list */}
        <div className="hidden w-[300px] shrink-0 flex-col border-r bg-[#f8f9fa] dark:bg-[#202124] md:flex">
          <div className="p-3">
            <button onClick={handleNewChat} className="w-full rounded-full bg-[#b45309] py-2 text-sm font-medium text-white">New chat</button>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            {state.conversations.map((c) => (
              <button key={c.id} onClick={() => setActiveId(c.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left ${activeId === c.id ? "bg-white shadow dark:bg-[#303134]" : "hover:bg-white"}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.title || "New conversation"}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{c.messages.length} messages</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* main chat */}
        <div className="flex min-w-0 flex-1 flex-col">
          <ChatPanel
            conversation={activeConv}
            streamingMessage={streamingMessage}
            isGenerating={isGenerating}
            error={error}
            currentModel={settings.model}
            draft={draft}
            debugInfo={settings.debugLogging ? debugInfo : null}
            appName="BananaRouter"
            onModelChange={(m) => { const next = { ...settings, model: m }; setSettings(next); saveSettings(next); }}
            onDraftChange={setDraft}
            onSend={handleSend}
            onStop={handleStop}
            onRegenerate={handleRegenerate}
            onRetry={handleRegenerate}
            onEditMessage={(id, newText) => {
              if (!activeConv) return;
              const idx = activeConv.messages.findIndex((mm) => mm.id === id);
              if (idx === -1) return;
              const msgs = [...activeConv.messages.slice(0, idx), { id, role: "user" as const, content: newText }];
              setConversations(state.conversations.map((c) => c.id === activeConv.id ? { ...c, messages: msgs, updatedAt: Date.now() } : c));
              startGeneration(activeConv.id, msgs, settings.model);
            }}
            onFeedback={() => {}}
            onEnhance={async () => {}}
            enhancing={false}
            onNewChat={handleNewChat}
            onDismissError={() => setError(null)}
          />
        </div>
      </div>
    </div>
  );
}
