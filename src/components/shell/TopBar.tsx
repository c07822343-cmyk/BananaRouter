"use client";

import { Search, Command, Bell, HelpCircle, Settings, Menu, User } from "lucide-react";
import { BananaLogo } from "@/components/branding/BananaLogo";

export function TopBar({
  appName,
  searchQuery,
  onSearchQueryChange,
  onSearchFocus,
  onCommandOpen,
  onMenu,
  onSettings,
  onHelp,
  saving,
  lastSavedAt,
  notificationCount,
  onNotifications,
}: {
  appName: string;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  onSearchFocus: () => void;
  onCommandOpen: () => void;
  onMenu: () => void;
  onSettings: () => void;
  onHelp?: () => void;
  saving: boolean;
  lastSavedAt: number | null;
  notificationCount: number;
  onNotifications: () => void;
}) {
  return (
    <header className="flex h-[56px] shrink-0 items-center gap-3 border-b border-[hsl(var(--border))] bg-white px-3 dark:bg-[#1a1a1e] md:px-4 sticky top-0 z-20">
      <button onClick={onMenu} className="rounded-xl p-2 hover:bg-[hsl(var(--muted))] md:hidden" aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2.5">
        <span className="hidden md:flex">
          <BananaLogo size={32} withWordmark />
        </span>
        <span className="flex md:hidden">
          <BananaLogo size={28} />
        </span>
        {/* subtle powered-by, not main brand */}
        <span className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[11px] font-medium text-[#92400e] dark:border-[#78350f] dark:bg-[#2a2210] dark:text-[#fcd34d]">
          Powered by OpenRouter
        </span>
      </div>

      {/* Center search – clean, fast */}
      <div className="mx-2 hidden flex-1 justify-center md:flex">
        <div className="relative flex w-full max-w-[720px] items-center">
          <Search size={16} className="pointer-events-none absolute left-3.5 text-[hsl(var(--muted-foreground))]" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onFocus={onSearchFocus}
            placeholder="Search in workspace · chats, docs, files, notes…"
            className="h-[40px] w-full rounded-full bg-[#f8f7f5] py-2 pl-10 pr-[84px] text-[14px] placeholder:text-[hsl(var(--muted-foreground))] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F6C446]/50 focus:border-[#F6C446] border border-transparent shadow-sm transition dark:bg-[#252529] dark:focus:bg-[#2a2a2e]"
            aria-label="Global search"
          />
          <button
            onClick={onCommandOpen}
            className="absolute right-1.5 flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] shadow-sm ring-1 ring-[hsl(var(--border))] hover:bg-[#FFFBEB] dark:bg-[#3c4043] dark:hover:bg-[#3a3320]"
            title="Command palette (Ctrl+K)"
            aria-label="Open command palette"
          >
            <Command size={12} /> K
          </button>
        </div>
      </div>

      {/* Mobile search button */}
      <button
        onClick={onSearchFocus}
        className="ml-auto rounded-full bg-[#f8f7f5] p-2.5 text-[hsl(var(--muted-foreground))] dark:bg-[#252529] md:hidden"
        aria-label="Search"
      >
        <Search size={18} />
      </button>

      <div className="hidden items-center gap-1 md:flex">
        <div className="mr-2 hidden flex-col items-end leading-none lg:flex min-w-[72px]">
          <span className={`text-[11px] font-medium ${saving ? "text-[#b45309]" : "text-[hsl(var(--muted-foreground))]"}`}>
            {saving ? "Saving…" : lastSavedAt ? "Saved" : "Offline ready"}
          </span>
          {lastSavedAt && !saving && (
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {new Date(lastSavedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button onClick={onHelp} className="rounded-full p-2 hover:bg-[hsl(var(--muted))] transition" aria-label="Help">
          <HelpCircle size={20} className="text-[hsl(var(--muted-foreground))]" />
        </button>
        <button onClick={onSettings} className="rounded-full p-2 hover:bg-[hsl(var(--muted))] transition" aria-label="Settings">
          <Settings size={20} className="text-[hsl(var(--muted-foreground))]" />
        </button>
        <button onClick={onNotifications} className="relative rounded-full p-2 hover:bg-[hsl(var(--muted))] transition" aria-label="Notifications">
          <Bell size={20} className="text-[hsl(var(--muted-foreground))]" />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#e11d48] ring-2 ring-white dark:ring-[#1a1a1e]" />
          )}
        </button>
        <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#F6C446] text-sm font-semibold text-[#1a1a1a] shadow-sm">B</div>
      </div>

      {/* Mobile right icons */}
      <div className="flex items-center gap-1 md:hidden">
        <button onClick={onNotifications} className="relative rounded-full p-2 hover:bg-[hsl(var(--muted))]">
          <Bell size={18} />
          {notificationCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#e11d48]" />}
        </button>
        <button onClick={onSettings} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
