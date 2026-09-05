"use client";

import { BananaLogo } from "@/components/branding/BananaLogo";
import { Settings, Command, HardDrive, Wifi, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

export function TopSystemBar({
  windowTitle,
  model,
  onOpenLauncher,
  onOpenSettings,
  onOpenCommand,
  connectionStatus,
}: {
  windowTitle: string;
  model: string;
  onOpenLauncher: () => void;
  onOpenSettings: () => void;
  onOpenCommand: () => void;
  connectionStatus: "connected" | "offline" | "checking";
}) {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <header className="flex h-[32px] shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0f0f10]/80 px-2 backdrop-blur text-xs text-zinc-300">
      {/* Left: launcher */}
      <button onClick={onOpenLauncher} className="flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-white/10 transition" aria-label="Launcher">
        <BananaLogo size={16} />
        <span className="hidden sm:inline font-medium tracking-tight text-zinc-100">BananaRouter</span>
      </button>

      {/* Center: window title */}
      <div className="flex-1 flex justify-center min-w-0">
        <span className="truncate rounded-full bg-white/[0.06] border border-white/[0.06] px-3 py-0.5 text-[11px] font-medium text-zinc-300">
          {windowTitle}
        </span>
      </div>

      {/* Right: status */}
      <div className="flex items-center gap-1">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${connectionStatus === "connected" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : connectionStatus === "offline" ? "bg-zinc-800 text-zinc-400 border border-white/10" : "bg-amber-500/15 text-amber-400"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connectionStatus === "connected" ? "bg-emerald-400" : connectionStatus === "offline" ? "bg-zinc-500" : "bg-amber-400 animate-pulse"}`} />
          {connectionStatus === "connected" ? "Connected" : connectionStatus === "offline" ? "Offline" : "Checking"}
        </span>
        <button onClick={onOpenCommand} className="hidden md:inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/10" title="Command palette">
          <Command size={12} />
          <span className="text-[11px]">{model === "openrouter/free" ? "Free Router" : model.split("/").pop()}</span>
        </button>
        <button onClick={onOpenSettings} className="rounded-md p-1 hover:bg-white/10"><Settings size={14} /></button>
        <span className="hidden sm:inline tabular-nums text-[11px] text-zinc-400 ml-1">{time}</span>
      </div>
    </header>
  );
}
