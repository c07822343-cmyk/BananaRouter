"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Conversation, ChatMessage, ApiError } from "@/lib/shared/types";
import {
  loadConversations,
  saveConversations,
  deleteConversation,
  createConversation,
  updateConversation,
  getActiveConversationId,
  setActiveConversationId,
  clearConversations,
} from "@/lib/client/storage";
import {
  loadSettings,
  saveSettings,
  loadTheme,
  applyTheme,
  DEFAULT_SETTINGS,
  AppSettings,
} from "@/lib/client/settings";
import { streamChat, saveSettingsToServer } from "@/lib/client/api";
import { generateTitle } from "@/lib/client/utils";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamedContentRef = useRef("");
  const streamingConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = loadConversations();
    const loadedSettings = loadSettings();
    const loadedTheme = loadTheme();
    setConversations(stored);
    setSettings(loadedSettings);
    setTheme(loadedTheme);
    const active = getActiveConversationId(stored);
    setActiveId(active);
    applyTheme(loadedTheme);
  }, []);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    setActiveConversationId(activeId);
  }, [activeId]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setStreamingMessage("");
    const convo = createConversation();
    setConversations((prev) => [convo, ...prev]);
    setActiveId(convo.id);
    setActiveModel(DEFAULT_SETTINGS.model);
    setSidebarOpen(false);
    setError(null);
    streamedContentRef.current = "";
    streamingConversationIdRef.current = null;
    requestAnimationFrame(() => {
      document.getElementById("chat-input")?.focus();
    });
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (isGenerating) {
        abortRef.current?.abort();
        setIsGenerating(false);
        setStreamingMessage("");
        streamedContentRef.current = "";
        streamingConversationIdRef.current = null;
      }
      setActiveId(id);
      setActiveModel(conversations.find((c) => c.id === id)?.model ?? settings.model ?? null);
      setSidebarOpen(false);
    },
    [conversations, isGenerating, settings.model]
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      const next = deleteConversation(conversations, id);
      setConversations(next);
      if (activeId === id) {
        const fallback = next[0] ?? null;
        setActiveId(fallback?.id ?? null);
        setActiveModel(fallback?.model ?? settings.model ?? null);
        setStreamingMessage("");
        setIsGenerating(false);
        streamedContentRef.current = "";
        streamingConversationIdRef.current = null;
      }
    },
    [conversations, activeId, settings.model]
  );

  const handleRenameConversation = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setConversations((prev) => updateConversation(prev, id, { title: trimmed }));
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isGenerating) return;

      let convoId = activeId;
      let convo = conversations.find((c) => c.id === convoId);

      if (!convo) {
        convo = createConversation();
        convoId = convo.id;
        setConversations((prev) => [convo!, ...prev]);
        setActiveId(convoId);
      }

      const userMessage: ChatMessage = { role: "user", content };

      let title = convo.title;
      if (convo.messages.length === 0) {
        title = generateTitle(content);
      }

      const updated: Conversation = {
        ...convo,
        title,
        model: settings.model,
        updatedAt: Date.now(),
        messages: [...convo.messages, userMessage],
      };

      setConversations((prev) =>
        prev.map((c) => (c.id === convoId ? updated : c))
      );

      const modelInput = settings.model;
      setActiveModel(modelInput);
      setIsGenerating(true);
      setError(null);
      setStreamingMessage("");

      const controller = new AbortController();
      abortRef.current = controller;
      streamingConversationIdRef.current = convoId;

      let accumulated = "";
      streamedContentRef.current = "";
      try {
        await streamChat(
          updated.messages,
          {
            model: modelInput,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            systemPrompt: settings.systemPrompt,
            streaming: settings.streaming,
          },
          {
            onDelta: (delta) => {
              accumulated += delta;
              streamedContentRef.current = accumulated;
              setStreamingMessage(accumulated);
            },
            onDone: () => {
              const finalMessage: ChatMessage = {
                role: "assistant",
                content: accumulated || "…",
              };
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === convoId
                    ? {
                        ...c,
                        messages: [...c.messages, finalMessage],
                        updatedAt: Date.now(),
                      }
                    : c
                )
              );
              setStreamingMessage("");
              setIsGenerating(false);
              streamedContentRef.current = "";
              streamingConversationIdRef.current = null;
            },
            onError: (err) => {
              setError(err);
              setIsGenerating(false);
              setStreamingMessage("");
              if (accumulated) {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === convoId
                      ? {
                          ...c,
                          messages: [
                            ...c.messages,
                            { role: "assistant", content: accumulated },
                          ],
                          updatedAt: Date.now(),
                        }
                      : c
                  )
                );
              }
              streamedContentRef.current = "";
              streamingConversationIdRef.current = null;
            },
            signal: controller.signal,
          }
        );
      } catch (err) {
        const apiError: ApiError =
          err && typeof err === "object" && "code" in (err as object)
            ? (err as ApiError)
            : {
                code: "unknown",
                message:
                  err instanceof Error
                    ? err.message
                    : "An unexpected error occurred.",
                detail: err instanceof Error ? err.message : String(err),
              };
        setError(apiError);
        setIsGenerating(false);
        setStreamingMessage("");
      }
    },
    [activeId, conversations, isGenerating, settings]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    const partial = streamedContentRef.current;
    const convoId = streamingConversationIdRef.current;
    if (partial && convoId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convoId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  { role: "assistant", content: partial },
                ],
                updatedAt: Date.now(),
              }
            : c
        )
      );
    }
    setIsGenerating(false);
    setStreamingMessage("");
    streamedContentRef.current = "";
    streamingConversationIdRef.current = null;
  }, []);

  const handleRegenerate = useCallback(() => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const msgs = [...activeConversation.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") {
      msgs.pop();
    }
    if (msgs.length === 0) return;
    const updated = {
      ...activeConversation,
      messages: msgs,
      updatedAt: Date.now(),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );

    setIsGenerating(true);
    setError(null);
    setStreamingMessage("");
    const controller = new AbortController();
    abortRef.current = controller;
    streamingConversationIdRef.current = updated.id;

    let accumulated = "";
    streamedContentRef.current = "";
    streamChat(
      msgs,
      {
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: settings.systemPrompt,
        streaming: settings.streaming,
      },
      {
        onDelta: (delta) => {
          accumulated += delta;
          streamedContentRef.current = accumulated;
          setStreamingMessage(accumulated);
        },
        onDone: () => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === updated.id
                ? {
                    ...c,
                    messages: [
                      ...c.messages,
                      { role: "assistant", content: accumulated || "…" },
                    ],
                    updatedAt: Date.now(),
                  }
                : c
            )
          );
          setStreamingMessage("");
          setIsGenerating(false);
          streamedContentRef.current = "";
          streamingConversationIdRef.current = null;
        },
        onError: (err) => {
          setError(err);
          setIsGenerating(false);
          setStreamingMessage("");
          streamedContentRef.current = "";
          streamingConversationIdRef.current = null;
        },
        signal: controller.signal,
      }
    );
  }, [activeConversation, settings]);

  const handleSaveSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const handleModelChange = useCallback(
    (model: string) => {
      setActiveModel(model);
      const next = { ...settings, model };
      setSettings(next);
      saveSettings(next);
      saveSettingsToServer({ model }).catch(() => {
        // Best effort; the chat request also sends the model explicitly.
      });
    },
    [settings]
  );

  const handleClearHistory = useCallback(() => {
    const next = clearConversations();
    setConversations(next);
    setActiveId(null);
    setActiveModel(settings.model);
    abortRef.current?.abort();
    setIsGenerating(false);
    setStreamingMessage("");
    setError(null);
    streamedContentRef.current = "";
    streamingConversationIdRef.current = null;
  }, [settings.model]);

  const handleClearAllLocalData = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setStreamingMessage("");
    setError(null);
    setConversations(clearConversations());
    setActiveId(null);
    localStorage.clear();
    setSettings(DEFAULT_SETTINGS);
    setTheme("system");
    applyTheme("system");
    streamedContentRef.current = "";
    streamingConversationIdRef.current = null;
  }, []);

  return (
    <AppShell
      conversations={conversations}
      activeId={activeId}
      activeModel={activeModel}
      settings={settings}
      theme={theme}
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
    >
      <ChatPanel
        conversation={activeConversation}
        streamingMessage={streamingMessage}
        isGenerating={isGenerating}
        error={error}
        currentModel={settings.model}
        onModelChange={handleModelChange}
        onSend={handleSend}
        onStop={handleStop}
        onRegenerate={handleRegenerate}
        onDismissError={() => setError(null)}
        disabled={false}
        onNewChat={handleNewChat}
      />
    </AppShell>
  );
}
