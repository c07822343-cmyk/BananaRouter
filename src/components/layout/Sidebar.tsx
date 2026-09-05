"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Edit,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Conversation } from "@/lib/shared/types";
import {
  formatRelativeTime,
  groupConversations,
  searchConversations,
} from "@/lib/client/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  appName: string;
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
  appName,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
  onRename,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searching = query.trim().length > 0;
  const searchResults = useMemo(
    () => searchConversations(conversations, query),
    [conversations, query]
  );
  const visibleConversations = useMemo(
    () => (searching ? searchResults.map((r) => r.conversation) : conversations),
    [searching, searchResults, conversations]
  );
  const groups = useMemo(
    () => groupConversations(visibleConversations),
    [visibleConversations]
  );

  const finishEdit = () => {
    if (editingId && editText.trim()) {
      onRename(editingId, editText.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      className={clsx(
        "z-40 flex w-[304px] shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--secondary))] transition-transform md:relative md:translate-x-0",
        open
          ? "fixed inset-y-0 left-0 translate-x-0 shadow-xl md:shadow-none"
          : "fixed inset-y-0 left-0 -translate-x-full md:static md:translate-x-0"
      )}
      aria-label="Conversation history"
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
            <MessageSquare size={17} />
          </div>
          <div>
            <div className="text-sm font-semibold">{appName}</div>
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

      <div className="px-4">
        <button
          onClick={onNewChat}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm transition hover:opacity-90"
        >
          <Plus size={16} />
          New conversation
        </button>
      </div>

      <div className="px-4 pt-3">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and messages"
            aria-label="Search conversations"
            className="focus-ring w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] py-2 pl-9 pr-3 text-sm placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </div>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto border-t border-[hsl(var(--border))] px-2 py-2">
        {searching && searchResults.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            <Search size={20} className="mx-auto mb-2 opacity-50" />
            No conversations match your search.
          </div>
        )}

        {!searching && conversations.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            No conversations yet.
          </div>
        )}

        {groups.map((group) => (
          <div key={group.key} className="mb-2">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.conversations.map((conversation) => (
                <SidebarItem
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === activeId}
                  editing={editingId === conversation.id}
                  editText={editText}
                  setEditText={setEditText}
                  menuOpen={menuId === conversation.id}
                  setMenuId={setMenuId}
                  snippet={
                    searching
                      ? searchResults.find((r) => r.conversation.id === conversation.id)
                          ?.matches[0]?.snippet
                      : undefined
                  }
                  onSelect={onSelect}
                  onStartRename={() => {
                    setEditingId(conversation.id);
                    setEditText(conversation.title);
                    setMenuId(null);
                  }}
                  onDelete={() => {
                    setDeleteTarget(conversation);
                    setMenuId(null);
                  }}
                  onFinishEdit={finishEdit}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[hsl(var(--border))] px-4 py-3 text-center text-[11px] text-[hsl(var(--muted-foreground))]">
        AI inference is provided through the OpenRouter API.
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete conversation?"
        description={
          deleteTarget
            ? `This permanently deletes "${deleteTarget.title}" from this browser.`
            : undefined
        }
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </aside>
  );
}

interface SidebarItemProps {
  conversation: Conversation;
  active: boolean;
  editing: boolean;
  editText: string;
  setEditText: (value: string) => void;
  menuOpen: boolean;
  setMenuId: (id: string | null) => void;
  snippet?: string;
  onSelect: (id: string) => void;
  onStartRename: () => void;
  onDelete: () => void;
  onFinishEdit: () => void;
}

function SidebarItem({
  conversation,
  active,
  editing,
  editText,
  setEditText,
  menuOpen,
  setMenuId,
  snippet,
  onSelect,
  onStartRename,
  onDelete,
  onFinishEdit,
}: SidebarItemProps) {
  return (
    <li className="relative">
      <div
        className={clsx(
          "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition",
          active
            ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
            : "hover:bg-[hsl(var(--muted))]"
        )}
        onClick={() => onSelect(conversation.id)}
      >
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={onFinishEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") onFinishEdit();
                if (e.key === "Escape") setMenuId(null);
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
          {snippet && (
            <div className="mt-0.5 truncate text-[11px] text-[hsl(var(--muted-foreground))]">
              {snippet}
            </div>
          )}
        </div>

        <button
          aria-label={`Conversation actions for ${conversation.title}`}
          onClick={(e) => {
            e.stopPropagation();
            setMenuId(menuOpen ? null : conversation.id);
          }}
          className={clsx(
            "focus-ring shrink-0 rounded p-1 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
            menuOpen ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
          )}
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-2 top-9 z-30 w-36 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-xl">
          <button
            onClick={onStartRename}
            className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[hsl(var(--muted))]"
          >
            <Edit size={14} />
            Rename
          </button>
          <button
            onClick={onDelete}
            className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
