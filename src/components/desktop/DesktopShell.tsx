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
  const [attachedIds, setAttachedIds] = useState<string[]>([]); // shared file context

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

      {/* Desktop area — calm, centered questioning dashboard */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Central — calm, no chrome */}
        <div className="flex flex-1 flex-col min-h-0">
          <ChatDesktop
            sessionId={activeSession}
            onNewTitle={(id) => setActiveSession(id)}
            onOpenSessions={() => openWindow("sessions")}
            attachedIds={attachedIds}
            setAttachedIds={setAttachedIds}
          />
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
