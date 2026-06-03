# CLAUDE.md — MyPartner Portal

> This file is the single source of project memory. Keep it accurate. Update it when architecture, keys, or conventions change.

## Communication rules
- Expert TypeScript + React architect. Terse. No preamble, no summaries, no affirmations.
- Explain what you're about to do in one sentence, then do it immediately.
- Show only changed code sections unless full file is explicitly requested.
- Prefer diffs over full rewrites.
- ALWAYS state which agent you are using on the first line of every response that involves a task. No exceptions.

---

## What This Project Is

A **pnpm monorepo** deployed on Vercel. Dual-feature productivity portal ("MyPartner Portal"):
1. **Markdown Editor** — upload, edit, preview, and export `.md` files with live file watching (browser File System Access API)
2. **Notes App** — color-coded, pinnable, searchable notes synced to Supabase with offline-first queue

Authentication is client-side only (localStorage, no password). Login validates email against `ALLOWED_EMAILS` env var via API. Notes are stored in Supabase; markdown files are local-only (localStorage + IndexedDB).

---

## Commands

```powershell
pnpm dev              # Next.js dev server → http://localhost:3000
pnpm build            # Production build (apps/web only)
pnpm build:packages   # Build all packages (typecheck)
pnpm start            # Serve production build locally
pnpm typecheck        # Typecheck all packages + app
```

All commands run from monorepo root. `pnpm dev` filters to `@mypartner/web`.

---

## Agents

| Agent | File | Use when |
|---|---|---|
| `ux-ui-developer-agent` | `.claude/agents/ux-ui-developer-agent.md` | Any UI work — layout, components, accessibility, states, dark mode, responsive design |
| `pwa-developer-agent` | `.claude/agents/pwa-developer-agent.md` | Service worker, manifest, offline UX, caching, install prompt, update flow |
| `security-hardening-agent` | `.claude/agents/security-hardening-agent.md` | Auth (Supabase Auth/JWT), RLS, OWASP validation, secure headers, secret management |
| `backend-api-agent` | `.claude/agents/backend-api-agent.md` | API routes, Zod validation, typed errors, auth middleware, Supabase server patterns |
| `testing-agent` | `.claude/agents/testing-agent.md` | Vitest unit/component tests, Playwright E2E, coverage setup, CI test integration |
| `observability-agent` | `.claude/agents/observability-agent.md` | Sentry error tracking, Web Vitals, error boundaries, structured API logging |
| `devops-ci-agent` | `.claude/agents/devops-ci-agent.md` | GitHub Actions CI/CD, Vercel env management, branch protection, dependency updates |
| `mobile-designer-agent` | `.claude/agents/mobile-designer-agent.md` | Mobile-first layouts, touch UX, safe areas, bottom nav/sheets, iOS/Android quirks, mobile design tokens |

Invoke by agent name: `@security-hardening-agent` or naturally — *"have the security agent review the auth flow"*.

---

## Monorepo Structure

