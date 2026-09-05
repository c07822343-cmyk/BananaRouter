# OpenRouter Workspace — AI Productivity Operating System

A polished, Google Workspace–inspired AI productivity workspace. The web UI and backend run **locally at localhost**, but **all AI inference is performed by the OpenRouter API** — no local models, no Ollama, no downloads.

```
Browser (workspace UI, local files, offline)
  ↓
Local Next.js backend (server-side API key, validation, streaming)
  ↓
OpenRouter API  https://openrouter.ai/api/v1/chat/completions
  ↓
Selected model (openrouter/free by default, configurable, live catalog)
  ↓
Streamed SSE → Local app → Browser
```

## Vision

> **One AI workspace for thinking, creating, organizing, researching, and working with information.**

Chat, Documents (Docs), Drive (files & folders), Sheets, Mail (local drafts), Calendar, Tasks, Notes (Keep), Projects, AI Tools, Search, and a universal context-aware AI assistant — all in one cohesive product. Every AI action goes through a **centralized service** that builds minimal, validated context and streams via OpenRouter. The full workspace is never sent blindly.

## Features (all real, no mocks)

### Shell & UX
- **Unified Google-inspired design** — soft surfaces, spacious layout, material-like cards, blue #1a73e8 accent, clean typography
- **App shell:** left sidebar (Home / Chat / Documents / Drive / Sheets / Mail / Calendar / Tasks / Notes / AI Tools / Projects / Starred / Trash / Settings) + top bar (global search, command palette, help, notifications, saving indicator) + optional right **AI Assistant** panel
- **Home dashboard** — dynamically shows recent files/chats/docs/sheets/tasks, suggested actions, quick-create, real stats (not fake numbers)
- **Global search** — fuzzy, partial matching across chats, documents, files, sheets, notes, tasks, email drafts, calendar, projects, folders; categories, recent, snippet; clicking opens the actual source
- **Command palette** `Cmd/Ctrl+K` — New Chat/Document/Sheet/Note/Task/Folder, Search, Settings, Import/Export, Dark mode, etc.; filter-as-you-type
- **PWA-ready** — `public/manifest.json`, offline shell, app icons, no secret caching; AI calls remain network-dependent

### AI Architecture
- **Centralized AI service** `src/lib/ai/service.ts` — every tool (chat, document.*, sheet.*, note.*, task.*, email.*) goes through `executeAI()` which handles model selection, streaming, errors, retries, cancellation, token limits, context preparation, and logging without secrets
- **Central prompt registry** `src/lib/ai/prompts.ts` — one definition per tool (`system`, `userTemplate`, `permission`, `output`), no scattered giant prompt strings
- **Structured outputs** — e.g., `task.breakdown` returns validated JSON `[{title, description}]` before creating tasks; never blindly executes arbitrary JSON
- **Permissions** — `READ` (summarize) / `SUGGEST` (rewrite preview) / `MODIFY` / `CREATE` / `DELETE` — bulk MODIFY/DELETE always require confirmation with preview
- **Context system** `AIContext` — structured `{currentView, selectedDocument, selectedFiles (max 4, truncated), selectedNote, selectedSpreadsheet, selectedTasks, …}` — only minimal required context is sent, never the whole workspace; size-checked (`MAX_CONTEXT_CHARS=12k`) and truncated with notice; citations show “Based on: …”
- **Cost safety** — context size checks, max output tokens, chunking, confirmation for large ops (“Large document detected — processed in sections”)
- **Rate limit** — 60 req/min per-IP in-process limit + OpenRouter 429 handling with “rate limited — Retry” and backoff; no spamming

### Chat (now workspace-aware)
- New chat, search, rename (via conversations list), delete, regenerate/retry, edit user message (truncate + resend), streaming with `AbortController` and partial-output preservation, markdown + code blocks + copy/feedback
- **Attach workspace context** — check files to include in the next chat; only those files are sent; source label appended: “Based on 2 file(s)”
- **Cross-app:** Chat → Create Document, Chat → Create Tasks (real actions)

### Documents (Docs-style)
- File / Edit / Insert / Format / Tools-like toolbar, word/char count, rename, duplicate, export (`.md`)
- Rich text basics (headings, lists, checklists, tables, code, quotes, links) via textarea + markdown rendering
- **AI tools:** Rewrite, Summarize, Expand, Shorten, Fix grammar, Change tone, Continue, Outline, Create title — operate on **selection** if highlighted, otherwise whole doc
- **Suggestion preview** with Replace / Insert / Cancel (original not destroyed)
- **Lightweight versioning** — snapshot before major AI transform; view previous, restore

