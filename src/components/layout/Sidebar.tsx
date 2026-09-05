"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Edit, MessageSquare, Plus, Search, Trash2, X } from "lucide-react";
import { Conversation } from "@/lib/shared/types";
import { formatRelativeTime } from "@/lib/client/utils";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function Sidebar({
  conversations,
  activeId,
  open,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
  onRename,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const finishEdit = () => {
    if (editingId && editText.trim()) {
      onRename(editingId, editText.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      className={clsx(
        "z-40 flex w-[280px] shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--secondary))] transition-transform md:relative md:translate-x-0",
        open ? "fixed inset-y-0 left-0 translate-x-0 shadow-xl md:shadow-none" : "fixed inset-y-0 left-0 -translate-x-full md:static md:translate-x-0"
      )}
      aria-label="Conversation history"
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
            <MessageSquare size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold">OpenRouter Chat</div>
            <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
              Powered by OpenRouter
            </div>
          </div>
        </div>
        <button
          aria-label="Close sidebar"
          className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] md:hidden"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={onNewChat}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm transition hover:opacity-90"
        >
          <Plus size={16} />
          New conversation
        </button>
      </div>

      <div className="px-4">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="focus-ring w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] py-2 pl-9 pr-3 text-sm placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto border-t border-[hsl(var(--border))] px-2 py-2">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            {query ? "No conversations match your search." : "No conversations yet."}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((conversation) => (
              <li key={conversation.id}>
                <div
                  className={clsx(
                    "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition",
                    conversation.id === activeId
                      ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                      : "hover:bg-[hsl(var(--muted))]"
                  )}
                  onClick={() => onSelect(conversation.id)}
                >
                  <div className="min-w-0 flex-1">
                    {editingId === conversation.id ? (
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={finishEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") finishEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full rounded border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-1 py-0.5 text-sm"
                      />
                    ) : (
                      <div className="truncate text-sm font-medium">
                        {conversation.title || "New conversation"}
                      </div>
                    )}
                    <div className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                      {conversation.messages.length}{" "}
                      {conversation.messages.length === 1 ? "message" : "messages"} ·{" "}
                      {formatRelativeTime(conversation.updatedAt)}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    {editingId !== conversation.id && (
                      <button
                        aria-label={`Rename ${conversation.title}`}
                        className="focus-ring rounded p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(conversation.id);
                          setEditText(conversation.title);
                        }}
                      >
                        <Edit size={13} />
                      </button>
                    )}
                    <button
                      aria-label={`Delete ${conversation.title}`}
                      className="focus-ring rounded p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive-foreground))]"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Delete "${conversation.title}"? This cannot be undone.`
                          )
                        ) {
                          onDelete(conversation.id);
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-[hsl(var(--border))] px-4 py-3 text-center text-[11px] text-[hsl(var(--muted-foreground))]">
        AI inference is provided through the OpenRouter API.
      </div>
    </aside>
  );
}
