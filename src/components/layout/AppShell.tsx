"use client";

import { useEffect } from "react";
import { Conversation } from "@/lib/shared/types";
import { AppSettings, ThemeMode } from "@/lib/client/settings";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SettingsModal } from "@/components/settings/SettingsModal";

export interface AppInfo {
  appName: string;
  appDescription: string;
  appVersion: string;
}

interface AppShellProps {
  children: React.ReactNode;
  conversations: Conversation[];
  activeId: string | null;
  activeModel: string | null;
  settings: AppSettings;
  theme: ThemeMode;
  appInfo: AppInfo;
  onThemeChange: (theme: ThemeMode) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onClearHistory: () => void;
  onClearAllLocalData: () => void;
  onSaveSettings: (settings: AppSettings) => void;
  onExportCurrent: () => void;
  onExportAll: () => void;
  onImport: (json: string) => Promise<{ ok: boolean; error?: string }>;
}

export function AppShell({
  children,
  conversations,
  activeId,
  activeModel,
  settings,
  theme,
  appInfo,
  onThemeChange,
  settingsOpen,
  setSettingsOpen,
  sidebarOpen,
  setSidebarOpen,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onClearHistory,
  onClearAllLocalData,
  onSaveSettings,
  onExportCurrent,
  onExportAll,
  onImport,
}: AppShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSidebarOpen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        appName={appInfo.appName}
        onClose={() => setSidebarOpen(false)}
        onNewChat={onNewChat}
        onSelect={onSelectConversation}
        onDelete={onDeleteConversation}
        onRename={onRenameConversation}
      />

      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          appName={appInfo.appName}
          activeModel={activeModel ?? settings.model}
          onMenu={() => setSidebarOpen(true)}
          onNewChat={onNewChat}
          onSettings={() => setSettingsOpen(true)}
        />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        theme={theme}
        appInfo={appInfo}
        onThemeChange={onThemeChange}
        onSave={onSaveSettings}
        onClose={() => setSettingsOpen(false)}
        onClearHistory={onClearHistory}
        onClearAllLocalData={onClearAllLocalData}
        onExportCurrent={onExportCurrent}
        onExportAll={onExportAll}
        onImport={onImport}
      />
    </div>
  );
}
