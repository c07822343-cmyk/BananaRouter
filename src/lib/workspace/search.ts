import { WorkspaceState, SearchItem } from "./types";

export function buildSearchIndex(state: WorkspaceState): SearchItem[] {
  const items: SearchItem[] = [];

  for (const c of state.conversations) {
    if ((c as any).trashed) continue; // conversations not trashed flag, but just in case
    const content = c.messages.map((m) => m.content).join("\n");
    items.push({
      id: c.id,
      type: "chat",
      title: c.title || "Untitled chat",
      content,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      location: "Chat",
      metadata: { messages: c.messages.length, model: c.model },
    });
  }
  for (const d of state.documents) {
    if (d.trashed) continue;
    items.push({
      id: d.id,
      type: "document",
      title: d.title,
      content: d.content,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      location: d.folderId ? "Drive / Document" : "Documents",
      starred: d.starred,
    });
  }
  for (const f of state.files) {
    if (f.trashed) continue;
    items.push({
      id: f.id,
      type: "file",
      title: f.name,
      content: f.textContent || "",
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      location: f.folderId ? "Drive" : "My Files",
      metadata: { mime: f.mime, size: f.size },
    });
  }
  for (const s of state.spreadsheets) {
    if (s.trashed) continue;
    const flat = s.sheets.map((sh) => Object.values(sh.cells).map((c) => c.value).join(" ")).join(" ");
    items.push({
      id: s.id,
      type: "sheet",
      title: s.title,
      content: flat,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      location: "Sheets",
    });
  }
  for (const n of state.notes) {
    if (n.trashed || n.archived) continue;
    items.push({
      id: n.id,
      type: "note",
      title: n.title || "Untitled note",
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      location: "Keep",
      metadata: { labels: n.labels, color: n.color, pinned: n.pinned },
    });
  }
  for (const t of state.tasks) {
    if (t.trashed) continue;
    items.push({
      id: t.id,
      type: "task",
      title: t.title,
      content: t.description || "",
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      location: "Tasks",
      metadata: { completed: t.completed, priority: t.priority },
    });
  }
  for (const e of state.emailDrafts) {
    if (e.trashed || e.archived) continue;
    items.push({
      id: e.id,
      type: "email",
      title: e.subject || "(no subject)",
      content: `${e.to} ${e.body}`,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      location: "Mail",
    });
  }
  for (const ev of state.calendarEvents) {
    if (ev.trashed) continue;
    items.push({
      id: ev.id,
      type: "event",
      title: ev.title,
      content: ev.description || ev.location || "",
      createdAt: ev.createdAt,
      updatedAt: ev.updatedAt,
      location: "Calendar",
    });
  }
  for (const p of state.projects) {
    items.push({
      id: p.id,
      type: "project",
      title: p.name,
      content: p.description || "",
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      location: "Projects",
    });
  }
  for (const f of state.folders) {
    if (f.trashed) continue;
    items.push({
      id: f.id,
      type: "folder",
      title: f.name,
      content: "",
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      location: "Drive",
    });
  }
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function searchItems(items: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, 20);
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = items
    .map((it) => {
      const hay = `${it.title} ${it.content}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (it.title.toLowerCase().includes(tok)) score += 10;
        if (hay.includes(tok)) score += 3;
        // fuzzy: partial
        if (hay.includes(tok.slice(0, Math.max(2, tok.length - 1)))) score += 1;
      }
      return { it, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.it.updatedAt - a.it.updatedAt)
    .map((x) => x.it);
  return scored.slice(0, 50);
}

export function snippetFor(item: SearchItem, query: string): string {
  const q = query.trim().toLowerCase();
  if (!q) return item.content.slice(0, 120);
  const idx = item.content.toLowerCase().indexOf(q);
  if (idx === -1) {
    // title match
    return item.content.slice(0, 120) || item.title;
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(item.content.length, idx + q.length + 60);
  return (start > 0 ? "…" : "") + item.content.slice(start, end) + (end < item.content.length ? "…" : "");
}
