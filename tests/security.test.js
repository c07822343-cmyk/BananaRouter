import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname ?? ".", "..");

describe("security", () => {
  test("API key not in client bundle files", async () => {
    const files = [
      "src/lib/client/storage.ts",
      "src/lib/client/settings.ts",
      "src/app/page.tsx",
    ];
    for (const f of files) {
      const content = fs.readFileSync(path.join(root, f), "utf8");
      assert(!content.includes("OPENROUTER_API_KEY"), `${f} should not contain OPENROUTER_API_KEY`);
      assert(!/sk-or-v1-[A-Za-z0-9_-]{10,}/.test(content), `${f} should not contain literal sk-or key`);
    }
    // api.ts is allowed to contain the redaction regex /sk-or-v/, but must not contain a real key literal
    const apiContent = fs.readFileSync(path.join(root, "src/lib/client/api.ts"), "utf8");
    assert(!apiContent.includes("OPENROUTER_API_KEY"));
    // ensure it contains redaction logic but not a hard-coded key value
    assert(apiContent.includes("[REDACTED]"));
    assert(!apiContent.includes("sk-or-v1-"));
  });

  test(".env.example has no real key", () => {
    const content = fs.readFileSync(path.join(root, ".env.example"), "utf8");
    assert(content.includes("OPENROUTER_API_KEY="));
    // ensure placeholder, not a real key pattern with 20+ chars after sk-or
    const hasRealKey = /sk-or-v1-[A-Za-z0-9_-]{20,}/.test(content);
    assert(!hasRealKey, ".env.example must not contain a real key");
  });

  test("export does not include secrets", () => {
    const store = fs.readFileSync(path.join(root, "src/lib/workspace/store.ts"), "utf8");
    assert(store.includes("buildWorkspaceExport"));
    // ensure we never export apiKey
    assert(!store.includes("apiKey"));
    assert(store.includes("notifications") || store.includes("workspace"));
  });

  test("markdown does not use dangerouslySetInnerHTML directly for user content", () => {
    const files = fs.readdirSync(path.join(root, "src/components"));
    // just check MarkdownMessage uses react-markdown
    const md = fs.readFileSync(path.join(root, "src/components/chat/MarkdownMessage.tsx"), "utf8");
    assert(md.includes("react-markdown"));
    assert(!md.includes("dangerouslySetInnerHTML"));
  });

  test("server config reads key only server-side", () => {
    const cfg = fs.readFileSync(path.join(root, "src/lib/server/config.ts"), "utf8");
    assert(cfg.includes("getRuntimeApiKey"));
    assert(cfg.includes("process.env.OPENROUTER_API_KEY"));
  });

  test("import validation does not execute code", () => {
    const storage = fs.readFileSync(path.join(root, "src/lib/workspace/store.ts"), "utf8");
    assert(storage.includes("JSON.parse"));
    assert(!storage.includes("eval("));
    assert(!storage.includes("Function("));
  });
});
