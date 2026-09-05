"use client";

import { useRef, useState } from "react";
import { X, Minus, Maximize2 } from "lucide-react";
import clsx from "clsx";

export interface WindowConfig {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function DesktopWindow({
  config,
  focused,
  onFocus,
  onClose,
  onMinimize,
  children,
  zIndex,
  initialX,
  initialY,
}: {
  config: WindowConfig;
  focused: boolean;
  zIndex: number;
  initialX?: number;
  initialY?: number;
  onFocus: () => void;
  onClose: () => void;
  onMinimize?: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: initialX ?? 40, y: initialY ?? 40 });
  const [size, setSize] = useState({ w: config.defaultWidth ?? 760, h: config.defaultHeight ?? 520 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; x: number; y: number } | null>(null);

  const onMouseDownTitle = (e: React.MouseEvent) => {
    onFocus();
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y };
    const move = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      setPos({ x: Math.max(0, dragStart.current.x + dx), y: Math.max(0, dragStart.current.y + dy) });
    };
    const up = () => {
      setDragging(false);
      dragStart.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      ref={ref}
      onMouseDown={onFocus}
      className={clsx(
        "absolute flex flex-col overflow-hidden rounded-xl border bg-[#1a1a1e] shadow-2xl select-none",
        focused ? "border-white/15 shadow-black/50" : "border-white/10 shadow-black/30 opacity-[0.98]"
      )}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex, transform: dragging ? "rotate(0.1deg)" : undefined }}
    >
      <div onMouseDown={onMouseDownTitle} className={clsx("flex h-8 shrink-0 cursor-move items-center gap-2 px-2 text-xs", focused ? "bg-white/[0.06]" : "bg-white/[0.04]")}>
        <span className="flex items-center gap-1.5 font-medium text-zinc-200">
          {config.icon}
          {config.title}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {onMinimize && (
            <button onClick={onMinimize} className="rounded p-1 hover:bg-white/10 text-zinc-400">
              <Minus size={12} />
            </button>
          )}
          <button onClick={onClose} className="rounded p-1 hover:bg-red-500/20 text-zinc-400 hover:text-red-400">
            <X size={12} />
          </button>
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden bg-[#121214]">{children}</div>
      {/* resize handle */}
      <div
        className="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize"
        onMouseDown={(e) => {
          e.preventDefault();
          const start = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
          const move = (ev: MouseEvent) => {
            const dw = ev.clientX - start.mx;
            const dh = ev.clientY - start.my;
            setSize({ w: Math.max(360, start.w + dw), h: Math.max(280, start.h + dh) });
          };
          const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
      >
        <div className="absolute right-1 bottom-1 h-2 w-2 rounded-sm border-r border-b border-white/20" />
      </div>
    </div>
  );
}
