"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { DesktopBackground } from "./DesktopBackground";
import { TopSystemBar } from "./TopSystemBar";
import { Launcher } from "./Launcher";
import { DesktopWindow } from "./DesktopWindow";
import { ChatDesktop } from "./ChatDesktop";
import { SessionsPanel } from "@/components/panels/SessionsPanel";
import { FilesPanel } from "@/components/panels/FilesPanel";
import { ToolExplorer } from "@/components/panels/ToolExplorer";
import { MCPPanel } from "@/components/panels/MCPPanel";
import { SettingsDesktop } from "@/components/panels/SettingsDesktop";
import { ApprovalDialog } from "./ApprovalDialog";
import { useWorkspace } from "@/lib/workspace/context";
import { loadSettings } from "@/lib/client/settings";
import { MessageSquare, Files, Wrench, Boxes, Settings, History, Command, HardDrive } from "lucide-react";
import { loadMcpServers } from "@/lib/mcp/manager";
import { getToolRegistry, loadToolState } from "@/lib/tools/registry";

type WindowId = "sessions" | "files" | "tools" | "mcp" | "settings" | "dev";

export function DesktopShell() {
  const { state, addNotification } = useWorkspace();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [model, setModel] = useState("openrouter/free");
  const [activeSession, setActiveSession] = useState<string | null>(state.conversations[0]?.id ?? null);
  const [windows, setWindows] = useState<Record<WindowId, boolean>>({ sessions: false, files: false, tools: false, mcp: false, settings: false, dev: false });
  const [focused, setFocused] = useState<WindowId | null>(null);
  const [connection, setConnection] = useState<"connected" | "offline" | "checking">("checking");
  const [attachedIds, setAttachedIds] = useState<string[]>([]);

  useEffect(() => {
    const s = loadSettings();
    setModel(s.model);
    loadToolState();
    // connection check
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => setConnection(j.apiKeyConfigured ? "connected" : "offline"))
      .catch(() => setConnection("offline"));
  }, []);

  useEffect(() => {
    if (state.conversations.length > 0 && !activeSession) setActiveSession(state.conversations[0].id);
  }, [state.conversations, activeSession]);

  // shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === "Space") {
        e.preventDefault();
        setLauncherOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLauncherOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewSession();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        openWindow("settings");
      }
      if (e.key === "Escape") {
        setLauncherOpen(false);
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openWindow = (id: WindowId) => {
    setWindows((prev) => ({ ...prev, [id]: true }));
    setFocused(id);
  };
  const closeWindow = (id: WindowId) => {
    setWindows((prev) => ({ ...prev, [id]: false }));
    if (focused === id) setFocused(null);
  };

  const handleNewSession = () => {
    // let ChatDesktop create via empty session handling; we just clear activeSession and let it create on send
    setActiveSession(null);
  };

  const handleOpenSession = (id: string) => {
    setActiveSession(id);
    closeWindow("sessions");
  };

  const windowTitle = useMemo(() => {
    if (focused) {
      const map: Record<WindowId, string> = { sessions: "Sessions", files: "Files", tools: "Tool Explorer", mcp: "MCP Servers", settings: "Settings", dev: "Developer" };
      return map[focused];
    }
    const active = state.conversations.find((c) => c.id === activeSession);
    return active ? active.title || "New session" : "BananaRouter — AI Workspace";
  }, [focused, activeSession, state.conversations]);

  // zIndex order
  const order: WindowId[] = ["sessions", "files", "tools", "mcp", "settings"];
  const getZ = (id: WindowId) => (focused === id ? 50 : 40 + order.indexOf(id));

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#09090b] text-zinc-100 selection:bg-amber-400/30">
      <DesktopBackground />
      <TopSystemBar
        windowTitle={windowTitle}
        model={model}
        onOpenLauncher={() => setLauncherOpen(true)}
        onOpenSettings={() => openWindow("settings")}
        onOpenCommand={() => setLauncherOpen(true)}
        connectionStatus={connection}
      />

      {/* Desktop area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Central AI workspace — takes most space, window-like but not floating */}
        <div className="flex flex-1 flex-col p-2 md:p-3 gap-2">
          <div className="flex flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#121214] shadow-xl">
            <div className="flex flex-1 flex-col">
              {/* subtle header for chat */}
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/5 bg-white/[0.02] px-3 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <MessageSquare size={12} /> AI Workspace
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <button onClick={() => openWindow("sessions")} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10">
                    Sessions
                  </button>
                  <button onClick={() => openWindow("files")} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10">
                    Files
                  </button>
                  <button onClick={() => openWindow("tools")} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10">
                    Tools
                  </button>
                  <button onClick={handleNewSession} className="rounded-full bg-white text-black px-2.5 py-1 text-xs font-medium hover:bg-zinc-200">
                    New session
                  </button>
                </span>
              </div>
              <ChatDesktop sessionId={activeSession} onNewTitle={(id) => setActiveSession(id)} />
            </div>
          </div>
          {/* subtle footer status */}
          <div className="hidden md:flex items-center justify-between px-2 text-[11px] text-zinc-500">
            <span>90% content · 8% controls · 2% branding · {state.conversations.length} sessions · {state.files.length} files · {getToolRegistry().length} tools</span>
            <span>
              {attachedIds.length > 0 ? `${attachedIds.length} file(s) attached as context` : "Only selected context is sent to OpenRouter"}
            </span>
          </div>
        </div>

        {/* Floating windows */}
        {windows.sessions && (
          <DesktopWindow config={{ id: "sessions", title: "Sessions", icon: <History size={12} />, defaultWidth: 360, defaultHeight: 520 }} focused={focused === "sessions"} zIndex={getZ("sessions")} initialX={20} initialY={60} onFocus={() => setFocused("sessions")} onClose={() => closeWindow("sessions")}>
            <SessionsPanel activeId={activeSession} onOpenSession={handleOpenSession} />
          </DesktopWindow>
        )}
        {windows.files && (
          <DesktopWindow config={{ id: "files", title: "Files", icon: <Files size={12} />, defaultWidth: 420, defaultHeight: 500 }} focused={focused === "files"} zIndex={getZ("files")} initialX={80} initialY={100} onFocus={() => setFocused("files")} onClose={() => closeWindow("files")}>
            <FilesPanel
              onAttach={(id) => {
                setAttachedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                addNotification({ title: "File attached", message: "File will be sent as context on next message.", type: "info" });
              }}
            />
          </DesktopWindow>
        )}
        {windows.tools && (
          <DesktopWindow config={{ id: "tools", title: "Tool Explorer", icon: <Wrench size={12} />, defaultWidth: 520, defaultHeight: 560 }} focused={focused === "tools"} zIndex={getZ("tools")} initialX={140} initialY={80} onFocus={() => setFocused("tools")} onClose={() => closeWindow("tools")}>
            <ToolExplorer />
          </DesktopWindow>
        )}
        {windows.mcp && (
          <DesktopWindow config={{ id: "mcp", title: "MCP Servers", icon: <Boxes size={12} />, defaultWidth: 520, defaultHeight: 520 }} focused={focused === "mcp"} zIndex={getZ("mcp")} initialX={200} initialY={120} onFocus={() => setFocused("mcp")} onClose={() => closeWindow("mcp")}>
            <MCPPanel />
          </DesktopWindow>
        )}
        {windows.settings && (
          <DesktopWindow config={{ id: "settings", title: "Settings", icon: <Settings size={12} />, defaultWidth: 720, defaultHeight: 560 }} focused={focused === "settings"} zIndex={getZ("settings")} initialX={100} initialY={60} onFocus={() => setFocused("settings")} onClose={() => closeWindow("settings")}>
            <SettingsDesktop />
          </DesktopWindow>
        )}
      </div>

      {/* Launcher */}
      <Launcher
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        onOpen={(id) => {
          if (id === "chat") handleNewSession();
          else if (id === "files") openWindow("files");
          else if (id === "tools") openWindow("tools");
          else if (id === "mcp") openWindow("mcp");
          else if (id === "sessions") openWindow("sessions");
          else if (id === "settings") openWindow("settings");
        }}
      />

      {/* Command palette minimal */}
      {commandOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-[20vh]" onClick={() => setCommandOpen(false)}>
          <div className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-2">
              {[
                { label: "New session", action: () => { handleNewSession(); setCommandOpen(false); } },
                { label: "Open Files", action: () => { openWindow("files"); setCommandOpen(false); } },
                { label: "Open Tools", action: () => { openWindow("tools"); setCommandOpen(false); } },
                { label: "Open MCP", action: () => { openWindow("mcp"); setCommandOpen(false); } },
                { label: "Open Settings", action: () => { openWindow("settings"); setCommandOpen(false); } },
                { label: "Switch Model", action: () => { openWindow("settings"); setCommandOpen(false); } },
                { label: "Toggle Theme", action: () => setCommandOpen(false) },
                { label: "Developer Mode", action: () => { openWindow("settings"); setCommandOpen(false); } },
              ].map((c) => (
                <button key={c.label} onClick={c.action} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10">
                  <Command size={14} className="text-zinc-500" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global shortcuts hint - discrete */}
      <div className="pointer-events-none fixed bottom-2 right-2 hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1a1e] px-3 py-1 text-[11px] text-zinc-500">
        <span>⌘ Space launcher</span>
        <span>·</span>
        <span>⌘ K search</span>
        <span>·</span>
        <span>⌘ N new</span>
      </div>
    </div>
  );
}