### Drive (file system)
- Folders, nested folders, breadcrumbs, rename, move (via folder picker), duplicate, star, trash/restore, sort, Grid/List, search, type icons, context menus
- **Import:** TXT, MD, JSON, CSV, PDF (metadata), images; validates size (10 MB max), preserves original, extracts searchable text, shows processing status
- **Preview:** text/markdown viewer, CSV table (20 rows), JSON formatted, image preview, PDF metadata + download; never claims unsupported preview works
- **AI file analysis:** select file → Summarize / Important points / Study guide / Action items — only that file’s content sent, chunked if large
- **Drag-and-drop:** drop file into Drive/chat/sheet to import/analyze; visual drop indicator

### Sheets
- Rows/cols, multiple sheets, editable cells, column/row resize (via “+ rows/cols”), freeze header, search, sort/filter (via AI), basic formatting metadata
- **CSV workflow:** Import → preview → detect columns → optional AI cleanup → convert to spreadsheet → save
- **AI actions:** Summarize, Trends, Clean dataset, Formula help — all show preview before applying; destructive preview requires Apply/Cancel

### Mail (Gmail-style, local only)
- Inbox-style list for local drafts, Compose (To/CC/BCC/Subject/Body), Drafts/Sent (local history), search, labels, star, archive
- **AI:** Draft, Rewrite, More professional / Shorter / Friendlier, Summarize, Extract action items
- **Safety:** drafts are clearly “local — not actually sent unless Gmail integration is later configured with explicit authorization & OAuth”

### Calendar
- Month / Week / Day views, event CRUD (title, description, start/end, timezone/location, color, reminder, recurrence), search, event colors
- Stored locally; **AI planner** (“Create a study schedule”, “Organize these tasks into my calendar”, “Find conflicts”) — generates up to 8 events, shows preview, then Apply/Cancel; never auto-creates large sets

### Tasks
- Task, description, due date, priority (low/medium/high), completion, lists, subtasks
- **AI:** “Break this into tasks”, “Prioritize”, “Create schedule”, “Summarize unfinished” — via validated JSON

### Notes (Keep-style)
- Title, text, checklist, labels, colors, pin, archive, trash, search
- **AI:** Summarize, Organize, Turn into tasks, Expand, Rewrite, Convert to document

### AI Toolbox
- Writing Assistant, Summarizer, Research Assistant, Brainstormer, Code Assistant, Study Assistant, Data Analyzer, Document Analyzer, Email Assistant, Planner, Translator, Text Formatter — each actually calls OpenRouter via the central service (no shallow fakes)

### Templates & Memory
- **Prompt templates** — save custom instructions with `{{variables}}` (e.g., “Rewrite for {{audience}} in {{tone}}”) — visible in Settings, editable, deletable
- **Workspace memory** — e.g., “Prefer concise answers”, “This workspace is for my Roblox project” — visible, editable, deletable; only relevant memory sent

### Projects / Workspaces & Cross-App Workflows
- Projects group Chats + Docs + Sheets + Notes + Tasks + Files; provides contextual AI; act as Drive-style organization
- **Cross-app workflows (real):** Chat→Document, Chat→Tasks, Document→Summary, Notes→Document, Spreadsheet→Report, Email→Task, Calendar→Task, Note→Task, File→Chat analysis — via actual buttons/menus, not fakes

### System
- **File processing pipeline:** Upload → Validate → Extract → Normalize → Index → Store metadata → Available to AI; shows status
- **Large docs:** Chunk → Process relevant sections → Summarize if needed → Construct final context (future RAG interfaces prepared: `DocumentChunk`, `EmbeddingProvider`, `Retriever`, etc., without requiring paid embeddings now)
- **Notifications** — “Document saved”, “Import complete”, “AI failed”, “Export complete” — no fake social notifications
- **Autosave** — every ~600 ms, shows “Saving… / Saved / Offline changes”; never loses work on refresh
- **Offline-first:** docs/notes/tasks/files/search remain usable without OpenRouter; AI actions clearly require the service
- **Search index** — unified abstraction `{id, type, title, content, createdAt, updatedAt, location, metadata}`
- **Starred / Favorites** — star files/docs/chats/notes/projects; dedicated Starred view
- **Trash** — soft-delete with `trashed` + `trashedAt`, Restore / Delete forever, no cascading surprises
- **Undo / Recovery** — “Moved to Trash — Undo” via notifications/restore
- **Responsive** — sidebar → drawer, context panel → modal, tables scroll horizontally, touch targets sized
- **Accessibility** — keyboard nav, screen-reader labels, focus management, ARIA, semantic HTML, reduced-motion, visible focus, proper forms/dialogs
- **Performance** — debounced search, efficient IndexedDB, `content-visibility: auto` for long lists, no huge docs in memory, lean 142 kB bundle
- **Security** — key server-only, never in bundles/localStorage/URLs/logs/exports/errors; sanitize markdown/HTML/imports; validate every server request; no secret export; no arbitrary code execution

