# BananaRouter — Private AI Desktop

A private AI desktop environment for a very small number of users. It looks like a sleek, minimal desktop OS that happens to run in the browser — not a SaaS product, not a landing page, not a Google Workspace clone.

> **Brand icon:** place your supplied vector/raster at `public/branding/banana-router-icon.svg` (preferred) or `.png` (≥256 transparent). `src/components/branding/BananaLogo.tsx` loads `svg → png → clean “B” on #F6C446` fallback with `object-contain` preserved aspect. Used for top bar, launcher, loading, favicon, PWA. Docs in `public/branding/README.md`.

```
Browser (BananaRouter desktop, local sessions, offline)
  ↓
Local Next.js backend (server-side API key, validation, tool policy, streaming)
  ↓
OpenRouter API https://openrouter.ai/api/v1/chat/completions
  ↓
Selected model (openrouter/free by default, Free Router)
  ↓
Streamed SSE → BananaRouter → Browser
```

## Design

Quiet, dark-first, lots of negative space, subtle borders/shadows, 100–200ms animations, system typography, `120 kB / 222 kB` first load. 90% content / 8% controls / 2% branding. The BananaRouter icon provides most brand personality; no gradients/blobs/glass/neon, no marketing copy.

## Desktop

- **Background** `DesktopBackground.tsx` — dark `#09090b` with barely visible radial lighting + 4% noise + 2% grid. Disappears behind windows.
- **Top system bar** `TopSystemBar.tsx` — 32px thin, `BananaRouter` + icon left · window title pill center · `● Connected / ○ Offline` + model (`Free Router` / `openrouter/free`) + Settings + clock right. Extremely compact.
- **Launcher** `Launcher.tsx` — click BananaRouter or `Cmd/Ctrl+Space` (also `Cmd/Ctrl+K`). Search: Chat, Files, Tool Explorer, MCP, Sessions, Settings. Feels like an OS launcher, not nav.
- **Window system** `DesktopWindow.tsx` — draggable title bar, resize handle, focus (bring to front via zIndex), close/minimize, subtle shadow, `border-white/10`, `bg-[#1a1a1e]` / `bg-[#121214]`. Windows: Sessions, Files, Tool Explorer, MCP, Settings. Main **AI Workspace** is always present as central window (not a dashboard).
- **Central AI workspace** — conversation + composer only. No dashboard, no analytics. Open → type immediately.

## AI Chat — clean editor style

```
BANANAROUTER
────────────────────
User
What can you do with this project?

BananaRouter
I can inspect the available tools...
────────────────────
```

`ChatDesktop.tsx` + `MessageBubble.tsx` (document-style, not big rounded bubbles) — `You` vs `BananaRouter` sections, `15px/1.7` prose, divider per turn, `max-w 720px`, actions (Copy/Regenerate/Retry) appear only on hover. `ErrorBanner` native: `OpenRouter request failed · Retry · Details`, no stack dump. Code blocks: highlight, copy, language, scroll. Markdown sanitized.

Composer `MessageComposer`-inspired central control — `Ask BananaRouter…` auto-growing ≤180px, `Enter` send / `Shift+Enter` newline, drag-drop files become context chips, `+` attach, model hint, tokens, `Stop` aborts request gracefully. Streaming smooth, `Jump to latest` when scrolled, partial preserved.

Model display subtle: `Free Router` or `openrouter/free` pill — click opens model selector. No giant model dashboard.

## Tool-Centric Architecture

```
USER → BANANAROUTER → CONTEXT → TOOLS / MCP → OPENROUTER → MODEL → TOOL CALLS? → RESULTS → FINAL RESPONSE
MODEL = orchestration · BANANAROUTER = policy/execution · TOOLS = capabilities · model never gets unrestricted system access
```

- **Registry** `src/lib/tools/types.ts` + `registry.ts` — centralized `ToolDefinition {id,name,description,inputSchema,permission,handler,source,enabled,group}`. Helpers: `getToolRegistry()`, `searchTools()`, `toOpenRouterTools()` (sends first 12 enabled as OpenAI-style `type:function`), `requiresApproval()`, localStorage `bananarouter:tool-enabled`.
- **Built-ins** (genuinely useful only): `files.list|read|search|create`, `workspace.search|context`, `time.now`, `calc.evaluate`, `json.format` — groups Files/Search/Context/System/Text. No pointless tools.
- **Tool Explorer** `ToolExplorer.tsx` — grouped by `Files/Search/System` + `MCP:*`, search, permission badge, enable/disable toggle, source label, `MODEL proposes → BANANAROUTER checks → TOOLS execute`.
- **Web tooling** — architecture ready for web search/browser tool via MCP; `AI inference` separated from `external retrieval`; no fake web access if no provider.
- **Tool search** — if many tools, only relevant subset sent; AI can `searchTools` / `tool_search` to discover.

