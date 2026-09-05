"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Loader2, RefreshCw, Search } from "lucide-react";
import { ModelInfo } from "@/lib/shared/types";
import { fetchModels } from "@/lib/client/api";

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
    hint: "Auto-routes to the best available free model.",
  },
  {
    id: "openrouter/auto",
    label: "Automatic/Recommended",
    hint: "OpenRouter chooses a strong recommended model (may use credits).",
  },
];

function contextLabel(model: ModelInfo): string {
  if (!model.contextLength) return "";
  if (model.contextLength >= 1000) return `${Math.round(model.contextLength / 1000)}k`;
  return String(model.contextLength);
}

export function ModelSelector({ value, onChange, id, compact = false }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [source, setSource] = useState<"openrouter" | "config" | "idle">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);

  const selected = PRESETS.find((p) => p.id === value);

  const visibleModels = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? models.filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            (m.provider ?? "").toLowerCase().includes(q)
        )
      : models;
    // Keep the dropdown usable with the full OpenRouter catalog.
    return list.slice(0, 80);
  }, [models, filter]);

  const refreshModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchModels();
      setModels(result.models);
      setSource(result.source);
    } catch (err) {
      setSource("config");
      setError(
        err instanceof Error ? err.message : "Could not refresh models."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && models.length === 0 && source === "idle") {
      void refreshModels();
    }
    if (next) {
      window.setTimeout(() => filterRef.current?.focus(), 60);
    }
  };

  const select = (model: string) => {
    onChange(model);
    setOpen(false);
    setCustom(false);
    setFilter("");
  };

  const selectedInfo = models.find((m) => m.id === value);

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select model"
        onClick={handleOpen}
        className={
          compact
            ? "focus-ring flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-2.5 py-1.5 text-xs transition hover:bg-[hsl(var(--muted))]"
            : "focus-ring flex w-full items-center justify-between gap-2 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-sm"
        }
      >
        <span className="truncate">{selected?.label ?? value}</span>
        {selectedInfo && (
          <span
            className={clsx(
              "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
              selectedInfo.free
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}
          >
            {selectedInfo.free ? "Free" : "Paid"}
          </span>
        )}
        <ChevronDown
          size={compact ? 14 : 16}
          className="shrink-0 text-[hsl(var(--muted-foreground))]"
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-[min(420px,70vh)] w-full min-w-[280px] overflow-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-xl"
        >
          <div className="flex items-center gap-1.5 px-2 pb-1">
            <input
              ref={filterRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter models…"
              aria-label="Filter models"
              className="focus-ring w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-xs"
            />
            <button
              aria-label="Refresh models"
              onClick={refreshModels}
              disabled={loading}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
          </div>

          {error && (
            <div className="mx-2 mb-1 rounded-lg bg-[hsl(var(--destructive))]/5 px-2 py-1.5 text-[11px] text-[hsl(var(--destructive))]">
              {error}
            </div>
          )}

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

          {loading && models.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-[hsl(var(--muted-foreground))]">
              <Loader2 size={14} className="animate-spin" />
              Loading OpenRouter models…
            </div>
          )}

          {!loading && source === "openrouter" && visibleModels.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
              No models match your filter.
            </div>
          )}

          {source === "openrouter" &&
            visibleModels.map((model) => (
              <button
                key={model.id}
                role="option"
                aria-selected={value === model.id}
                onClick={() => select(model.id)}
                className="focus-ring flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-[hsl(var(--muted))]"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{model.name}</span>
                    <span
                      className={clsx(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                        model.free
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {model.free ? "Free" : "Paid"}
                    </span>
                  </span>
                  <span className="block truncate text-[11px] text-[hsl(var(--muted-foreground))]">
                    {model.id}
                    {contextLabel(model) ? ` · ${contextLabel(model)} ctx` : ""}
                    {model.provider ? ` · ${model.provider}` : ""}
                  </span>
                </span>
                {value === model.id && (
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
