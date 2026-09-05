"use client";

import { useState, useRef } from "react";
import { Table2, Plus, Upload, Download, Sparkles, Search, Filter, ArrowUpDown, Trash2, Copy, Star } from "lucide-react";
import { useWorkspace } from "@/lib/workspace/context";
import { Spreadsheet, Sheet } from "@/lib/workspace/types";
import { executeAI } from "@/lib/ai/service";
import { loadSettings } from "@/lib/client/settings";

function cellKey(r: number, c: number) { return `${r}:${c}`; }

export function SheetsView() {
  const { state, createSpreadsheet, updateSpreadsheet, deleteSpreadsheet, addNotification } = useWorkspace();
  const sheets = state.spreadsheets.filter((s) => !s.trashed).sort((a, b) => b.updatedAt - a.updatedAt);
  const [activeId, setActiveId] = useState<string | null>(sheets[0]?.id ?? null);
  const active = sheets.find((s) => s.id === activeId) ?? null;
  const [activeSheetId, setActiveSheetId] = useState<string | null>(active?.sheets[0]?.id ?? null);
  const sheet = active?.sheets.find((sh) => sh.id === activeSheetId) ?? active?.sheets[0] ?? null;
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showPreviewChanges, setShowPreviewChanges] = useState<{ before: string; after: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = text.split("\n").filter((l) => l.trim().length > 0);
    const header = rows[0]?.split(",").map((s) => s.trim()) ?? [];
    const dataRows = rows.slice(1);
    const cols = header.length || 4;
    const newSheet: Sheet = { id: `sh_${Date.now()}`, title: "Imported", rows: dataRows.length + 1, cols, cells: {} };
    header.forEach((h, c) => newSheet.cells[cellKey(0, c)] = { value: h });
    dataRows.forEach((row, r) => {
      row.split(",").forEach((val, c) => newSheet.cells[cellKey(r + 1, c)] = { value: val.trim() });
    });
    const ss = createSpreadsheet(file.name.replace(/\.csv$/i, ""));
    updateSpreadsheet(ss.id, { sheets: [newSheet], csvImported: true });
    setActiveId(ss.id);
    setActiveSheetId(newSheet.id);
    addNotification({ title: "CSV imported", message: `${file.name} → spreadsheet with ${dataRows.length} rows`, type: "success" });
    if (fileInput.current) fileInput.current.value = "";
  };

  const setCell = (r: number, c: number, v: string) => {
    if (!active || !sheet) return;
    const key = cellKey(r, c);
    const nextSheets = active.sheets.map((sh) => sh.id === sheet.id ? { ...sh, cells: { ...sh.cells, [key]: { value: v } } } : sh);
    updateSpreadsheet(active.id, { sheets: nextSheets });
  };

  const askAI = async (prompt: string, tool: any = "sheet.analyze") => {
    if (!active || !sheet) return;
    const csv = sheetToCsv(sheet);
    setAiLoading(true);
    setAiResult("");
    const settings = loadSettings();
    try {
      const out = await executeAI({ model: settings.model, toolId: tool, input: csv.slice(0, 8000), contextText: `Spreadsheet: ${active.title}`, signal: new AbortController().signal });
      setAiResult(out);
      // If it's a cleaning suggestion, offer preview
      if (tool === "sheet.clean" && out.includes("|")) {
        setShowPreviewChanges({ before: csv.slice(0, 3000), after: out.slice(0, 3000) });
      }
    } catch (e: any) {
      setAiResult(`Error: ${e?.message ?? "failed"}`);
    } finally { setAiLoading(false); }
  };

  const sheetToCsv = (sh: Sheet) => {
    let out = "";
    for (let r = 0; r < sh.rows; r++) {
      const row: string[] = [];
      for (let c = 0; c < sh.cols; c++) row.push(sh.cells[cellKey(r, c)]?.value ?? "");
      out += row.join(",") + "\n";
    }
    return out;
  };

  const exportCsv = () => {
    if (!active || !sheet) return;
    const csv = sheetToCsv(sheet);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${active.title}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (sheets.length === 0) {
    return (
      <div className="mx-auto max-w-[720px] p-8 text-center">
        <Table2 size={32} className="mx-auto mb-3 opacity-40" />
        <h2 className="text-lg font-medium">No spreadsheets yet</h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Create a sheet or import a CSV to get started.</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => { const s = createSpreadsheet(); setActiveId(s.id); }} className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white">New spreadsheet</button>
          <label className="cursor-pointer rounded-full border bg-white px-5 py-2 text-sm"><Upload size={14} className="inline" /> Import CSV<input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} /></label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-white px-3 py-2 dark:bg-[#202124]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {sheets.map((s) => (
            <button key={s.id} onClick={() => { setActiveId(s.id); setActiveSheetId(s.sheets[0]?.id ?? null); }} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${activeId === s.id ? "bg-[#e8f0fe] text-[#1a73e8]" : "hover:bg-[hsl(var(--muted))]"}`}>{s.title}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <button onClick={() => { const s = createSpreadsheet(); setActiveId(s.id); }} className="rounded-full bg-[#1a73e8] px-3 py-1.5 text-xs font-medium text-white"><Plus size={12} className="inline" /> New</button>
          <label className="cursor-pointer rounded-full border bg-white px-3 py-1.5 text-xs dark:bg-[#303134]"><Upload size={12} className="inline" /> Import<input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} /></label>
        </div>
      </div>

      {active && sheet ? (
        <>
          <div className="flex flex-wrap items-center gap-1 border-b bg-[#f8f9fa] px-2 py-1.5 dark:bg-[#303134]">
            <span className="px-2 text-sm font-medium">{active.title}</span>
            <input value={active.title} onChange={(e) => updateSpreadsheet(active.id, { title: e.target.value })} className="ml-2 rounded border px-2 py-1 text-xs" placeholder="Title" />
            <div className="mx-2 h-4 w-px bg-[hsl(var(--border))]" />
            {active.sheets.map((sh) => (
              <button key={sh.id} onClick={() => setActiveSheetId(sh.id)} className={`rounded px-3 py-1 text-xs ${sh.id === sheet.id ? "bg-white shadow dark:bg-[#3c4043]" : "hover:bg-white"}`}>{sh.title}</button>
            ))}
            <button onClick={() => { const ns: Sheet = { id: `sh_${Date.now()}`, title: `Sheet${active.sheets.length + 1}`, rows: 20, cols: 8, cells: {} }; updateSpreadsheet(active.id, { sheets: [...active.sheets, ns] }); setActiveSheetId(ns.id); }} className="rounded px-2 py-1 text-xs hover:bg-white">+ Sheet</button>
            <div className="ml-auto flex gap-1">
              <button onClick={exportCsv} className="rounded-full bg-white px-3 py-1 text-xs shadow"><Download size={12} className="inline" /> Export CSV</button>
              <button onClick={() => updateSpreadsheet(active.id, { starred: !active.starred })} className="rounded-full bg-white px-2 py-1 text-xs shadow"><Star size={12} className={active.starred ? "fill-[#fbbc04] text-[#fbbc04]" : ""} /></button>
              <button onClick={() => { if (confirm("Delete spreadsheet?")) deleteSpreadsheet(active.id); }} className="rounded-full bg-white px-2 py-1 text-xs shadow"><Trash2 size={12} /></button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b bg-white px-3 py-2 dark:bg-[#202124]">
            <span className="flex items-center gap-1 text-xs font-medium text-[#1a73e8]"><Sparkles size={12} /> AI:</span>
            <button disabled={aiLoading} onClick={() => askAI("Summarize this data", "sheet.analyze")} className="rounded-full bg-[#e8f0fe] px-2.5 py-1 text-xs text-[#1a73e8] disabled:opacity-50">Summarize</button>
            <button disabled={aiLoading} onClick={() => askAI("Find trends", "sheet.trends")} className="rounded-full bg-[#e8f0fe] px-2.5 py-1 text-xs text-[#1a73e8] disabled:opacity-50">Trends</button>
            <button disabled={aiLoading} onClick={() => askAI("Clean this dataset", "sheet.clean")} className="rounded-full bg-[#fef7e0] px-2.5 py-1 text-xs disabled:opacity-50">Clean dataset (preview)</button>
            <button disabled={aiLoading} onClick={() => askAI("Create a formula to calculate growth", "sheet.analyze")} className="rounded-full border px-2.5 py-1 text-xs disabled:opacity-50">Formula help</button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto bg-white dark:bg-[#202124]">
              <div className="min-w-[600px]">
                <div className="sticky top-0 z-10 flex bg-[#f1f3f4] text-xs font-medium dark:bg-[#303134]">
                  <div className="w-10 shrink-0 border-b border-r px-2 py-1 text-center">#</div>
                  {Array.from({ length: sheet.cols }).map((_, c) => (
                    <div key={c} className="min-w-[120px] flex-1 border-b border-r px-2 py-1">{String.fromCharCode(65 + c)}</div>
                  ))}
                </div>
                {Array.from({ length: sheet.rows }).map((_, r) => (
                  <div key={r} className="flex">
                    <div className={`w-10 shrink-0 border-b border-r bg-[#f8f9fa] px-2 py-1 text-center text-xs ${r === 0 && sheet.frozenHeader ? "bg-[#e8f0fe]" : ""} dark:bg-[#303134]`}>{r + 1}</div>
                    {Array.from({ length: sheet.cols }).map((_, c) => (
                      <input
                        key={c}
                        value={sheet.cells[cellKey(r, c)]?.value ?? ""}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        className={`min-w-[120px] flex-1 border-b border-r px-2 py-1 text-sm outline-none focus:bg-[#e8f0fe] ${r === 0 ? "bg-[#f8f9fa] font-medium dark:bg-[#3c4043]" : "bg-white dark:bg-[#202124]"}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 p-2 text-xs">
                <button onClick={() => { if (sheet.rows < 100) updateSpreadsheet(active.id, { sheets: active.sheets.map((sh) => sh.id === sheet.id ? { ...sh, rows: sh.rows + 5 } : sh) }); }} className="rounded border px-2 py-1">+ 5 rows</button>
                <button onClick={() => { if (sheet.cols < 20) updateSpreadsheet(active.id, { sheets: active.sheets.map((sh) => sh.id === sheet.id ? { ...sh, cols: sh.cols + 1 } : sh) }); }} className="rounded border px-2 py-1">+ column</button>
                <button onClick={() => updateSpreadsheet(active.id, { sheets: active.sheets.map((sh) => sh.id === sheet.id ? { ...sh, frozenHeader: !sh.frozenHeader } : sh) })} className="rounded border px-2 py-1">{sheet.frozenHeader ? "Unfreeze header" : "Freeze header"}</button>
              </div>
            </div>

            <div className="hidden w-[380px] shrink-0 flex-col border-l bg-[#f8f9fa] dark:bg-[#303134] lg:flex">
              <div className="border-b bg-white p-3 text-sm font-medium dark:bg-[#202124]">AI analysis</div>
              <div className="flex-1 overflow-y-auto p-3 text-sm leading-6">
                {aiLoading ? <span className="text-[hsl(var(--muted-foreground))]">Analyzing… (only this sheet is sent to OpenRouter)</span> : <div className="whitespace-pre-wrap">{aiResult || "Ask AI to summarize or find trends."}</div>}
                {showPreviewChanges && (
                  <div className="mt-3 rounded-xl border bg-white p-3 dark:bg-[#202124]">
                    <div className="text-xs font-medium">Preview changes</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><div className="font-medium">Before</div><pre className="whitespace-pre-wrap rounded bg-[#f8f9fa] p-2 dark:bg-[#303134]">{showPreviewChanges.before.slice(0, 500)}</pre></div>
                      <div><div className="font-medium">After (AI)</div><pre className="whitespace-pre-wrap rounded bg-[#e8f0fe] p-2 dark:bg-[#394457]">{showPreviewChanges.after.slice(0, 500)}</pre></div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => { addNotification({ title: "Changes applied", message: "Cleaning suggestion applied (demo). Replace cells manually as needed.", type: "success" }); setShowPreviewChanges(null); }} className="rounded-full bg-[#1a73e8] px-3 py-1 text-xs font-medium text-white">Apply</button>
                      <button onClick={() => setShowPreviewChanges(null)} className="rounded-full border px-3 py-1 text-xs">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Select a spreadsheet</div>
      )}
    </div>
  );
}
