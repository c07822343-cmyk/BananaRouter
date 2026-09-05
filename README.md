# BananaRouter — AI Workspace

A polished, workspace-inspired AI productivity OS built around **OpenRouter**. The web UI and backend run **locally at localhost**, but **all AI inference is performed by the OpenRouter API** — no local models, no Ollama, no downloads.

**Brand:** `BananaRouter`. AI inference is **Powered by OpenRouter** — clean, modern, friendly, fast, technical, productive, playful yet professional (subtle — no gimmicks).

> **Icon:** place your supplied vector/raster at `public/branding/banana-router-icon.svg` (preferred) or `.png` (≥256px, transparent). See `public/branding/README.md`. The UI loads `svg → png → clean “B” on #F6C446` fallback, preserves aspect with `object-contain`, and uses the icon for sidebar, PWA, favicon and loading states.

```
Browser (BananaRouter UI, local files, offline)
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

Chat (document-style), Documents (Docs), Drive (files & folders), Sheets, Mail (local drafts), Calendar, Tasks, Notes (Keep), Projects, AI Tools, Starred, Trash, Search and a universal context-aware **BananaRouter AI** — all in one cohesive product. Every AI action goes through a **centralized service** that builds minimal, validated context and streams via OpenRouter. The full workspace is never sent blindly.

## Brand identity

- **App name:** `BananaRouter` (everywhere: title `BananaRouter`, `BananaRouter — AI Workspace`, sidebar, top bar, PWA, metadata, About, onboarding)
- **Description:** `BananaRouter — An AI-powered workspace built around OpenRouter.`
- **Provider:** `Powered by OpenRouter` (small badge/pill, not main branding)
- **Palette:** warm paper `#fcfaf7`, white surfaces, banana `#F6C446` / `#FFFBEB` / `#FDE68A` accents, ink `#1a1a1e`; subtle shadows/radii, intentional light/dark
- **Icon:** `public/branding/banana-router-icon.svg|.png` — preserved aspect, not a placeholder illustration
- **Flow:** `OPEN → SEE → UNDERSTAND → CONFIGURE → WORK` — Home greets `Good morning/afternoon/evening · What are you working on?` with 7 quick actions (Chat/Write/Analyze/Organize/Create/Research/Plan) and *Continue working*

## App shell & global UI

- **Design tokens:** consistent spacing/typography (Inter / tracking-tight), `--radius-*`, `--shadow-sm/md/lg`, `--topbar-height:56px`, `--sidebar-width:272px / collapsed 72px`, `--content-max:1080px / --chat-max:760px`, transitions `cubic-bezier(0.16,1,0.3,1)` — no irregular gaps
- **App shell:** `| BananaRouter | Search | Help | Settings |` top bar (56px, sticky, search pill 720px, `⌘K` hint, saving/Offline, notifications, avatar) + collapsible sidebar (headers, active `#FFFBEB` + banana ring, hover, badges, *Recent* + *Favorites*, tooltips when collapsed, mobile drawer) + main + optional right **BananaRouter AI** panel
- **Global search** `Cmd+K` / `Shift+Cmd+F` — fuzzy partial across chats/docs/files/sheets/notes/tasks/mail/calendar/projects/folders; categorized, snippets, keyboard-nav, opens actual source
- **Command palette** `Cmd/Ctrl+K` — New Chat/Document/Sheet/Note/Task/Folder, Search, Settings, Import/Export, Toggle dark mode… filter-as-you-type
- **Home:** greeting + *What are you working on?* + pill quick actions + 3 CTA + *Continue working* (8 recent) + *Quick create* (6) + *Suggested for you* + *Workspace stats* (real counts) — not marketing
- **Every route polished:** empty/loading/error states intentional; skeletons `shimmer`, document-style markdown, subtle motion (respects `prefers-reduced-motion`)

## AI architecture