```
apps/
└── web/                        # @mypartner/web — Next.js app (Vercel deploy target)
    ├── next.config.ts           # transpilePackages for all @mypartner/* packages
    ├── vercel.json              # Vercel config (if root dir = apps/web)
    ├── src/
    │   ├── app/                 # Next.js App Router
    │   │   ├── layout.tsx       # Root layout: metadata, viewport, PWA tags
    │   │   ├── globals.css      # Global CSS: @theme tokens, dark mode, markdown styles
    │   │   ├── manifest.ts      # PWA manifest (webmanifest)
    │   │   ├── [[...path]]/
    │   │   │   ├── page.tsx     # Thin server component — renders <ClientRoot />
    │   │   │   └── client.tsx   # dynamic(PortalApp, { ssr: false }) wrapper
    │   │   └── api/
    │   │       ├── auth/check-email/route.ts   # POST /api/auth/check-email
    │   │       └── notes/
    │   │           ├── route.ts                # GET + POST /api/notes
    │   │           ├── [id]/route.ts           # PATCH + DELETE /api/notes/[id]
    │   │           └── sync/route.ts           # POST /api/notes/sync (batch sync)
    │   └── features/
    │       ├── portal/
    │       │   ├── PortalApp.tsx               # Client root: auth state, routing, theme
    │       │   └── components/
    │       │       ├── MyPartnerShell.tsx       # Login form + Portal layout + featureRegistry
    │       │       └── PortalHome.tsx           # Home dashboard (route: /portal/home)
    │       └── pwa/
    │           ├── hooks/useInstallPrompt.ts
    │           └── components/
    │               ├── OfflineBanner.tsx
    │               ├── UpdateAvailableToast.tsx
    │               └── InstallPrompt.tsx
    └── backend/                  # Server-only handlers (imported by API routes via @backend/*)
        ├── http.ts               # json() + readJsonBody() helpers
        ├── env.ts                # getAllowedEmails() from ALLOWED_EMAILS env var
        ├── auth/
        │   └── check-email.ts   # Email allowlist check logic
        ├── notes/
        │   ├── model.ts          # Note, NoteRow, NoteColor types + mapNoteRow
        │   ├── service.ts        # Supabase CRUD operations
        │   ├── collection-handlers.ts  # GET + POST /api/notes handlers
        │   ├── item-handlers.ts        # PATCH + DELETE /api/notes/[id] handlers
        │   └── sync-handler.ts         # POST /api/notes/sync handler
        └── supabase/
            └── server.ts         # Supabase server client (nodejs runtime)

packages/
├── common/                       # @mypartner/common — shared utilities
│   └── src/
│       ├── index.ts              # exports: cx(), getApiUrl()
│       ├── api.ts                # getApiUrl() — resolves NEXT_PUBLIC_API_BASE_URL
│       ├── cx.ts                 # className helper
│       ├── dependencies.ts       # re-exports: lucide-react icons, toast
│       └── file-system-access.ts # File System Access API polyfill/types
├── markdown-editor/              # @mypartner/markdown-editor
│   └── src/
│       ├── index.ts              # exports: MarkdownWorkspace, MarkdownFile
│       ├── MarkdownWorkspace.tsx # Editor orchestrator
│       ├── types.ts              # MarkdownFile type
│       ├── components/
│       │   ├── Sidebar.tsx       # File list + heading navigation
│       │   ├── Content.tsx       # Split-view area
│       │   ├── MarkdownEditor.tsx
│       │   ├── MarkdownViewer.tsx
│       │   └── WelcomeScreen.tsx
│       └── lib/
│           ├── storage.ts        # localStorage JSON helpers
│           ├── markdown.ts       # marked.parse() + highlight.js + heading extraction
│           ├── indexed-db.ts     # Persist FileSystemFileHandle across reloads
│           ├── file-system.ts    # File System Access API wrapper
│           └── demo.ts           # Demo file content
└── note-taking/                  # @mypartner/note-taking
    └── src/
        ├── index.ts              # exports: NotesApp, LocalNote, NoteColor, SyncStatus
        ├── types.ts              # LocalNote, NoteColor, SyncStatus
        └── components/
            └── NotesApp.tsx      # Notes feature component
        └── lib/
            ├── idb.ts            # IndexedDB helpers
            └── sync.ts           # Supabase sync logic

vercel.json                       # Root Vercel config (if root dir = repo root)
pnpm-workspace.yaml               # Declares apps/* + packages/*
```

**Path aliases** (`apps/web/tsconfig.json`):
- `@/*` → `apps/web/src/*`
- `@backend/*` → `apps/web/backend/*`

**Package consumption:** All `@mypartner/*` packages export `.ts` source files directly. Next.js compiles them via `transpilePackages` — no separate build step needed. Turbopack dev uses `turbopack.root` set to the monorepo root.

---

