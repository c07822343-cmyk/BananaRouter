"use client";

import { Menu, Plus, Settings, Sparkles } from "lucide-react";

interface HeaderProps {
  activeModel: string;
  onMenu: () => void;
  onNewChat: () => void;
  onSettings: () => void;
}

export function Header({ activeModel, onMenu, onNewChat, onSettings }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 md:px-4">
      <button
        aria-label="Open conversation menu"
        className="focus-ring rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] md:hidden"
        onClick={onMenu}
      >
        <Menu size={18} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Sparkles
          size={16}
          className="shrink-0 text-[hsl(var(--primary))]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {activeModel || "Free Router"}
          </div>
          <div className="hidden text-[11px] text-[hsl(var(--muted-foreground))] sm:block">
            Powered by OpenRouter
          </div>
        </div>
      </div>

      <button
        aria-label="New conversation"
        onClick={onNewChat}
        className="focus-ring rounded-lg border border-[hsl(var(--border))] p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] md:hidden"
      >
        <Plus size={18} />
      </button>

      <button
        aria-label="Open settings"
        onClick={onSettings}
        className="focus-ring rounded-lg border border-[hsl(var(--border))] p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
      >
        <Settings size={18} />
      </button>
    </header>
  );
}
