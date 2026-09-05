"use client";

import { Search, Command, Bell, HelpCircle, Settings, Menu, Sparkles, User } from "lucide-react";
import { useState } from "react";

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
    <header className="flex h-[56px] shrink-0 items-center gap-3 border-b border-[hsl(var(--border))] bg-white px-3 dark:bg-[#202124] md:px-4">
      <button onClick={onMenu} className="rounded-full p-2 hover:bg-[hsl(var(--muted))] md:hidden" aria-label="Open menu">
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-3">
        <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-[#1a73e8] text-white md:flex">
          <Sparkles size={16} />
        </div>
        <span className="hidden text-[15px] font-medium md:block">{appName}</span>
      </div>

      <div className="mx-2 hidden flex-1 justify-center md:flex">
        <div className="relative flex w-full max-w-[720px] items-center">
          <Search size={16} className="pointer-events-none absolute left-3 text-[hsl(var(--muted-foreground))]" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onFocus={onSearchFocus}
            placeholder="Search in workspace (chats, docs, files, notes...)"
            className="h-10 w-full rounded-full bg-[#f1f3f4] py-2 pl-10 pr-24 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:bg-white focus:shadow-md focus:outline-none focus:ring-1 focus:ring-[#1a73e8] dark:bg-[#2f3033] dark:focus:bg-[#303134]"
            aria-label="Global search"
          />
          <button
            onClick={onCommandOpen}
            className="absolute right-1 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[hsl(var(--muted-foreground))] shadow-sm ring-1 ring-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] dark:bg-[#3c4043]"
            title="Command palette (Ctrl+K)"
          >
            <Command size={12} /> K
          </button>
        </div>
      </div>

      {/* Mobile search button */}
      <button
        onClick={onSearchFocus}
        className="ml-auto rounded-full bg-[#f1f3f4] p-2.5 text-[hsl(var(--muted-foreground))] dark:bg-[#2f3033] md:hidden"
        aria-label="Search"
      >
        <Search size={18} />
      </button>

      <div className="hidden items-center gap-1 md:flex">
        <div className="mr-2 hidden flex-col items-end text-[11px] leading-none lg:flex">
          <span className={saving ? "text-[#1a73e8]" : "text-[hsl(var(--muted-foreground))]"}>
            {saving ? "Saving…" : lastSavedAt ? "Saved" : "Offline ready"}
          </span>
          {lastSavedAt && !saving && (
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {new Date(lastSavedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button onClick={onHelp} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]" aria-label="Help">
          <HelpCircle size={20} className="text-[hsl(var(--muted-foreground))]" />
        </button>
        <button onClick={onSettings} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]" aria-label="Settings">
          <Settings size={20} className="text-[hsl(var(--muted-foreground))]" />
        </button>
        <button onClick={onNotifications} className="relative rounded-full p-2 hover:bg-[hsl(var(--muted))]" aria-label="Notifications">
          <Bell size={20} className="text-[hsl(var(--muted-foreground))]" />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#ea4335] ring-2 ring-white dark:ring-[#202124]" />
          )}
        </button>
        <div className="ml-1 h-8 w-8 rounded-full bg-[#8ab4f8] text-center text-sm font-medium leading-8 text-[#202124]">U</div>
      </div>

      {/* Mobile right icons */}
      <div className="flex items-center gap-1 md:hidden">
        <button onClick={onNotifications} className="relative rounded-full p-2 hover:bg-[hsl(var(--muted))]">
          <Bell size={18} />
          {notificationCount > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#ea4335]" />}
        </button>
        <button onClick={onSettings} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