## Permissions & Approvals

- **Permissions** `READ | WRITE | DELETE | NETWORK | SYSTEM` — `files.read = READ`, `files.create = WRITE`, deletion = `DELETE`, web = `NETWORK`, sensitive = `SYSTEM`.
- **ApprovalDialog** `ApprovalDialog.tsx` — for `WRITE/DELETE/NETWORK/SYSTEM` shows: `Tool wants to: Delete 4 files` + args JSON + `Allow Once / Always Allow / Deny`. No silent destructive actions. User controls availability.
- **Sandboxing** — permission checks server-side (`requestOpenRouter` + `/api/chat` validation), no arbitrary model code execution, `validateAndBuildMessages`, `validateModel`, file path + JSON validation, HTML sanitization.

## MCP Architecture (Model Context Protocol)

Abstraction for external tools — not hard-coded services.

```
MCP Server → Tools · Resources · Prompts → BananaRouter → OpenRouter
```

- **Types** `src/lib/mcp/types.ts` — `MCPServerConfig {id,name,transport,status,url|command,enabled}`, `MCPToolDef`, `MCPResource {uri,name,mimeType,serverId}`, `MCPPrompt`. Transports actually supported: `stdio` (backend), `sse`, `http` (streamable). No pretend.
- **Manager** `src/lib/mcp/manager.ts` — `loadMcpServers()`/`saveMcpServers()` (`localStorage bananarouter:mcp-servers`), `add/update/remove`, `testMcpConnection()` (GET probe for http/sse, registers discovered tools via `registerMcpTool` as `mcp.<serverId>.<tool>`), `disableMcpToolsForServer()`. Credentials stored locally, never in prompts, never logged.
- **UI** `MCPPanel.tsx` — Servers tab (`Name · ● Connected 12 tools / ○ Disabled`, Transport, Test/Edit/Remove, Enabled toggle) + Resources tab (`MCPResources.tsx` — Server/Resource/Type/Status, Open/Inspect/Use as context, only selected sent). Prompts visible where server provides them. No fake servers — only configured.
- **Discovery** — on connect: discover tools/resources/prompts, validate schemas, register dynamically, allow per-tool disable. `searchTools()` keeps context small.

## Context & Sessions

- **Context system** `buildContextText(ctx)` — from `AIContext {currentView,selectedDocument,selectedFiles (max 4, truncated),selectedNote,selectedSpreadsheet,selectedTasks,selectedMessages}` + `MCP resources` + previous results. Minimal, relevant only; `truncateContext(12k)` + citations `Based on: …`.
- **Window management** — large conversations/files/tool results handled via truncation/summarization/chunking, relevant selection, not blindly exceeding limit.
- **Sessions** (not “conversations”) — `WorkspaceState.conversations` migrated as Sessions `{messages,context,toolUsage,attachments,metadata}`. Ops: New/Rename/Delete/Duplicate/Search. `SessionsPanel.tsx` slide-out style: Today/Yesterday/Older, search, duplicate/delete. Minimal, not giant sidebar.
- **Files** `FilesPanel.tsx` — compact Files panel (not Drive clone): Browse/Search/Attach/Open/Delete, drag to chat → chips `filename type size`, preview (text/markdown JSON/table). AI uses selected files only when user explicitly attaches.
- **Workflow history** — lightweight `ToolActivity.tsx` compact: `Using filesystem… Completed` with expand for `Tool name / Arguments / Result / Duration`, `Completed` etc., not raw logs unless clicked.

## General AI Workflow Engine

Reusable: `Trigger → Context → AI step → Tool step → Condition → Output`. Example user asks “Find TODOs and summarize”: AI interprets → `filesystem.search` → results → AI analyzes → final answer. User never manually configures steps. Orchestration server-side where appropriate; tool calling where model supports it (`tools` forwarded to OpenRouter, `tool_call` → approval → execution → result returned to model → continue). Capability awareness via model metadata (streaming/tool-calling/vision/context length).

## OpenRouter Integration (AI Engine)

BananaRouter itself is **not a model**. Architecture:

```
BananaRouter UI → BananaRouter backend → OpenRouter API → Selected model → Response → BananaRouter
```