## Routing

Next.js catch-all `[[...path]]/page.tsx` → `client.tsx` (SSR disabled via `next/dynamic`) → `PortalApp`. All routing is client-side History API (no Next.js `<Link>` or `useRouter`).

| Path | Renders | Condition |
|---|---|---|
| `/login` | `MyPartnerLogin` | Unauthenticated |
| `/portal/home` | `MyPartnerPortal` → `PortalHome` | Default after login |
| `/portal/markdown` | `MyPartnerPortal` → `MarkdownWorkspace` | Markdown feature |
| `/portal/notes` | `MyPartnerPortal` → `NotesApp` | Notes feature |

**`PortalApp.tsx` key functions:**
- `getRedirectPath(path, hasSession)` — auth guard; redirects `/` `/login` `/app` `/portal` → `/portal/home`
- `getActiveFeatureId(path): FeatureId` — maps path to `'markdown' | 'notes'`
- `navigateTo(path, replace?)` — pushes/replaces history and fires `popstate`

---

## Auth Flow

1. No session → `getRedirectPath` returns `/login` → `MyPartnerLogin` renders
2. Submit email → `POST /api/auth/check-email` → validates against `ALLOWED_EMAILS` env var
3. If allowed → `handleLogin(session)` → stores `AuthSession` in localStorage → navigates to `/portal/home`
4. Logout → clears `mypartner-auth-session` → navigates to `/login`
5. Session survives page reload (read from localStorage on mount)
6. Broken API fails open (network errors do not block login)

`AuthSession` shape (`MyPartnerShell.tsx`):
```ts
interface AuthSession {
  name: string
  email: string
  company: string
  signedInAt: string
}
```

**Env vars:**
- `ALLOWED_EMAILS` — comma-separated list of authorized emails (server-only)
- `NEXT_PUBLIC_API_BASE_URL` — optional base URL override for API calls (e.g. for cross-origin deploys)

---

## Notes: Offline-First Architecture

Notes use a **write-through cache + mutation queue** pattern implemented in `@mypartner/note-taking`:

- **IndexedDB cache** (`idb.ts`) — loaded immediately on mount; no flash
- **sync.ts** — handles flush queue → fetch remote flow; called on mount (if online) and on `online` event
- API routes (`/api/notes`, `/api/notes/[id]`, `/api/notes/sync`) hit Supabase; require `x-user-email` header for row-level isolation

---

## Theme System

**How it works:**
- `data-theme="dark"` attribute set on `document.documentElement` by `PortalApp.tsx`
- Persisted to `localStorage` under key `mypartner-theme`
- On load: reads saved preference, falls back to `prefers-color-scheme`

**Global tokens (Tailwind `@theme` in `globals.css`) — warm palette:**

| Token | Light | Dark |
|---|---|---|
| `--color-surface-0` | `#F5F3EF` | `#0D1117` |
| `--color-surface-1` | `#FEFCF8` | `#161B22` |
| `--color-surface-2` | `#ECEAE5` | `#1C2128` |
| `--color-ink-1` | `#302E2B` | `#C9D1D9` |
| `--color-ink-2` | `#65605A` | `#A0AAB5` |
| `--color-ink-3` | `#9A948D` | `#8A9BAB` |
| `--color-line` | `#DDD9D2` | `#30363D` |

**Brand palette:**
- `--color-forest: #0d9488` (teal-600 light) / `#14b8a6` (teal-500 dark) — primary
- `--color-forest-strong: #0f766e` / `#2dd4bf` — hover
- `--color-crimson: #ef4444` / `#f87171` — danger

**Rule:** Use `var(--color-surface-*)` and `var(--color-ink-*)` for any new UI elements. Never hardcode colors.

---

## localStorage Keys

| Key | Type | Content |
|---|---|---|
| `mypartner-auth-session` | `AuthSession` | Login session |
| `mypartner-theme` | `'light' \| 'dark'` | Theme preference |
| `uploadedFiles` | `MarkdownFile[]` | Markdown editor files |