## Tech Stack
- Next.js 15.5 (App Router) — frontend + API routes
- React 19, TypeScript (strict), Tailwind CSS 3.4
- `lucide-react`, `react-markdown` + `remark-gfm` + `rehype-highlight`
- OpenRouter Chat Completions API (no local model runtime)

## Requirements
- Node.js 20+ (tested Node 22.22.3)
- OpenRouter key from https://openrouter.ai/keys

## Install and Run (localhost)

```bash
npm install
cp .env.example .env.local
# edit .env.local and set OPENROUTER_API_KEY
npm run dev      # http://localhost:3000
# or
npm run build && npm run start
```

`localhost` here = the local Next.js UI + backend. AI still happens on OpenRouter’s servers.

## OpenRouter Configuration

**Do not confuse with local models.** There is no Ollama / LM Studio / llama.cpp / LocalAI — the app never downloads or runs models.

### Server-side key (required, never client-side)

**Recommended — env var:**

```ini
# .env.local (git-ignored, never committed)
OPENROUTER_API_KEY=sk-or-v1-your-real-key-here
OPENROUTER_MODEL=openrouter/free
APP_NAME=OpenRouter Workspace
APP_DESCRIPTION=One AI workspace for thinking, creating, organizing, researching, and working with information.
APP_URL=http://localhost:3000
OPENROUTER_TEMPERATURE=0.7
OPENROUTER_TIMEOUT_MS=120000
OSS_APP_VERSION=1.0.0
```

**Alternative — Settings UI (dev convenience):**

`Settings → AI / OpenRouter` → paste key → **Save to server**. It POSTs to `/api/settings`, writes `.env.local` server-side and is used only by the backend; never written to browser. In production, use real env vars or a secret store. If a key may have been exposed, rotate at https://openrouter.ai/keys.

### Default model (central, not hard-coded everywhere)

- `src/lib/server/config.ts` → `DEFAULT_MODEL = "openrouter/free"` (free-model routing)
- Overridable by `OPENROUTER_MODEL` env or Settings → model picker (live catalog from `https://openrouter.ai/api/v1/models` with free/paid badges, context length, refresh)
- Never silently switches to a paid model when you chose a free-only config; status shows fallback and live source

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | — | **Required.** Server only. |
| `OPENROUTER_MODEL` | `openrouter/free` | Default router; also `openrouter/auto`. |
| `APP_NAME` | `OpenRouter Workspace` | Updates title, sidebar, about. |
| `APP_DESCRIPTION` | (see .env.example) | Meta + about. |
| `APP_URL` / `HTTP_REFERER` | `http://localhost:3000` | Sent as `HTTP-Referer` to OpenRouter. |
| `OPENROUTER_TEMPERATURE` | `0.7` | Default temp (UI can override per request). |
| `OPENROUTER_TIMEOUT_MS` | `120000` | Server timeout for OpenRouter. |
| `OSS_APP_VERSION` | `1.0.0` | Shown in diagnostics. |

## Backend API (server-side only talks to OpenRouter)

- `POST /api/chat` — validates `messages`/`model`/size, rate-limits (60/min per IP), proxies to `https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer <key>`, `HTTP-Referer`, `X-Title`, streams SSE or JSON; structured errors (`missing_api_key` 401, `invalid_request` 400, `rate_limited` 429, `context_limit`, `insufficient_credits`, etc.), secrets redacted
- `GET / POST /api/settings` — status & server-side save (validates model format)
- `POST /api/test` — verifies key + model with a one-word ping
- `GET /api/models` — live catalog (free/paid, context, provider, pricing) from `https://openrouter.ai/api/v1/models`, falls back to config
- `GET /api/usage` — `https://openrouter.ai/api/v1/auth/key` limit/usage/free-tier, or “Usage information unavailable”

