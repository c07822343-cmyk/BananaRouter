"use client";

import { Trash2, RotateCcw, XCircle } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";

export function TrashView() {
  const { state, updateDocument, updateFile, updateNote, updateTask, updateSpreadsheet, deleteDocument, deleteFile, deleteNote, deleteTask, deleteSpreadsheet } = useWorkspace() as any;

  const trashed = [
    ...state.documents.filter((d: any) => d.trashed).map((d: any) => ({ id: d.id, title: d.title, type: "document", at: d.trashedAt })),
    ...state.files.filter((f: any) => f.trashed).map((f: any) => ({ id: f.id, title: f.name, type: "file", at: f.trashedAt })),
    ...state.notes.filter((n: any) => n.trashed).map((n: any) => ({ id: n.id, title: n.title || "Untitled note", type: "note", at: n.trashedAt })),
    ...state.tasks.filter((t: any) => t.trashed).map((t: any) => ({ id: t.id, title: t.title, type: "task", at: t.trashedAt })),
    ...state.spreadsheets.filter((s: any) => s.trashed).map((s: any) => ({ id: s.id, title: s.title, type: "sheet", at: s.trashedAt })),
    ...state.emailDrafts.filter((e: any) => e.trashed).map((e: any) => ({ id: e.id, title: e.subject || "(no subject)", type: "email", at: (e as any).trashedAt })),
    ...state.calendarEvents.filter((e: any) => e.trashed).map((e: any) => ({ id: e.id, title: e.title, type: "event", at: (e as any).trashedAt })),
  ].sort((a, b) => (b.at ?? 0) - (a.at ?? 0));

  const handleRestore = (item: any) => {
    if (item.type === "document") updateDocument(item.id, { trashed: false, trashedAt: null });
    else if (item.type === "file") updateFile(item.id, { trashed: false, trashedAt: null });
    else if (item.type === "note") updateNote(item.id, { trashed: false, trashedAt: null });
    else if (item.type === "task") updateTask(item.id, { trashed: false, trashedAt: null });
    else if (item.type === "sheet") updateSpreadsheet(item.id, { trashed: false, trashedAt: null });
    else if (item.type === "email") (useWorkspace as any).updateEmailDraft?.(item.id, { trashed: false });
    else if (item.type === "event") (useWorkspace as any).updateEvent?.(item.id, { trashed: false });
  };

  const handleDeletePermanently = (item: any) => {
    if (!confirm("Delete permanently? This cannot be undone.")) return;
    if (item.type === "document") deleteDocument(item.id, true);
    else if (item.type === "file") deleteFile(item.id, true);
    else if (item.type === "note") deleteNote(item.id, true);
    else if (item.type === "task") deleteTask(item.id, true);
    else if (item.type === "sheet") deleteSpreadsheet(item.id, true);
  };

  return (
    <div className="mx-auto max-w-[720px] p-6">
      <h1 className="flex items-center gap-2 text-xl font-medium"><Trash2 size={20} /> Trash</h1>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Deleted items stay here until you delete permanently. You can restore them.</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Tip: Deleting a folder does not cascade-delete files yet — restore is safe. Items are soft-deleted with trashedAt.</p>

      <div className="mt-6 space-y-2">
        {trashed.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed bg-white p-8 text-center dark:bg-[#303134]">
            <Trash2 size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Trash is empty</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Items you delete will appear here for recovery.</p>
          </div>
        ) : (
          trashed.map((it: any) => (
            <div key={it.id + it.type} className="flex items-center gap-3 rounded-xl border bg-white px-3 py-3 dark:bg-[#303134]">
              <Trash2 size={16} className="text-[hsl(var(--muted-foreground))]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{it.title} <span className="ml-1 rounded bg-[#f1f3f4] px-1.5 py-0.5 text-[11px]">{it.type}</span></div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{it.at ? new Date(it.at).toLocaleString() : ""}</div>
              </div>
              <button
                onClick={() => handleRestore(it)}
                className="rounded-full bg-[#FFFBEB] px-3 py-1 text-xs font-medium text-[#b45309]"
              >
                <RotateCcw size={12} className="inline" /> Restore
              </button>
              <button
                onClick={() => handleDeletePermanently(it)}
                className="rounded-full border px-3 py-1 text-xs"
              >
                <XCircle size={12} className="inline" /> Delete forever
              </button>
            </div>
          ))
        )}
      </div>

      {trashed.length > 0 && (
        <div className="mt-4 rounded-xl bg-[#fef7e0] p-3 text-xs dark:bg-[#5a4a1a]">
          <span className="font-medium">Undo:</span> Restoring returns the item to its original location. Permanent delete cannot be undone.
        </div>
      )}
    </div>
  );
}
