# CLAUDE.md — MyPartner Portal (markdown-viewer)

> This file is the single source of project memory. Keep it accurate. Update it when architecture, keys, or conventions change.

## Communication rules
- Expert TypeScript + React architect. Terse. No preamble, no summaries, no affirmations.
- Explain what you're about to do in one sentence, then do it immediately.
- Show only changed code sections unless full file is explicitly requested.
- Prefer diffs over full rewrites.
- ALWAYS state which agent you are using on the first line of every response that involves a task. No exceptions.

---

## What This Project Is

A **Next.js full-stack app** deployed on Vercel. Dual-feature productivity portal ("MyPartner Portal"):
1. **Markdown Editor** — upload, edit, preview, and export `.md` files with live file watching (browser File System Access API)
2. **Notes App** — color-coded, pinnable, searchable notes synced to Supabase with offline-first queue

Authentication is client-side only (localStorage, no password). Notes are stored in Supabase; markdown files are local-only (localStorage + IndexedDB).

---

## Commands

```powershell
pnpm dev       # Next.js dev server → http://localhost:3000
pnpm build     # TypeScript check + production build
pnpm start     # Serve production build locally
```

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

## Architecture

```
src/
├── app/                                     # Next.js App Router
│   ├── layout.tsx                           # Root layout: metadata, viewport, PWA tags
│   ├── globals.css                          # Global CSS: @theme tokens, dark mode, markdown styles
│   ├── manifest.ts                          # PWA manifest (webmanifest)
│   ├── [[...path]]/page.tsx                 # Catch-all route → PortalApp (client component)
│   └── api/notes/
│       ├── route.ts                         # GET /api/notes, POST /api/notes
│       └── [id]/route.ts                    # PATCH /api/notes/[id], DELETE /api/notes/[id]
├── features/
│   ├── portal/
│   │   ├── PortalApp.tsx                    # Client root: auth state, routing, theme
│   │   └── components/MyPartnerShell.tsx    # Login form + Portal layout + featureRegistry
│   ├── markdown/
│   │   ├── MarkdownWorkspace.tsx            # Markdown editor orchestrator
│   │   ├── types.ts                         # MarkdownFile type
│   │   ├── components/
│   │   │   ├── Sidebar.tsx                  # File list + heading navigation
│   │   │   ├── Content.tsx                  # Split-view area
│   │   │   ├── MarkdownEditor.tsx           # Raw editor pane (contenteditable)
│   │   │   ├── MarkdownViewer.tsx           # Rendered HTML preview pane
│   │   │   └── WelcomeScreen.tsx            # Empty state / drag-drop upload
│   │   └── lib/
│   │       ├── storage.ts                   # localStorage JSON helpers
│   │       ├── markdown.ts                  # marked.parse() + highlight.js + heading extraction
│   │       ├── indexed-db.ts                # Persist FileSystemFileHandle across reloads
│   │       └── file-system.ts               # File System Access API wrapper
│   ├── notes/
│   │   └── components/NotesApp.tsx          # Notes feature (offline-first, syncs to Supabase)
│   └── pwa/
│       ├── hooks/useInstallPrompt.ts
│       └── components/
│           ├── OfflineBanner.tsx
│           ├── UpdateAvailableToast.tsx
│           └── InstallPrompt.tsx
└── types/
    └── file-system-access.d.ts              # File System Access API ambient types

backend/
├── notes/
│   ├── model.ts                             # Note, NoteRow, NoteColor types + mapNoteRow helpers
│   ├── collection-handlers.ts               # Handlers for GET + POST /api/notes
│   └── item-handlers.ts                     # Handlers for PATCH + DELETE /api/notes/[id]
└── supabase/
    └── server.ts                            # Supabase server client (nodejs runtime)
```

**Path aliases** (tsconfig.json):
- `@/*` → `src/*`
- `@backend/*` → `backend/*`

---

## Routing

Next.js catch-all `src/app/[[...path]]/page.tsx` renders `<PortalApp />` for every path. Routing inside the app is client-side History API (no Next.js `<Link>` or `useRouter`).

| Path | Renders | Condition |
|---|---|---|
| `/login` | `MyPartnerLogin` | Unauthenticated |
| `/portal/markdown` | `MyPartnerPortal` → `MarkdownWorkspace` | Default after login |
| `/portal/notes` | `MyPartnerPortal` → `NotesApp` | Notes feature |