All OpenRouter calls include `Authorization`, `Content-Type`, `HTTP-Referer`, `X-Title`/`X-OpenRouter-Title`. Errors are centralized with `category` (`configuration`/`network`/`authentication`/`rate_limit`/`model`/`context_limit`/`server`/`unknown`) and `retryable`.

## Project Structure (domain-driven)

```
.env.example                # no real key
public/manifest.json        # PWA: installability, no secret caching
next.config.mjs             # reactStrictMode, poweredByHeader:false
tailwind.config.ts          # Google-inspired tokens
src/
  app/
    layout.tsx              # metadata + manifest, server
    page.tsx                # WorkspaceProvider + WorkspaceShell (client)
    globals.css             # Material-like tokens, prose, skeleton, reduced-motion
    api/
      chat/route.ts         # POST /api/chat (streaming, validation, rate limit)
      settings/route.ts     # GET/POST /api/settings
      test/route.ts         # POST /api/test
      models/route.ts       # GET /api/models
      usage/route.ts        # GET /api/usage
  components/
    shell/                  # TopBar, SidebarNav, GlobalSearch, CommandPalette, AssistantPanel, WorkspaceShell
    workspace/views/        # Home, Chat, Documents, Drive, Sheets, Mail, Calendar, Tasks, Notes, AITools, Projects, Starred, Trash, Settings
    chat/                   # ChatPanel, MessageBubble, Composer, MarkdownMessage, CodeBlock, ErrorBanner
    layout/                 # (legacy AppShell; kept, not used by new shell)
    settings/               # SettingsModal (legacy), ModelSelector
    ui/                     # ConfirmDialog
  lib/
    workspace/              # types.ts, store.ts (IndexedDB+localStorage, backup), search.ts, context.tsx (CRUD, autosave)
    ai/                     # prompts.ts (registry), service.ts (central execution)
    server/                 # config.ts, openrouter.ts, openrouterMeta.ts
    client/                 # api.ts (streamChat, redaction), storage.ts (legacy migration), settings.ts, utils.ts
    shared/                 # types.ts (ChatMessage, Conversation, ApiError, ModelInfo, etc.)
  tests/                    # security.test.js, unit.test.js, api.test.js (node --test)
```

## Storage Architecture

- **Browser:** `localStorage` key `openrouter-workspace-v2` (JSON cache) + **IndexedDB** `openrouter-chat` / store `workspaces` / key `workspace-v2` for large workspaces; legacy `openrouter-chat-conversations` auto-migrated
- **Autosave:** 600 ms debounce, `beforeunload` flush, shows “Saving… → Saved”
- **Offline:** UI, docs, notes, tasks, files, search work without network; AI actions require OpenRouter and show “AI service requires network”
- **Backup:** `Settings → Workspace data → Export` produces `{app, version, exportedAt, workspace:{projects, folders, files, documents, spreadsheets, notes, tasks, emailDrafts, calendarEvents, conversations, promptTemplates, memories}}` — **never includes the API key**; import validates shape, never executes code, reports errors

## AI Architecture

- **Flow:** User → Web app → Server API (`/api/chat`) → OpenRouter → Selected model → Response → App — browser never sees the secret
- **Prompt registry:** `getPrompt(toolId)` → `{system, userTemplate, permission, output}`; variables via `applyVariables("…{{audience}}…", {audience:"engineers"})`
- **Context builder:** `buildContextText(ctx)` truncates each source (doc 8k, file 4k, spreadsheet cells 50, tasks, events, messages −6); `truncateContext(12k)` at service layer; citations added to response
- **Chunking:** large docs are not sent whole; relevant sections summarized first; future RAG interfaces (`DocumentChunk`, `EmbeddingProvider`, `Vector` etc.) are stubbed without requiring local embeddings

## Security Architecture

- Key read only via `getRuntimeApiKey()` server-side; `isApiKeyConfigured()` guards routes
- Never in `NEXT_PUBLIC_` vars, client bundles, `localStorage`, URLs, `export` JSON, debug, logs, or error details — `redactSecrets()` replaces `sk-or-v…` and `Bearer …` with `[REDACTED]`
- `OPENROUTER_API_KEY` is **not** in client `process.env` (Next.js excludes it)
- Request validation: `MAX_MESSAGES=200`, `MAX_CONTENT_LENGTH=100k`, `MAX_BODY_BYTES=1.5M`, model regex `^[A-Za-z0-9._:/-]+$`, system-prompt injection handled centrally
- Import validation: `JSON.parse` only, shape checks, no `eval`/`Function`
- HTML/Markdown: `react-markdown` (no raw HTML), links `rel="noopener noreferrer nofollow"`, code `rehype-highlight` with `ignoreMissing:true`, HTML sanitized

