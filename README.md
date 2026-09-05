# OpenRouter Chat

A complete, production-feeling AI chat dashboard. The web UI and backend run
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

- Modern chat dashboard with left sidebar, header, and mobile layout
- Streaming responses (SSE) so text appears progressively
- Markdown rendering with tables, blockquotes, lists, links, inline code
- Code blocks with syntax highlighting, language label, and copy button
- Per-message copy + regenerate, stop generation, auto-scroll
- Conversation history in browser localStorage with search, rename, delete
- Automatic local conversation titles (no extra AI call)
- Model selector: **Free Router** (`openrouter/free`) and
  **Automatic/Recommended** (`openrouter/auto`), plus custom IDs
- Settings panel: API key, model, temperature, max tokens, system prompt,
  streaming toggle, light/dark/system theme
- Privacy controls: clear conversation history, clear all local data
- OpenRouter API key is **never** sent to the client and is **never** stored
  in localStorage
- Secure server-side environment configuration with `.env.example`
- Structured error handling for missing keys, invalid models, rate limits,
  insufficient credits, timeouts, network errors, and malformed responses

## Tech stack

- Next.js 15 (App Router) — frontend + API routes
- React 19, TypeScript
- Tailwind CSS
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

The application reads the key from the **server only**. There are two ways:

### 1. Environment variable (recommended)

Edit `.env.local` (or set a real environment variable in production):

```
OPENROUTER_API_KEY=sk-or-v1-your-real-key-here
OPENROUTER_MODEL=openrouter/free
```

`.env.local` is in `.gitignore` and is never committed.

### 2. Settings UI (development convenience)

Open Settings → API and paste the key, then click **Save**. The key is POSTed
to `/api/settings`, stored server-side in `.env.local`, and used only by the
backend. It is never written to the browser.

> **Production note:** Use server-side environment variables or a secure
> secret store. The Settings UI key field is intended for local development.

## Required environment variables

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | `sk-or-v1-…` | Your OpenRouter key. Server only. |
| `OPENROUTER_MODEL` | No | `openrouter/free` | Default model router. |
| `APP_NAME` | No | `OpenRouter Chat` | Sent to OpenRouter as `X-Title`. |
| `APP_URL` | No | `http://localhost:3000` | Sent to OpenRouter as `HTTP-Referer`. |
| `OPENROUTER_TEMPERATURE` | No | `0.7` | Default temperature. |

## Default model configuration

The default model is set centrally in:

`src/lib/server/config.ts` (`DEFAULT_MODEL = "openrouter/free"`)

and can also be overridden per deployment with `OPENROUTER_MODEL`. The UI
starts with `openrouter/free`, which uses OpenRouter’s free-model routing and
automatically selects an available free model. Because free-model availability
changes over time, the identifier is configurable — it is never hard-coded
throughout the app.

## Backend API

### `POST /api/chat`

Request:

```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "model": "openrouter/free",
  "temperature": 0.7,
  "maxTokens": 4096,
  "systemPrompt": "You are a helpful assistant.",
  "streaming": true
}
```

- Validates messages, roles, and model.
- Reads `OPENROUTER_API_KEY` on the server.
- Sends the request to
  `https://openrouter.ai/api/v1/chat/completions` with
  `Authorization`, `Content-Type`, `HTTP-Referer`, and `X-Title` headers.
- Streams SSE back when `streaming` is true.
- Returns structured errors (`code`, `message`, `detail`) for common failures.

### `POST /api/settings`

Accepts `{ "apiKey?: string, "model?: string" }` to update server-side
configuration (development only).

### `POST /api/test`

Accepts `{ "model": "openrouter/free" }` and sends a tiny ping request to
OpenRouter to verify credentials and the selected model.

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
    │   ├── page.tsx                 # chat dashboard shell/state
    │   ├── globals.css
    │   └── api
    │       ├── chat/route.ts        # POST /api/chat (streaming proxy)
    │       ├── settings/route.ts    # GET/POST /api/settings
    │       └── test/route.ts        # POST /api/test
    ├── components
    │   ├── layout    # AppShell, Sidebar, Header
    │   ├── chat      # ChatPanel, MessageBubble, MessageComposer, Markdown, code, errors, empty state
    │   ├── settings  # SettingsModal, ModelSelector
    │   └── ui
    ├── lib
    │   ├── client    # browser API client, storage, settings, utils
    │   ├── server    # OpenRouter client + server config (secret-aware)
    │   └── shared    # shared types
    └── public
```

## Security

- The OpenRouter API key is only read and used by server code.
- `.env.local` is git-ignored; `.env.example` contains no real key.
- The browser app calls `/api/chat`; it never calls OpenRouter directly.
- Markdown is rendered with React Markdown; links are opened with
  `rel="noopener noreferrer nofollow"` to reduce XSS risk.
- Error payloads from OpenRouter are returned to the browser only so the UI can
  show useful details; no API key is included in errors.

## No local models

The application never downloads, installs, hosts, or launches local model
runtimes. There is no Ollama, LM Studio, llama.cpp, or LocalAI code and no local
inference path. Every completion is sent to the OpenRouter API.

## Testing checklist

Run `npm run build` and confirm:

- The app starts (npm run dev → http://localhost:3000).
- Chat interface loads with empty-state example prompts.
- Missing API key produces the structured `missing_api_key` error.
- With a valid key, chat works and responses stream.
- New chat, rename, delete, and search work.
- Settings (key/model/temp/max tokens/system prompt/streaming/theme) work.
- Light/Dark/System theme toggles.
- Mobile layout is usable.
- API errors display friendly messages with expandable Details.
- No API key is present in client-side source or built client bundles (only the
  `sk-or-v1-…` placeholder in the settings input).
- No local AI model is downloaded or launched.