---

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| UI | React | 19.2.4 |
| Language | TypeScript | 5 (strict mode) |
| Styling | Tailwind CSS v4 (`@theme` in globals.css) | 4 |
| Database | Supabase (postgres) | `@supabase/supabase-js ^2` |
| Markdown | marked | 18 |
| Syntax highlight | highlight.js | 11 |
| Icons | lucide-react | 1.17+ |
| Notifications | react-hot-toast | 2 |
| IDs | uuid | 14 |
| IndexedDB | dexie | 4 |
| Package manager | pnpm | 10 (workspaces) |
| Deploy | Vercel | — |

---

## Key Conventions

- **Strict TypeScript** — no `any`, no unused vars/params
- **Tailwind v4** — uses `@theme` directive in `globals.css`; no `tailwind.config.js`
- **Icons** — import from `@mypartner/common/dependencies` (re-exports lucide-react); never import lucide-react directly in packages or app code
- **Toast** — import `toast` from `@mypartner/common/dependencies`
- **API URL** — use `getApiUrl(path)` from `@mypartner/common` for all `fetch()` calls; never hardcode `/api/...` paths
- **State** — local React state + localStorage/IndexedDB; no Redux, Zustand, or Context
- **No `any`** — define types in `types.ts` or `model.ts` of the relevant package
- **API routes** — thin re-export files only: `export { GET, POST } from '@backend/...'`; all logic lives in `apps/web/backend/`
- **API runtime** — backend handlers assume nodejs runtime; route files do NOT need `export const runtime` (Next.js default is nodejs for route handlers)

---

## Adding a New Portal Feature

**Option A — simple (logic fits in `apps/web/src/features/`):**
1. Create `apps/web/src/features/<feature>/FeatureApp.tsx`
2. Import and render it in `PortalApp.tsx`

**Option B — package (shared or complex feature):**
1. Create `packages/<feature>/` with `package.json` (`name: @mypartner/<feature>`) and `src/index.ts`
2. Add to `transpilePackages` in `apps/web/next.config.ts`
3. Add workspace dependency in `apps/web/package.json`

**Both options — register the route:**
1. Add entry to `featureRegistry` in `MyPartnerShell.tsx`
2. Add route case in `PortalApp.tsx → getActiveFeatureId()`
3. Allow the path in `PortalApp.tsx → getRedirectPath()`
4. Render in `PortalApp.tsx` JSX

---

## Notes App

- Colors: defined in `packages/note-taking/src/types.ts` as `NoteColor`
- Features: pin, search (full-text), word count, createdAt/updatedAt timestamps, offline sync
- Storage: Supabase (primary) + IndexedDB cache + offline mutation queue
- Layout: sidebar + main editor, 1-col mobile / 2-col desktop

---

## Markdown Editor

- File picker or drag-drop upload of `.md` files
- localStorage persistence of file content (`uploadedFiles`)
- IndexedDB persistence of file handles (for external file watching)
- Split-view: editor (contenteditable) + rendered preview
- 2-second poll detects external file changes
- Save back to original file via File System Access API
- File System Access API ambient types: `packages/common/src/file-system-access.ts` (imported by `@mypartner/markdown-editor` index)

---

## Do Not

- Do not use `any` — write proper TS types
- Do not hardcode colors — use `var(--color-*)` tokens
- Do not break the `[data-theme="dark"]` CSS selector system in `globals.css`
- Do not use Tailwind `bg-white` or similar — they override the theme system
- Do not import `lucide-react` directly — use `@mypartner/common/dependencies`
- Do not add `react-icons` imports
- Do not import `react-hot-toast` directly — use `toast` from `@mypartner/common/dependencies`
- Do not hardcode API paths — use `getApiUrl()` from `@mypartner/common`
- Don't ask to start the dev server