- **Centralized service** `src/lib/ai/service.ts` — every tool (chat, document.*, sheet.*, note.*, task.*, email.*) via `executeAI()` (model selection, streaming, errors, retries, cancellation, token limits, context prep, logging w/o secrets)
- **Central prompt registry** `src/lib/ai/prompts.ts` — one definition per tool (`system`, `userTemplate`, `permission`, `output`)
- **Structured outputs** — e.g., `task.breakdown` returns validated JSON `[{title, description}]` before creating tasks
- **Permissions** — `READ` / `SUGGEST` (preview) / `MODIFY` / `CREATE` / `DELETE` — bulk MODIFY/DELETE requires confirmation with preview
- **Context** `AIContext` — `{currentView, selectedDocument, selectedFiles (max 4, truncated), selectedNote, selectedSpreadsheet, selectedTasks…}` — minimal, size-checked (`MAX_CONTEXT_CHARS=12k`), citations `Based on: …`
- **Cost safety:** context checks, max tokens, chunking, “Large document — processed in sections”
- **Rate limit:** 60 req/min per-IP + OpenRouter 429 → “rate limited — Retry” with backoff

## Chat (document-style, not bubbles)

- New chat, search, rename (list), delete, regenerate/retry, edit user message (truncate+resend), streaming with `AbortController`, markdown + code + copy/feedback
- **Header:** `BananaRouter AI · Powered by OpenRouter` + Free Router badge + model selector
- **Thread:** document flow (no bubbles) — *You* / *BananaRouter* sections, prose `15px/1.7`, divider per turn, `max-w:760px`
- **Composer:** auto-growing textarea (≤220px), `Enter` send / `Shift+Enter` newline, drag-drop files as context chips, attach, Enhance prompt, token count, stop button
- **Streaming:** *Jump to latest* when scrolled, thinking state `BananaRouter is thinking…` with banana dots
- **Errors:** structured categories, redacted details (`[REDACTED]`), retryable
- **Model:** `openrouter/free` default (Free Router), live catalog with free/paid badges

## Workspace modules — all real, preview-before-apply, no mocks

### Documents (Docs-style)
File/Edit/Insert/Format/Tools-like toolbar, word/char count, rename/duplicate/export `.md`, headings/lists/checklists/tables/code/quotes/links via textarea+markdown, **AI** Rewrite/Summarize/Expand/Shorten/Fix grammar/Change tone/Continue/Outline/Create title — operates on **selection** if highlighted, otherwise whole doc — **preview** with Replace/Insert/Cancel, version snapshot + restore

### Drive (files & folders)
Folders, nested, breadcrumbs, rename/move/duplicate/star/trash/restore, sort, Grid/List, search, type icons, context menus — Import TXT/MD/JSON/CSV/PDF (metadata)/images (10 MB max), searchable text, status — Preview text/markdown, CSV 20 rows, JSON formatted, image, PDF metadata — **AI file analysis** only selected file, chunked if large — **Drag-and-drop** with visual indicator

### Sheets
Rows/cols, multiple sheets, editable cells, col/row resize, freeze header, search, sort/filter via AI, **CSV** Import→preview→detect→AI cleanup→convert→save — **AI** Summarize/Trends/Clean/Formula — preview before applying; destructive requires Apply/Cancel

### Notes (Keep-style)
Title/text/checklist/labels/colors/pin/archive/trash/search — **AI** Summarize/Organize/Turn into tasks/Expand/Rewrite/Convert to doc — all previewed

### Tasks
Title/description/due/priority/completion/lists/subtasks — **AI** “Break into tasks” validated JSON preview, Prioritize, Schedule, Summarize unfinished

### Calendar
Month/Week/Day, CRUD (title/description/start/end/timezone/location/color/reminder/recurrence), search, event colors — **AI planner** (“Create study schedule”) — generates ≤8 events, preview → Apply/Cancel

### Mail (Gmail-style, local only)
Inbox-style local drafts, Compose (To/CC/BCC/Subject/Body), Drafts/Sent, search/labels/star/archive — **AI** Draft/Rewrite/More professional/Shorter/Friendlier/Summarize/Extract actions — **Safety:** drafts are *local — not actually sent unless Gmail integration later with OAuth*

