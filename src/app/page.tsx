"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell, AppInfo } from "@/components/layout/AppShell";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { EnhancePromptDialog } from "@/components/chat/EnhancePromptDialog";
import { ApiError, AppDebugInfo, ChatMessage, Conversation } from "@/lib/shared/types";
import {
  clearConversations,
  conversationsToJson,
  conversationToJson,
  createConversation,
  deleteConversation,
  downloadText,
  getActiveConversationId,
  loadConversations,
  parseConversationsImport,
  saveConversations,
  setActiveConversationId,
  uid,
  updateConversation,
} from "@/lib/client/storage";
import {
  DEFAULT_SETTINGS,
  AppSettings,
  ThemeMode,
  loadSettings,
  saveSettings,
  loadTheme,
  applyTheme,
} from "@/lib/client/settings";
import {
  enhancePrompt,
  getSettingsStatus,
  saveSettingsToServer,
  streamChat,
} from "@/lib/client/api";
import { generateTitle, sanitizeFileName } from "@/lib/client/utils";

const DEFAULT_APP_INFO: AppInfo = {
  appName: "OpenRouter Chat",
  appDescription: "A modern AI chat dashboard powered by OpenRouter.",
  appVersion: "1.0.0",
};

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [appInfo, setAppInfo] = useState<AppInfo>(DEFAULT_APP_INFO);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [draft, setDraft] = useState("");
  const [enhancing, setEnhancing] = useState(false);
  const [enhancement, setEnhancement] = useState<{ original: string; enhanced: string } | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<AppDebugInfo | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const streamedContentRef = useRef("");
  const streamingConversationIdRef = useRef<string | null>(null);
  const generationTokenRef = useRef(0);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [stored, loadedSettings, loadedTheme] = await Promise.all([
        loadConversations(),
        Promise.resolve(loadSettings()),
        Promise.resolve(loadTheme()),
      ]);
      const status = await getSettingsStatus().catch(() => null);
      if (!mounted) return;
      hydratedRef.current = true;
      setConversations(stored);
      setSettings(loadedSettings);
      setTheme(loadedTheme);
      setAppInfo({
        appName: status?.appName ?? DEFAULT_APP_INFO.appName,
        appDescription: status?.appDescription ?? DEFAULT_APP_INFO.appDescription,
        appVersion: status?.appVersion ?? DEFAULT_APP_INFO.appVersion,
      });
      setActiveId(getActiveConversationId(stored));
      applyTheme(loadedTheme);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    void saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    setActiveConversationId(activeId);
  }, [activeId]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const commitAssistant = useCallback(
    (convoId: string, content: string, interrupted: boolean) => {
      const assistant: ChatMessage = {
        id: uid(),
        role: "assistant",
        content,
        interrupted,
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convoId
            ? { ...c, messages: [...c.messages, assistant], updatedAt: Date.now() }
            : c
        )
      );
    },
    []
  );

  const startGeneration = useCallback(
    (convoId: string, sendMessages: ChatMessage[], modelInput: string) => {
      const token = ++generationTokenRef.current;
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      streamingConversationIdRef.current = convoId;
      setIsGenerating(true);
      setError(null);
      setStreamingMessage("");
      streamedContentRef.current = "";

      const startedAt = Date.now();
      let accumulated = "";
      let usage: unknown;
      let lastStatus: number | undefined;

      void streamChat(
        sendMessages,
        {
          model: modelInput,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          systemPrompt: settings.systemPrompt,
          streaming: settings.streaming,
          requestTimeout: settings.requestTimeout,
          debug: settings.debugLogging,
        },
        {
          onDelta: (delta) => {
            accumulated += delta;
            streamedContentRef.current = accumulated;
            setStreamingMessage(accumulated);
          },
          onUsage: (u) => {
            usage = u;
          },
          onDone: () => {
            if (token !== generationTokenRef.current) return;
            commitAssistant(convoId, accumulated || "…", false);
            setStreamingMessage("");
            setIsGenerating(false);
            streamedContentRef.current = "";
            streamingConversationIdRef.current = null;
            setDebugInfo({
              enabled: settings.debugLogging,
              model: modelInput,
              durationMs: Date.now() - startedAt,
              status: 200,
              streaming: settings.streaming,
              tokenUsage: usage ? JSON.stringify(usage) : undefined,
            });
          },
          onError: (err) => {
            if (token !== generationTokenRef.current) return;
            if (err.code === "aborted") return;
            setError(err);
            setStreamingMessage("");
            setIsGenerating(false);
            if (accumulated) {
              commitAssistant(convoId, accumulated, true);
            }
            streamedContentRef.current = "";
            streamingConversationIdRef.current = null;
            setDebugInfo({
              enabled: settings.debugLogging,
              model: modelInput,
              durationMs: Date.now() - startedAt,
              status: err.status ?? lastStatus,
              streaming: settings.streaming,
              errorCode: err.code,
              errorCategory: err.category,
              partial: Boolean(accumulated),
            });
          },
          signal: controller.signal,
        }
      );
    },
    [commitAssistant, settings]
  );

  const handleNewChat = useCallback(() => {
    generationTokenRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setStreamingMessage("");
    setError(null);
    setDraft("");
    setEnhancement(null);
    setEnhanceError(null);
    setDebugInfo(null);
    const convo = createConversation();
    setConversations((prev) => [convo, ...prev]);
    setActiveId(convo.id);
    setSidebarOpen(false);
    streamedContentRef.current = "";
    streamingConversationIdRef.current = null;
    requestAnimationFrame(() => document.getElementById("chat-input")?.focus());
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      generationTokenRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setIsGenerating(false);
      setStreamingMessage("");
      setError(null);
      setDraft("");
      setEnhancement(null);
      streamedContentRef.current = "";
      streamingConversationIdRef.current = null;
      const convo = conversations.find((c) => c.id === id);
      if (convo?.model && convo.model !== settings.model) {
        const next = { ...settings, model: convo.model };
        setSettings(next);
        saveSettings(next);
      }
      setActiveId(id);
      setSidebarOpen(false);
      setDebugInfo(null);
    },
    [conversations, settings]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      const next = deleteConversation(conversations, id);
      setConversations(next);
      if (activeId === id) {
        const fallback = next[0] ?? null;
        setActiveId(fallback?.id ?? null);
        setStreamingMessage("");
        setIsGenerating(false);
        streamedContentRef.current = "";
        streamingConversationIdRef.current = null;
        if (fallback?.model) {
          const nextSettings = { ...settings, model: fallback.model };
          setSettings(nextSettings);
          saveSettings(nextSettings);
        }
      }
    },
    [conversations, activeId, settings]
  );

  const handleRenameConversation = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setConversations((prev) => updateConversation(prev, id, { title: trimmed }));
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || isGenerating) return;
      setDraft("");
      let convo = activeConversation;
      if (!convo) {
        convo = createConversation();
        setActiveId(convo.id);
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
      setConversations((prev) =>
        prev.some((c) => c.id === updated.id)
          ? prev.map((c) => (c.id === updated.id ? updated : c))
          : [updated, ...prev]
      );
      startGeneration(updated.id, messages, settings.model);
    },
    [activeConversation, isGenerating, settings.model, startGeneration]
  );

  const handleStop = useCallback(() => {
    generationTokenRef.current += 1;
    abortRef.current?.abort();
    const partial = streamedContentRef.current;
    const convoId = streamingConversationIdRef.current;
    if (partial && convoId) {
      commitAssistant(convoId, partial, true);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convoId ? { ...c, updatedAt: Date.now() } : c
        )
      );
    }
    setIsGenerating(false);
    setStreamingMessage("");
    setDraft("");
    streamedContentRef.current = "";
    streamingConversationIdRef.current = null;
  }, [commitAssistant]);

  const handleRegenerate = useCallback(() => {
    const convo = activeConversation;
    if (!convo || convo.messages.length === 0 || isGenerating) return;
    const msgs = [...convo.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") {
      msgs.pop();
    }
    if (msgs.length === 0) return;
    const updated = { ...convo, messages: msgs, updatedAt: Date.now() };
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    startGeneration(updated.id, msgs, settings.model);
  }, [activeConversation, isGenerating, settings.model, startGeneration]);

  const handleRetry = useCallback(() => {
    const convo = activeConversation;
    if (!convo || convo.messages.length === 0 || isGenerating) return;
    const msgs = [...convo.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") {
      msgs.pop();
    }
    if (msgs.length === 0) return;
    const updated = { ...convo, messages: msgs, updatedAt: Date.now() };
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    startGeneration(updated.id, msgs, settings.model);
  }, [activeConversation, isGenerating, settings.model, startGeneration]);

  const handleEditMessage = useCallback(
    (messageId: string, newText: string) => {
      const convo = activeConversation;
      if (!convo) return;
      const idx = convo.messages.findIndex(
        (m) => m.id === messageId && m.role === "user"
      );
      if (idx === -1) return;
      const edited: ChatMessage = { id: messageId, role: "user", content: newText };
      const messages = [...convo.messages.slice(0, idx), edited];
      const updated: Conversation = { ...convo, messages, updatedAt: Date.now() };
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      startGeneration(updated.id, messages, settings.model);
    },
    [activeConversation, settings.model, startGeneration]
  );

  const handleFeedback = useCallback((messageId: string, feedback: "up" | "down") => {
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => {
          if (m.id !== messageId) return m;
          return { ...m, feedback: m.feedback === feedback ? null : feedback };
        }),
        updatedAt: c.updatedAt,
      }))
    );
  }, []);

  const handleEnhance = useCallback(
    async (text: string) => {
      if (!text.trim() || isGenerating || enhancing) return;
      setEnhancing(true);
      setEnhanceError(null);
      try {
        const enhanced = await enhancePrompt(text.trim(), settings.model);
        setEnhancement({ original: text.trim(), enhanced });
      } catch (err) {
        setEnhanceError(
          err instanceof Error ? err.message : "Could not enhance the prompt."
        );
      } finally {
        setEnhancing(false);
      }
    },
    [isGenerating, enhancing, settings.model]
  );

  const handleSaveSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const handleModelChange = useCallback(
    (model: string) => {
      const next = { ...settings, model };
      setSettings(next);
      saveSettings(next);
      saveSettingsToServer({ model }).catch(() => undefined);
      if (activeConversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation.id ? { ...c, model } : c))
        );
      }
      setDebugInfo(null);
    },
    [settings, activeConversation]
  );

  const handleClearHistory = useCallback(() => {
    generationTokenRef.current += 1;
    abortRef.current?.abort();
    setConversations([]);
    void clearConversations();
    setActiveId(null);
    setStreamingMessage("");
    setIsGenerating(false);
    setError(null);
    setDebugInfo(null);
    streamedContentRef.current = "";
    streamingConversationIdRef.current = null;
  }, []);

  const handleClearAllLocalData = useCallback(() => {
    generationTokenRef.current += 1;
    abortRef.current?.abort();
    setIsGenerating(false);
    setStreamingMessage("");
    setError(null);
    setConversations([]);
    void clearConversations();
    setActiveId(null);
    localStorage.clear();
    setSettings(DEFAULT_SETTINGS);
    setTheme("system");
    applyTheme("system");
    setDraft("");
    setDebugInfo(null);
    streamedContentRef.current = "";
    streamingConversationIdRef.current = null;
  }, []);

  const handleExportCurrent = useCallback(() => {
    if (!activeConversation) return;
    downloadText(
      `${sanitizeFileName(activeConversation.title)}.json`,
      conversationToJson(activeConversation)
    );
  }, [activeConversation]);

  const handleExportAll = useCallback(() => {
    if (conversations.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    downloadText(
      `openrouter-chat-backup-${date}.json`,
      conversationsToJson(conversations)
    );
  }, [conversations]);

  const handleImport = useCallback(
    async (json: string): Promise<{ ok: boolean; error?: string }> => {
      const result = parseConversationsImport(json);
      if (!result.ok) return { ok: false, error: result.error };
      setConversations((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const additions = result.conversations.filter((c) => !existingIds.has(c.id));
        const merged = [...additions, ...prev].sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
        return merged;
      });
      if (result.conversations.length > 0) {
        setActiveId(result.conversations[0].id);
      }
      return { ok: true };
    },
    []
  );

  return (
    <>
      <AppShell
        conversations={conversations}
        activeId={activeId}
        activeModel={settings.model}
        settings={settings}
        theme={theme}
        appInfo={appInfo}
        onThemeChange={setTheme}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onClearHistory={handleClearHistory}
        onClearAllLocalData={handleClearAllLocalData}
        onSaveSettings={handleSaveSettings}
        onExportCurrent={handleExportCurrent}
        onExportAll={handleExportAll}
        onImport={handleImport}
      >
        <ChatPanel
          conversation={activeConversation}
          streamingMessage={streamingMessage}
          isGenerating={isGenerating}
          error={error}
          currentModel={settings.model}
          draft={draft}
          debugInfo={settings.debugLogging ? debugInfo : null}
          appName={appInfo.appName}
          onModelChange={handleModelChange}
          onDraftChange={setDraft}
          onSend={handleSend}
          onStop={handleStop}
          onRegenerate={handleRegenerate}
          onRetry={handleRetry}
          onEditMessage={handleEditMessage}
          onFeedback={handleFeedback}
          onEnhance={settings.enhancePrompt ? handleEnhance : async () => undefined}
          enhancing={enhancing}
          onNewChat={handleNewChat}
          onDismissError={() => setError(null)}
          disabled={false}
        />
      </AppShell>

      <EnhancePromptDialog
        open={enhancement !== null || (enhanceError !== null && !enhancement)}
        original={enhancement?.original ?? ""}
        enhanced={enhancement?.enhanced ?? null}
        loading={enhancing}
        error={enhanceError}
        onUse={() => {
          if (enhancement) {
            setDraft(enhancement.enhanced);
            setEnhancement(null);
            setEnhanceError(null);
            requestAnimationFrame(() => document.getElementById("chat-input")?.focus());
          }
        }}
        onKeepOriginal={() => {
          if (enhancement) {
            setDraft(enhancement.original);
            setEnhancement(null);
            setEnhanceError(null);
            requestAnimationFrame(() => document.getElementById("chat-input")?.focus());
          }
        }}
        onClose={() => {
          setEnhancement(null);
          setEnhanceError(null);
        }}
      />
    </>
  );
}