- `src/lib/server/openrouter.ts` + `src/app/api/chat/route.ts` — validates `messages/model/size`, rate-limits 60/min/IP, proxies to `https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer <key>`, `HTTP-Referer`, `X-Title`, supports `tools` + `tool_choice` passthrough (where model supports function calling), streams SSE or JSON, handles `stream` / `choices[0].delta.content` + `tool_calls`, structured errors (`missing_api_key 401`, `rate_limited 429`, `context_limit` etc.) with `category/retryable`, secrets redacted via `redactSecrets()`. No local models / Ollama / downloads.
- `src/lib/client/api.ts` `streamChat()` — sends `tools` from `toOpenRouterTools()` when enabled, handles `data: [DONE]`, `usage`, `tool_calls` deltas, abort, partial preservation.
- Settings: model picker live catalog from `https://openrouter.ai/api/v1/models` (free/paid, context, provider, pricing) fallback to config; fallback behavior configurable, never silently moves to paid when free-only.
- Attachments: ` {id,name,type,size,location,textContent,metadata}` abstraction for future workflows.

## Settings — minimal native preferences

`SettingsDesktop.tsx` — sections only: **AI / OpenRouter** (API key server-side, default model `openrouter/free`, Free Router, temperature, maxTokens) · **Tools** (via Tool Explorer) · **MCP** (via MCP panel Add/Edit/Enable/Remove/Test) · **Appearance** (Dark/Light, same structure) · **Storage** (Export/Import/Clear, local sessions/preferences/metadata) · **Developer** (off by default). No pricing/billing/marketing.

- **MCP Settings** — Add server (name/transport/url|command+args/env), enable/disable, remove, test connection, status, tools count. Sensitive env not echoed in plaintext.
- **Developer Mode** — AI requests, tool calls, MCP status, model, duration, tokens if available, backend diagnostics. `RequestInspector` shows sanitized: model, message count, input/output size, tools available/used, duration, HTTP status — **never** API key / Authorization. Emits `bananarouter:request` event from chat.

## Security & Data

- **Reviews**: `redactSecrets()` everywhere, `validateModel` regex `^[A-Za-z0-9._:/-]+$`, `MAX_MESSAGES 200`, `MAX_CONTENT_LENGTH 100k`, `MAX_BODY_BYTES 1.5M`, file 10 MB, JSON shape checks, no `eval`.
- **Isolation**: `MODEL` ≠ `BANANAROUTER` ≠ `TOOLS`.
- **Local data**: `localStorage openrouter-workspace-v2` + `IndexedDB openrouter-chat/workspaces/workspace-v2` migrated, autosave 600 ms `beforeunload` flush, `Saving…/Saved/Offline`. Never store `OPENROUTER_API_KEY` in browser, never MCP creds insecurely.
- **Observability**: `ApiError {code,message,detail,status,category,retryable}`, server logs INFO/WARN/ERROR/DEBUG (DEBUG off by default), redacted.

## Local Data & Migration

Stored locally: Sessions, preferences, workspace metadata, tool config where safe. Old `conversations` auto-migrated to Sessions; files/docs retained but not shown as Drive clone unless user opens Files. No secret leakage. MCP credentials not stored insecurely.

## Environment

Provide `.env.example` (no real secret). If key was previously in repo, remove and rotate.

```ini
# .env.example — copy to .env.local (git-ignored)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
APP_NAME=BananaRouter
APP_DESCRIPTION=BananaRouter — An AI-powered workspace built around OpenRouter.
APP_URL=http://localhost:3000
OPENROUTER_TEMPERATURE=0.7
OPENROUTER_TIMEOUT_MS=120000
OSS_APP_VERSION=1.0.0
# MCP servers configured via UI (MCP Settings) -> localStorage bananarouter:mcp-servers
```

**Centralized** `src/lib/server/config.ts` (`DEFAULT_MODEL=openrouter/free`, `DEFAULT_APP_NAME=BananaRouter`, `getRuntimeApiKey()`), MCP separate from UI state.

**Icon location:** `public/branding/banana-router-icon.png` or `.svg` — extremely easy to place; fallback `B` if missing.

## Startup

```bash
npm install
cp .env.example .env.local
# edit .env.local → set OPENROUTER_API_KEY=sk-or-v1-... (from https://openrouter.ai/keys)
npm run dev      # http://localhost:3000 (dark desktop immediately)
# or
npm run build && npm run start
npm run typecheck # tsc --noEmit
npm test          # node --test (22 tests)
```

First run: set OpenRouter key (optionally MCP), then immediately type in AI workspace — no 10-step tutorial. Subtle BananaRouter icon while initializing.