### AI Toolbox
Writing/Summarizer/Research/Brainstorm/Code/Study/Data/Document/Email/Planner/Translator/Formatter — each actually calls OpenRouter via central service

### Templates & Memory
Prompt templates with `{{variables}}`, visible editable deletable; workspace memory (“Prefer concise answers”), visible editable, only relevant sent

### Projects
Groups Chats+Docs+Sheets+Notes+Tasks+Files; contextual AI; act as Drive-style organization — Cross-app workflows: Chat→Document, Chat→Tasks, Document→Summary, Notes→Document, Spreadsheet→Report, Email→Task, File→Chat — real buttons

### System
- **File pipeline:** Upload→Validate→Extract→Normalize→Index→Store→Available to AI; shows status
- **Large docs:** Chunk→Summarize relevant→Construct context (future RAG stubs: `DocumentChunk`, `EmbeddingProvider`…)
- **Notifications:** “Document saved”, “Import complete”, “AI failed”, “Export complete” — no fake social
- **Autosave:** ~600 ms debounce, `beforeunload` flush, `Saving… / Saved / Offline changes`
- **Offline-first:** docs/notes/tasks/files/search usable without network; AI requires service
- **Starred / Favorites**, **Trash** soft-delete + Restore/Delete forever + Undo, **Responsive** drawer/modal/scroll, **Accessibility** (keyboard, ARIA, focus, semantic, reduced-motion), **Performance** (debounced search, IndexedDB, content-visibility, lean 146 kB / 248 kB first load)

## Tech stack
Next.js 15.5 (App Router), React 19, TypeScript strict, Tailwind 3.4, `lucide-react`, `react-markdown` + `remark-gfm` + `rehype-highlight`, OpenRouter Chat Completions API

## Requirements
Node.js 20+ (tested 22.22.3) · OpenRouter key from https://openrouter.ai/keys

## Install and run (localhost)

```bash
npm install
cp .env.example .env.local
# edit .env.local and set OPENROUTER_API_KEY
npm run dev      # http://localhost:3000
# or
npm run build && npm run start
```

`localhost` = local Next.js UI + backend. AI still happens on OpenRouter’s servers. Onboarding (4 steps) appears once on first launch.

## OpenRouter configuration

**Do not confuse with local models.** No Ollama / LM Studio / llama.cpp — never downloads or runs models.

### Server-side key (required, never client-side)

**Recommended — env var:**

```ini
# .env.local (git-ignored, never committed)
OPENROUTER_API_KEY=sk-or-v1-your-real-key-here
OPENROUTER_MODEL=openrouter/free
APP_NAME=BananaRouter
APP_DESCRIPTION=BananaRouter — An AI-powered workspace built around OpenRouter.
APP_URL=http://localhost:3000
OPENROUTER_TEMPERATURE=0.7
OPENROUTER_TIMEOUT_MS=120000
OSS_APP_VERSION=1.0.0
```

**Alternative — Settings UI (dev convenience):**

`Settings → AI / OpenRouter` → paste key → **Save to server**. POSTs to `/api/settings`, writes `.env.local` server-side and is used only by backend; never written to browser. In production use real env vars or secret store. If exposed, rotate at https://openrouter.ai/keys.

### Default model

- `src/lib/server/config.ts` → `DEFAULT_MODEL = "openrouter/free"` (free routing to best available free model, response includes `model`)
- Overridable by `OPENROUTER_MODEL` env or Settings → model picker (live catalog from `https://openrouter.ai/api/v1/models` with free/paid badges, context length, refresh)
- Never silently switches to paid when you chose free-only; status shows fallback and live source

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | — | **Required.** Server only. Never `NEXT_PUBLIC_`. |
| `OPENROUTER_MODEL` | `openrouter/free` | Default router; also `openrouter/auto`. |
| `APP_NAME` | `BananaRouter` | Updates title, sidebar, about. |
| `APP_DESCRIPTION` | (see .env.example) | Meta + about. |
| `APP_URL` / `HTTP_REFERER` | `http://localhost:3000` | Sent as `HTTP-Referer` to OpenRouter. |
| `OPENROUTER_TEMPERATURE` | `0.7` | Default temp (UI can override per request). |
| `OPENROUTER_TIMEOUT_MS` | `120000` | Server timeout for OpenRouter. |
| `OSS_APP_VERSION` | `1.0.0` | Shown in diagnostics. |

