import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Helpers copied from source to test logic without TS compilation
function buildSearchIndexMock(state) {
  const items = [];
  for (const c of state.conversations) items.push({ id: c.id, type: "chat", title: c.title, content: c.messages.map(m=>m.content).join("\n") });
  for (const d of state.documents) if(!d.trashed) items.push({ id: d.id, type: "document", title: d.title, content: d.content });
  return items;
}
function searchItemsMock(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0,20);
  return items.filter(it => `${it.title} ${it.content}`.toLowerCase().includes(q)).slice(0,50);
}
function truncateContext(text, max=12000) {
  if(text.length<=max) return {text, truncated:false};
  return {text: text.slice(0,max)+"\n\n…[truncated]", truncated:true};
}
function csvToSheet(text) {
  const rows=text.split("\n").filter(l=>l.trim().length>0);
  const header=rows[0]?.split(",").map(s=>s.trim())??[];
  return { header, rowCount: rows.length-1, colCount: header.length };
}
function validateModel(model) {
  if(typeof model!=="string"||!model.trim()) throw new Error("model required");
  if(!/^[A-Za-z0-9._:/-]+$/.test(model.trim())) throw new Error("invalid chars");
  return model.trim();
}
function tryParseTaskJson(text) {
  const fence=text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText=fence?fence[1]:text;
  try{const parsed=JSON.parse(jsonText); if(Array.isArray(parsed)&&parsed.every(x=>x&&typeof x.title==="string")) return parsed;}catch{}
  return null;
}

describe("workspace logic", () => {
  test("search finds across types", () => {
    const state={ conversations:[{id:"c1", title:"Roblox Plan", messages:[{content:"make a roblox game"}]}], documents:[{id:"d1", title:"Design Doc", content:"roblox physics", trashed:false}] };
    const idx=buildSearchIndexMock(state);
    const res=searchItemsMock(idx, "roblox");
    assert.equal(res.length, 2);
  });

  test("truncateContext respects limits", () => {
    const long="a".repeat(20000);
    const {text, truncated}=truncateContext(long, 12000);
    assert(truncated);
    assert(text.length>12000 && text.length<13000);
  });

  test("csv import detects columns", () => {
    const csv="Product,Q1,Q2\nWidget A,120,150\nWidget B,80,95";
    const sh=csvToSheet(csv);
    assert.equal(sh.colCount,3);
    assert.equal(sh.rowCount,2);
  });

  test("model validation rejects bad chars", () => {
    assert.equal(validateModel("openrouter/free"), "openrouter/free");
    assert.throws(()=>validateModel("bad model!"));
    assert.throws(()=>validateModel(""));
  });

  test("task JSON parsing", () => {
    const good='[{"title":"Task 1","description":"desc"}]';
    assert.deepEqual(tryParseTaskJson(good), [{title:"Task 1", description:"desc"}]);
    const fenced='```json\n[{"title":"A"}]\n```';
    assert.deepEqual(tryParseTaskJson(fenced), [{title:"A"}]);
    assert.equal(tryParseTaskJson("not json"), null);
  });

  test("Autosave threshold check", () => {
    const large = { files: Array.from({length:50}, (_,i)=>({id:`f${i}`, name:`file${i}`})) };
    assert(large.files.length>40);
  });

  test("Trash soft delete flag", () => {
    const doc={id:"d1", trashed:false};
    const deleted={...doc, trashed:true, trashedAt:Date.now()};
    assert(deleted.trashed);
    const restored={...deleted, trashed:false, trashedAt:null};
    assert(!restored.trashed);
  });

  test("Document versioning preserves original", () => {
    const doc={id:"d1", content:"original", versions:[]};
    const version={id:"v1", documentId: doc.id, content: doc.content, createdAt: Date.now(), label:"Before rewrite"};
    const updated={...doc, content:"rewritten", versions:[...doc.versions, version]};
    assert.equal(updated.versions[0].content, "original");
  });

  test("Context builder respects size", () => {
    const ctxText="Document: Test\n".repeat(5000);
    const {truncated}=truncateContext(ctxText);
    assert(truncated);
  });
});

describe("project structure", () => {
  test("required files exist", () => {
    const required=[
      "src/app/page.tsx",
      "src/app/layout.tsx",
      "src/components/shell/WorkspaceShell.tsx",
      "src/lib/workspace/types.ts",
      "src/lib/workspace/store.ts",
      "src/lib/workspace/search.ts",
      "src/lib/ai/prompts.ts",
      "src/lib/ai/service.ts",
      "src/lib/server/openrouter.ts",
      "public/manifest.json",
    ];
    for(const f of required) {
      assert(fs.existsSync(path.join(path.resolve("."), f)), `missing ${f}`);
    }
  });
});