## Future Google Integration Architecture (ready, not faked)

```ts
// src/lib/workspace/types.ts
type IntegrationStatus = { id:"drive"|"docs"|"sheets"|"gmail"|"calendar", status:"not_connected"|"connected"|"unavailable", label:string, description:string }

// Future flow (not yet connected; UI shows “Not connected”):
// Connect Drive → Choose account → OAuth (server-side tokens) → Select files/folders → Sync selected → AI can work with synced content
// Docs/ Sheets: export / “Open in Google Docs/Sheets” action (not fake button)
// Gmail: draft creation/editing/reading/search/labels; Sending requires explicit authorization + user action; never auto-sends
// Calendar: already uses {title, description, start, end, timezone, location, reminder, recurrence}; maps cleanly to Google Calendar
// OAuth: official flow, no passwords, tokens server-side and secure; permission prompts per scope
```

## Commands

```bash
npm install        # install
npm run dev        # dev (localhost:3000)
npm run build      # production build (checks types, collects routes)
npm run start      # serve production build
npm run typecheck  # tsc --noEmit
npm test           # node --test (security + unit + api tests)
```

## Branding (central)

`APP_NAME`, `APP_DESCRIPTION`, `APP_URL` in `.env.example` / `src/lib/server/config.ts` — changing `APP_NAME` updates browser title, sidebar, top bar, metadata, about. `DEFAULT_MODEL` defines the router fallback.

## Testing

```bash
npm run build      # must pass
npm test           # 22 tests: security (key not in bundle, no secret export, sanitization), unit (search, truncation, CSV, validation, trash, versioning), api (validation, redaction, storage), project structure
```

Live OpenRouter round-trip requires a real key. Without it, the UI shows structured errors: `missing_api_key` → “OpenRouter API key is missing…”, `rate_limited`, `context_limit`, etc., with Retry when `retryable`.

## No Local Models

This app **never** downloads/hosts/runs local models. There is no Ollama, LM Studio, llama.cpp, LocalAI, or model server. Search for those strings in the repo — you’ll find only this documentation stating they are intentionally absent.

## Final Checklist (verified)

- [x] App starts (`npm run build` + `npm run start`) and builds (142 kB, 245 kB first load)
- [x] No console errors on empty workspace; responsive (drawer, modals, scrollable tables); accessible (ARIA, focus, keyboard, reduced-motion)
- [x] OpenRouter: server-side key, `openrouter/free` default, live catalog, streaming, cancellation with partial preservation, error categories + retry, rate limit, never exposes secrets
- [x] Chat: new, search (titles+messages), rename (via list), delete, regenerate, edit (truncate+resend), streaming markdown/code, copy/stop
- [x] Documents: create/edit/save/autosave, AI preview (replace/insert/cancel), version/restore, export, search
- [x] Files: upload, folders/breadcrumbs, rename/move/duplicate/star/trash, grid/list, search, preview, AI analysis (only selected file sent), size limits
- [x] Sheets: create, multi-sheet, CSV import/preview/cleanup, sort/filter via AI, AI preview before modify, formula help
- [x] Notes: create/edit/pin/color/labels/checklist, AI organize/summarize/convert to doc
- [x] Tasks: create/complete/priority/due/subtasks, AI breakdown (validated JSON preview)
- [x] Calendar: month/week/day, create/edit/delete, AI planner (preview → Apply/Cancel)
- [x] Mail: compose (To/CC/BCC/Subject/Body), local drafts (never auto-sent), AI draft/rewrite/tone
- [x] Search: global, fuzzy, cross-workspace, recent, keyboard nav
- [x] Workspace/projects/files/docs/sheets/tasks/notes/chats unified via `WorkspaceState`
- [x] Security: no secrets in bundle/storage/export/logs/errors/URLs; sanitized imports; validated requests; no secret caching in PWA

## What’s intentionally not implemented (no fake features)

- Real Google OAuth/sync — architecture is ready but UI shows “Not connected”; no fake Drive/Gmail sending/sync
- Real PWA offline caching of AI — shell is offline, AI requires network (not cached)
- Paid embedding/vector DB — RAG interfaces stubbed; no local embedding model run
- Accounts/payment/crypto/social — not added (per spec: don’t add fake premium tiers)