### Branding env

```ini
APP_NAME=BananaRouter
APP_DESCRIPTION=BananaRouter — An AI-powered workspace built around OpenRouter.
```

Icon at `public/branding/banana-router-icon.svg` / `.png` — preserved via `object-contain`.

## Backend API (server-side only talks to OpenRouter)

- `POST /api/chat` — validates `messages`/`model`/size, rate-limits 60/min/IP, proxies to `https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer <key>`, `HTTP-Referer`, `X-Title`, streams SSE or JSON; structured errors (`missing_api_key` 401, `invalid_request` 400, `rate_limited` 429, `context_limit`, `insufficient_credits`…), secrets redacted
- `GET / POST /api/settings` — status & server-side save (validates model format)
- `POST /api/test` — verifies key + model with one-word ping
- `GET /api/models` — live catalog from `https://openrouter.ai/api/v1/models`, falls back to config
- `GET /api/usage` — `https://openrouter.ai/api/v1/auth/key` limit/usage/free-tier

All OpenRouter calls include `Authorization`, `Content-Type`, `HTTP-Referer`, `X-Title`. Errors centralized with `category` + `retryable`.

## Project structure

```
.env.example                # placeholder only (no real key)
public/branding/            # banana-router-icon.svg/.png + README (icon location)
public/manifest.json        # PWA: BananaRouter, theme #F6C446, icons /branding/...
next.config.mjs             # reactStrictMode, poweredByHeader:false
tailwind.config.ts          # BananaRouter tokens
src/
  app/
    layout.tsx              # metadata BananaRouter — AI Workspace, favicon /branding
    page.tsx                # WorkspaceProvider + WorkspaceShell
    globals.css             # BananaRouter tokens, prose, skeleton, reduced-motion
    api/ chat/settings/test/models/usage
  components/
    branding/ BananaLogo.tsx # svg→png→“B” fallback #F6C446
    shell/  TopBar, SidebarNav, GlobalSearch, CommandPalette, AssistantPanel, WorkspaceShell, Onboarding
    workspace/views/ Home, Chat, Documents, Drive, Sheets, Mail, Calendar, Tasks, Notes, AITools, Projects, Starred, Trash, Settings
    chat/   ChatPanel, MessageBubble (document-style), Composer, MarkdownMessage, CodeBlock, ErrorBanner
    settings/ ModelSelector (Free Router)
    ui/     ConfirmDialog
  lib/
    workspace/ types.ts, store.ts, search.ts, context.tsx (CRUD, autosave)
    ai/      prompts.ts, service.ts
    server/  config.ts (BananaRouter defaults), openrouter.ts, openrouterMeta.ts
    client/  api.ts (redaction), storage.ts, settings.ts, utils.ts
    shared/  types.ts
  tests/    security.test.js, unit.test.js, api.test.js (node --test)
```

## Storage

- Browser: `localStorage` key `openrouter-workspace-v2` (JSON cache) + IndexedDB `openrouter-chat` / `workspaces` / `workspace-v2` for large workspaces; legacy auto-migrated
- Autosave 600 ms debounce, `beforeunload` flush, `Saving… → Saved`
- Offline: UI works without network; AI requires service
- Backup: `Settings → Workspace data → Export` → `{app, version, exportedAt, workspace:{…}}` — **never includes API key**; import validates shape, no `eval`

## AI architecture details

