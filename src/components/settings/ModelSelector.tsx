"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  id?: string;
  compact?: boolean;
}

const PRESETS: Array<{ id: string; label: string; hint: string }> = [
  {
    id: "openrouter/free",
    label: "Free Router",
    hint: "Automatically picks the best available free model.",
  },
  {
    id: "openrouter/auto",
    label: "Automatic/Recommended",
    hint: "OpenRouter picks a strong recommended model (may use credits).",
  },
];

export function ModelSelector({
  value,
  onChange,
  id,
  compact = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const selected = PRESETS.find((p) => p.id === value);

  const select = (model: string) => {
    onChange(model);
    setOpen(false);
    setCustom(false);
  };

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select model"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? "focus-ring flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-2.5 py-1.5 text-xs transition hover:bg-[hsl(var(--muted))]"
            : "focus-ring flex w-full items-center justify-between gap-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
        }
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown
          size={compact ? 14 : 16}
          className="shrink-0 text-[hsl(var(--muted-foreground))]"
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full min-w-[240px] overflow-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-xl"
        >
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              role="option"
              aria-selected={value === preset.id}
              onClick={() => select(preset.id)}
              className="focus-ring flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-[hsl(var(--muted))]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{preset.label}</span>
                <span className="block text-[11px] text-[hsl(var(--muted-foreground))]">
                  {preset.hint}
                </span>
              </span>
              {value === preset.id && (
                <Check size={15} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
              )}
            </button>
          ))}

          <div className="my-1 border-t border-[hsl(var(--border))]" />

          {custom ? (
            <div className="p-2">
              <input
                autoFocus
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onBlur={() => {
                  if (customValue.trim()) onChange(customValue.trim());
                  setCustom(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (customValue.trim()) onChange(customValue.trim());
                    setCustom(false);
                    setOpen(false);
                  }
                }}
                placeholder="provider/model:id"
                aria-label="Custom model identifier"
                className="focus-ring w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
              />
            </div>
          ) : (
            <button
              onClick={() => setCustom(true)}
              className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[hsl(var(--muted))]"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Custom model</span>
                <span className="block text-[11px] text-[hsl(var(--muted-foreground))]">
                  Enter any OpenRouter model identifier.
                </span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
