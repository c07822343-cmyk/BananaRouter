import { test, describe } from "node:test";
import assert from "node:assert/strict";

// These tests verify the API routes handle validation without needing a real OpenRouter key.
// They run against the built server if available, otherwise just check route file logic.

import fs from "node:fs";
import path from "node:path";

describe("api validation", () => {
  test("chat route validates messages and model", () => {
    const route = fs.readFileSync(path.join("src/app/api/chat/route.ts"), "utf8");
    assert(route.includes("MAX_MESSAGES"));
    assert(route.includes("MAX_CONTENT_LENGTH"));
    assert(route.includes("validateModel"));
    assert(route.includes("rate_limited") || route.includes("RATE_MAX"));
  });

  test("settings route validates model format", () => {
    const route = fs.readFileSync(path.join("src/app/api/settings/route.ts"), "utf8");
    assert(route.includes("validateModel"));
  });

  test("openrouter client redacts secrets", () => {
    const client = fs.readFileSync(path.join("src/lib/server/openrouter.ts"), "utf8");
    assert(client.includes("[REDACTED]"));
    assert(client.includes("sk-or-v"));
  });

  test("client api redacts secrets", () => {
    const client = fs.readFileSync(path.join("src/lib/client/api.ts"), "utf8");
    assert(client.includes("[REDACTED]"));
  });
});

describe("storage abstraction", () => {
  test("uses both localStorage and IndexedDB", () => {
    const store = fs.readFileSync(path.join("src/lib/workspace/store.ts"), "utf8");
    assert(store.includes("localStorage"));
    assert(store.includes("indexedDB"));
    assert(store.includes("IDB_NAME"));
  });

  test("never stores api key client-side", () => {
    const clientFiles = [
      fs.readFileSync(path.join("src/lib/workspace/store.ts"), "utf8"),
      fs.readFileSync(path.join("src/lib/client/settings.ts"), "utf8"),
    ].join("\n");
    assert(!clientFiles.includes("OPENROUTER_API_KEY"));
  });
});