User → Web app → Server API (`/api/chat`) → OpenRouter → Model → Streamed SSE → App — browser never sees secret — Prompt registry `getPrompt(toolId)` — Context `buildContextText(ctx)` truncated per source (doc 8k, file 4k, spreadsheet 50 cells, tasks, events, last 6 messages); `truncateContext(12k)` + citations — Chunking for large docs

## Security

- Key read only via `getRuntimeApiKey()` server-side; `isApiKeyConfigured()` guards routes; never in `NEXT_PUBLIC_`, bundles, `localStorage`, IndexedDB, URLs, export JSON, debug, logs, or error details — `redactSecrets()` replaces `sk-or-v…`/`Bearer …` with `[REDACTED]`
- `OPENROUTER_API_KEY` not in client `process.env` (Next.js excludes it)
- Validation: `MAX_MESSAGES=200`, `MAX_CONTENT_LENGTH=100k`, `MAX_BODY_BYTES=1.5M`, model regex `^[A-Za-z0-9._:/-]+$`
- Import validation: `JSON.parse` only, shape checks, no `eval`/`Function`
- Markdown: `react-markdown` (no raw HTML), links `noopener noreferrer nofollow`, code `rehype-highlight` ignoreMissing, HTML sanitized
- Privacy indicators: “Only selected context is sent”, “Powered by OpenRouter” badges, Developer Mode hidden (n/a)
- Rate limit + secrets-tested (`npm test` checks bundles don’t contain `sk-or-v1-…` or real key)

## Future Google Integration (ready, not faked)

```ts
type IntegrationStatus = { id:"drive"|"docs"|"sheets"|"gmail"|"calendar", status:"not_connected"|"connected"|"unavailable", label:string, description:string }
```

UI shows **Not connected** for Drive/Docs/Sheets/Gmail — architecture ready for OAuth (server-side tokens, per-scope permissions). Calendar already matches Google shape. No fake sync/sending.

## Commands

```bash
npm install        # install
npm run dev        # dev (localhost:3000)
npm run build      # production build (checks types, collects routes)
npm run start      # serve production build
npm run typecheck  # tsc --noEmit
npm test           # node --test (22 tests: security + unit + api)
```

## Branding (central)

`APP_NAME`, `APP_DESCRIPTION` in `.env.example` / `src/lib/server/config.ts` — changing `APP_NAME` updates title, sidebar, top bar, metadata, about. `DEFAULT_MODEL` defines router fallback. `BRAND=BananaRouter, INFRA=OpenRouter`.

## Testing

```bash
npm run build      # must pass (146 kB / 248 kB)
npm test           # 22 tests
```

Live OpenRouter round-trip requires real key. Without it UI shows structured errors: `missing_api_key` → “OpenRouter API key is missing…”, `rate_limited`, `context_limit`… with Retry when `retryable`.

## No local models

Never downloads/hosts/runs local models — no Ollama, LM Studio, llama.cpp… search repo for those strings — only this documentation stating they’re absent.

## Final checklist (verified)

- [x] Builds (`npm run build` 146 kB) and starts, no console errors on empty workspace
- [x] BananaRouter everywhere (title, manifest, PWA, sidebar, home, chat header, onboarding); icon at `public/branding/` with `object-contain` + “B” fallback not banana art
- [x] Tokens consistent, shell `| BananaRouter | Search | Help | Settings |` collapsible (272→72), top bar 56px, Home greeting + 7 quick actions + Continue working
- [x] Chat document-style, `BananaRouter AI · Powered by OpenRouter`, composer auto-grow/drag-drop, Enter send, thinking state, Jump to latest, Free Router
- [x] Documents/Drive/Sheets/Notes/Tasks/Calendar/Mail/Projects with preview-before-apply, confirmations, right AI panel, context indicators
- [x] Microinteractions/loading/empty/dark/light intentionally designed, responsive, accessibility (ARIA, focus, keyboard, reduced-motion), toasts/modals/context menus
- [x] Autosave, offline, OpenRouter backend preserved, security validated, Google-style workflow, integrations “Not connected”
- [x] 4-step onboarding, versioned settings, import safety, tool safety, final visual/functional/brand QA
