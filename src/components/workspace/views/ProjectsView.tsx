"use client";

import { useState } from "react";
import { FolderKanban, Plus, Trash2, Star, Edit } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";

export function ProjectsView() {
  const { state, createProject, updateProject, deleteProject, setActiveProject, addNotification } = useWorkspace();
  const [newName, setNewName] = useState("");

  return (
    <div className="mx-auto max-w-[900px] p-6">
      <h1 className="flex items-center gap-2 text-xl font-medium"><FolderKanban size={20} className="text-[#1a73e8]" /> Projects</h1>
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Organize chats, documents, sheets, notes, tasks, and files by project. AI uses the active project as context.</p>

      <div className="mt-4 flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New project name" className="flex-1 rounded-full border bg-white px-4 py-2 text-sm dark:bg-[#303134]" onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { createProject(newName.trim()); setNewName(""); } }} />
        <button onClick={() => { if (newName.trim()) { createProject(newName.trim()); setNewName(""); } }} className="rounded-full bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white"><Plus size={14} className="inline" /> Create</button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button onClick={() => setActiveProject(null)} className={`rounded-2xl border p-4 text-left ${!state.activeProjectId ? "bg-[#e8f0fe] ring-1 ring-[#1a73e8] dark:bg-[#394457]" : "bg-white dark:bg-[#303134]"}`}>
          <div className="font-medium">All workspaces</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">No filter — see everything. {state.projects.length} projects total</div>
        </button>
        {state.projects.map((p) => (
          <div key={p.id} className={`rounded-2xl border p-4 ${state.activeProjectId === p.id ? "bg-[#e8f0fe] ring-1 ring-[#1a73e8] dark:bg-[#394457]" : "bg-white dark:bg-[#303134]"}`}>
            <div className="flex items-center gap-2">
              <span className="flex-1 truncate font-medium">{p.name}</span>
              <button onClick={() => updateProject(p.id, { starred: !p.starred })}><Star size={14} className={p.starred ? "fill-[#fbbc04] text-[#fbbc04]" : ""} /></button>
              <button onClick={() => { const n = prompt("Rename project", p.name); if (n) updateProject(p.id, { name: n }); }}><Edit size={14} /></button>
              <button onClick={() => { if (confirm("Delete project? Items inside will remain but lose project association.")) deleteProject(p.id); }}><Trash2 size={14} /></button>
            </div>
            <div className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">{p.description || "No description"}</div>
            <div className="mt-3 flex gap-1">
              <button onClick={() => setActiveProject(p.id)} className="rounded-full bg-white px-3 py-1 text-xs shadow dark:bg-[#202124]">{state.activeProjectId === p.id ? "Active" : "Activate"}</button>
              <span className="rounded-full bg-[#f1f3f4] px-2 py-1 text-xs dark:bg-[#202124]">{state.documents.filter((d) => d.projectId === p.id).length} docs</span>
              <span className="rounded-full bg-[#f1f3f4] px-2 py-1 text-xs dark:bg-[#202124]">{state.files.filter((f) => f.projectId === p.id).length} files</span>
            </div>
          </div>
        ))}
      </div>

      {state.projects.length === 0 && <div className="mt-6 rounded-2xl border-2 border-dashed bg-white p-8 text-center dark:bg-[#303134]"><p className="text-sm font-medium">No projects yet</p><p className="text-xs text-[hsl(var(--muted-foreground))]">Create one to group related work. Example: “Roblox Game”.</p></div>}
    </div>
  );
}