- **Shortcuts:** `Cmd/Ctrl+Space` launcher, `Cmd/K` search, `Cmd/N` new session, `Cmd/Shift+P` command palette, `Cmd/,` settings, `Esc` close.
- **Command palette:** New Session, Search, Open Files/Tools/MCP/Settings, Switch Model, Toggle Theme, Developer Mode.
- **Drag-drop:** drop file into chat → contextual attachment chips.

## Typo / Icons / Theme

System font, native desktop feel, small text, comfortable `max-w 720px`. One icon library `lucide-react`, small/subtle. Dark default (`Background #09090b / Surface #121214 / Elevated #1a1a1e`), light mode same structure.

## No Commercial Language

Uses: `New Session, Tools, Models, Settings, Files, Connect` — not “Supercharge your productivity.” No pricing/subscriptions/billing/plans/upgrade/testimonials/logos/enterprise.

## No Fake Data

Everything from actual state: sessions/files/tools/resources/notifications. No generated fake chats/files/MCP servers/tools/stats/integrations. Counts shown are real (`state.conversations.length`, `state.files.length`, `registry.length`).

## Technical Language

Workspace / Session / Tools / Files / Context — not corporate fluff. Persona: helpful, direct, intelligent, calm, technical when necessary.

## Visual Hierarchy

90% content, 8% controls, 2% branding — app disappears while working.

## What is Fully Functional

- OpenRouter API streaming, sessions (new/rename/delete/duplicate/search, Today/Yesterday/Older), minimal history slide-out
- Files (browse/search/attach/open/delete, upload 10 MB, preview, drag-drop, only selected sent)
- Context (relevant only, truncated 12k, citations, large handling)
- Tool registry + built-ins (Files/Search/System/Text) + MCP architecture (servers/resources/prompts discovery, transports stdio/sse/http, per-tool enable)
- Permissions (`READ/WRITE/DELETE/NETWORK/SYSTEM`) + approvals (`Allow Once/Always/Deny`)
- General workflow engine + orchestration (AI selects tools, calls, reads results, continues)
- Tool calling where model supports it (tools passed to OpenRouter, tool_calls handling prepared)
- MCP server manager (add/edit/enable/disable/remove/test, status ● Connected / ○ Disabled, tools count)
- Model selection (Free Router `openrouter/free`, live catalog, fallback configurable)
- Dark-first polished minimal desktop, window system (open/close/minimize/resize/focus), launcher `Cmd+Space`, command palette, shortcuts, drag-drop, copy/regenerate/retry, code highlight, markdown sanitized, streaming smooth with abort, 120 kB bundle, fast startup with subtle icon
- Secure config (`APP_NAME=BananaRouter`), env safety, data migration, request inspector (sanitized)

## What Remains Intentionally Unimplemented

- Real remote MCP stdio spawning requires BananaRouter backend process — stdio servers configured via UI show guidance and require backend; http/sse probe actually tests connectivity but full tool execution is stubbed to local registry (no fake remote tool results shown as real unless server actually responds)
- Web-search/browser tools are prepared architecturally but require a configured provider (no pretend web access)
- Vector DB / paid embeddings / unlimited hidden memory — stubbed interfaces only
- Google Workspace clones (Docs/Sheets/Gmail/Calendar/Drive/Tasks/Keep) removed — not rebuilt; existing stored docs/files still migrated but not shown as separate apps
- Billing/pricing/subscriptions — private tool, not added

## Final Architecture Summary

```
DesktopBackground → TopSystemBar → DesktopShell
  ├─ AI Workspace (ChatDesktop + MessageBubble + Composer)
  ├─ Windows: SessionsPanel / FilesPanel / ToolExplorer / MCPPanel+MCPResources / SettingsDesktop (+Developer+RequestInspector)
  ├─ Launcher (Cmd+Space) + CommandPalette (Cmd+Shift+P)
  └─ ToolActivity + ApprovalDialog (permissions)

Context: AIContext + truncate(12k) + citations
Tools: Registry (builtin + mcp.<server>.<tool>) + ToolExplorer + Approval
MCP: Manager (load/save/test) + discovery → registerMcpTool
OpenRouter: /api/chat ↔ openrouter.ts ↔ streamChat ↔ executeAI

Storage: localStorage + IndexedDB (openrouter-chat) 600ms autosave
Security: redactSecrets, validateModel, isolation MODEL≠BANANAROUTER≠TOOLS, no secret in bundle/storage/export
Config: .env.example (OPENROUTER_API_KEY, OPENROUTER_MODEL=openrouter/free, APP_NAME=BananaRouter) + public/branding/icon
```

*BananaRouter is a private power tool for two technical users — beautiful because simple, powerful because of its architecture, never trying to sell anything.*
