# OpenRouter Chat

A polished, production-quality AI chat dashboard. The web UI and backend run
locally, but **no AI models run locally — all inference is performed by the
OpenRouter API**.

```
Browser
  ↓
Local web app + Next.js backend
  ↓
OpenRouter API (https://openrouter.ai/api/v1/chat/completions)
  ↓
Selected OpenRouter free/auto model
  ↓
Streamed response
  ↓
Local web app
  ↓
Browser
```

## Features

- Modern chat dashboard with sidebar, header, settings, and mobile layout
- Streaming (SSE) responses with progressive rendering
- Message actions: copy, regenerate, thumbs up/down, retry, and edit user message
- Edit a user message → truncates the conversation after it and resends
- Stop generation with real request cancellation; partial output is preserved and marked interrupted
- Smart auto-scroll: if you scroll up while generating, a **Jump to latest** button appears instead of forcing the view back
- Markdown rendering (headings, lists, tables, blockquotes, links, code) with syntax highlighting
- Professional code blocks with language label, horizontal scroll, and Copy → “Copied!”
- Conversation sidebar grouped by Today / Yesterday / Previous 7 Days / Older
- Search conversation titles **and** message content with snippets and empty-state
- Rename, delete (with confirmation), and context menu
- Conversation titles generated locally (no extra AI call)
- Model selector: Free Router, Automatic/Recommended, live OpenRouter catalog with free/paid badges, context windows, and refresh
- Optional **Enhance Prompt** workflow: sends the prompt for an additional AI request and lets you accept or reject the result
- Settings redesigned into General / Appearance / AI / OpenRouter / Chat / Privacy / Advanced
- OpenRouter usage information (from `/api/v1/auth/key`) and model catalog refresh
- Export current conversation or all conversations as JSON; import with validation
- Configurable app name/description from a single central configuration
- Developer debug mode showing non-sensitive request info
- Centralized error system with category, details, and retry when appropriate
- Structured errors for missing key, invalid model, rate limits, insufficient credits, context limits, timeouts, network errors, and malformed responses
- Browser storage abstraction: localStorage for small histories, IndexedDB for larger histories, never stores API keys

## Tech stack

- Next.js 15 (App Router) — frontend + API routes
- React 19, TypeScript, Tailwind CSS
- React Markdown + remark-gfm + rehype-highlight
- OpenRouter Chat Completions API (no local model runtime)

## Requirements

- Node.js 20+ (tested with Node 22)
- An OpenRouter API key from https://openrouter.ai/keys

## Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

For production:

```bash
npm run build
npm run start
```

## Where to put the OpenRouter API key

The key is read **only** on the server. There are two ways:

### 1. Environment variable (recommended)

Edit `.env.local` (or set a real environment variable in production):

```
OPENROUTER_API_KEY=sk-or-v1-your-real-key-here
OPENROUTER_MODEL=openrouter/free
```

`.env.local` is in `.gitignore` and is never committed.

### 2. Settings UI (development convenience)

Open **Settings → OpenRouter** and paste the key, then click **Save**. The key
is POSTed to `/api/settings`, stored server-side in `.env.local`, and used only
by the backend. It is never written to the browser.

> **Production note:** use server-side environment variables or a secure
> secret store. If you believe a key was exposed at any point, rotate it
> immediately at https://openrouter.ai/keys before using the app.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | — | OpenRouter key. Server only. |
| `OPENROUTER_MODEL` | No | `openrouter/free` | Default model router. |
| `APP_NAME` | No | `OpenRouter Chat` | App name (branding + `X-Title`). |
| `APP_DESCRIPTION` | No | `A modern AI chat dashboard powered by OpenRouter.` | App description. |
| `APP_URL` | No | `http://localhost:3000` | Sent to OpenRouter as `HTTP-Referer`. |
| `OPENROUTER_TEMPERATURE` | No | `0.7` | Default temperature. |
| `OPENROUTER_TIMEOUT_MS` | No | `120000` | Server-side default request timeout. |
| `OSS_APP_VERSION` | No | `1.0.0` | Displayed in Settings → Advanced. |

## Default model configuration

The default model is set centrally in `src/lib/server/config.ts`
(`DEFAULT_MODEL = "openrouter/free"`) and can be overridden per deployment with
`OPENROUTER_MODEL`. The UI also lets you pick models live from the OpenRouter
catalog, so you are never locked into a hard-coded free model.

## Backend API

- `POST /api/chat` — validates messages/model, proxies to OpenRouter, streams
  SSE back (or JSON when streaming is off), with request-size limits and basic
  per-process rate limiting.
- `GET/POST /api/settings` — server configuration/status.
- `POST /api/test` — connection test.
- `GET /api/models` — live OpenRouter model catalog (free/paid, context).
- `GET /api/usage` — OpenRouter key usage (limits/usage/free-tier), falls back
  to “Usage information unavailable.”

OpenRouter requests include `Authorization`, `Content-Type`, `HTTP-Referer`,
and `X-Title`. Error messages and details are redacted so keys/headers are never
exposed.

## Project structure

```
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── src
    ├── app
    │   ├── layout.tsx
    │   ├── page.tsx                 # chat dashboard state/actions
    │   ├── globals.css
    │   └── api
    │       ├── chat/route.ts        # POST /api/chat
    │       ├── settings/route.ts    # GET/POST /api/settings
    │       ├── test/route.ts        # POST /api/test
    │       ├── models/route.ts      # GET /api/models
    │       └── usage/route.ts       # GET /api/usage
    ├── components
    │   ├── chat      # ChatPanel, MessageBubble, Composer, Markdown, code, errors, enhance
    │   ├── layout    # AppShell, Sidebar, Header
    │   ├── settings  # SettingsModal, ModelSelector
    │   └── ui        # ConfirmDialog
    └── lib
        ├── client    # API client, storage (localStorage + IndexedDB), settings, utils
        ├── server    # OpenRouter client, meta/usage, server config
        └── shared    # types
```

## Security

- API key read/used only by server code; never in client bundles, localStorage,
  URLs, debug output, or logs.
- `.env.local` is git-ignored; `.env.example` has no real key.
- Redaction protects against keys/headers appearing in error messages.
- Markdown is rendered with React Markdown (no raw HTML); links use
  `rel="noopener noreferrer nofollow"`.
- Imported conversations are validated and never executed.
- Request size, message count/content length, model format, and basic rate
  limits are enforced server-side.

## No local models

The app never downloads, installs, hosts, or launches local model runtimes.
There is no Ollama, LM Studio, llama.cpp, or LocalAI code or path. Every
completion goes to the OpenRouter API.

## Testing checklist

Run `npm run build` and confirm the app starts, chat UI loads, the missing-key
error works, model/usage/test endpoints behave, settings persist, theme toggles,
the mobile layout is usable, message search/grouping works, edit/regenerate/stop
work, export/import works, and no API key is present in client source. Note that
a live OpenRouter round-trip requires a real `OPENROUTER_API_KEY`.