**`PortalApp.tsx` key functions:**
- `getRedirectPath(path, hasSession)` — enforces auth guard; returns redirect target or `null`
- `getActiveFeatureId(path): FeatureId` — maps path to `'markdown' | 'notes'`
- `navigateTo(path, replace?)` — pushes/replaces history and fires `popstate`

---

## Auth Flow

1. No session → `getRedirectPath` returns `/login` → `MyPartnerLogin` renders
2. Submit form → `handleLogin(session)` → stores `AuthSession` in localStorage under `mypartner-auth-session` → navigates to `/portal/markdown`
3. Logout → clears `mypartner-auth-session` → navigates to `/login`
4. Session survives page reload (read from localStorage on mount)

`AuthSession` shape (`MyPartnerShell.tsx`):
```ts
interface AuthSession {
  name: string
  email: string
  company: string
  signedInAt: string
}
```

---

## Notes: Offline-First Architecture

Notes use a **write-through cache + mutation queue** pattern:

- **localStorage cache** (`mypartner-notes:<email>:cache`) — loaded immediately on mount; no flash
- **mutation queue** (`mypartner-notes:<email>:queue`) — queued ops when offline: `{ type: 'upsert', note }` or `{ type: 'delete' }`
- On mount: if online, flush queue then fetch remote; if offline, serve cache
- On reconnect (`online` event): flush queue, re-fetch remote
- API routes (`/api/notes`, `/api/notes/[id]`) hit Supabase; require `x-user-email` header for row-level isolation

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
| `mypartner-notes:<email>:cache` | `Note[]` | Notes offline cache (per user) |
| `mypartner-notes:<email>:queue` | `QueuedNoteMutation[]` | Pending offline mutations (per user) |

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
| Syntax highlight | highlight.js (github-dark theme) | 11 |
| Icons | lucide-react | 1.17+ |
| Notifications | react-hot-toast | 2 |
| IDs | uuid | 14 |
| Deploy | Vercel | — |

---

## Key Conventions

- **Strict TypeScript** — no `any`, no unused vars/params (`tsconfig.json: strict: true`)
- **Tailwind v4** — uses `@theme` directive in `globals.css`; no `tailwind.config.js`
- **Icons** — use `lucide-react` only; do not add `react-icons` imports
- **State** — local React state + localStorage; no Redux, Zustand, or Context
- **Comments** — only when the WHY is non-obvious; never describe what the code does
- **No `any`** — define types in `model.ts` or feature `types.ts`
- **API runtime** — Next.js API routes use `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`

---

## Feature: File System Access API

`src/features/markdown/lib/file-system.ts`:
- `openFileFromSystem()` — file picker → returns `{ fileHandle, file, content, name, path }`
- `saveToFileHandle(handle, content)` — write to existing handle
- `watchFile(handle, lastModified, cb, intervalMs)` — polls every N ms; returns cleanup fn
- `isFileSystemAccessSupported()` — feature detection guard

File handles survive page reload via IndexedDB (`lib/indexed-db.ts`).

---

## Adding a New Portal Feature

1. Create `src/features/<feature>/FeatureApp.tsx`
2. Add entry to `featureRegistry` in `src/features/portal/components/MyPartnerShell.tsx`
3. Add route case in `PortalApp.tsx → getActiveFeatureId()`
4. Allow the path in `PortalApp.tsx → getRedirectPath()`
5. Render the component in `PortalApp.tsx` JSX (`activeFeatureId === '<feature>' && <FeatureApp />`)

---

## Notes App (`NotesApp.tsx`)

- Colors: mint, sky, coral, gold (defined in `backend/notes/model.ts`)
- Features: pin, search (full-text), word count, createdAt/updatedAt timestamps, offline sync
- Storage: Supabase (primary) + localStorage cache + offline mutation queue
- Layout: sidebar + main editor, 1-col mobile / 2-col desktop

---

## Markdown Editor (`MarkdownWorkspace.tsx`)

- File picker or drag-drop upload of `.md` files
- localStorage persistence of file content (`uploadedFiles`)
- IndexedDB persistence of file handles (for external file watching)
- Split-view: editor (contenteditable) + rendered preview
- 2-second poll detects external file changes
- Save back to original file via File System Access API

---

## Do Not

- Do not use `any` — write proper TS types
- Do not hardcode colors — use `var(--color-*)` tokens
- Do not break the `[data-theme="dark"]` CSS selector system in `globals.css`
- Do not use Tailwind `bg-white` or similar — they override the theme system
- Do not add `react-icons` imports — use `lucide-react`
- Don't ask to start the dev server
