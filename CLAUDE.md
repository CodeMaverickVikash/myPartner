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

A **browser-only SPA** — no backend, no server. It is a dual-feature productivity portal ("MyPartner Portal") with:
1. **Markdown Editor** — upload, edit, preview, and export `.md` files with live splitting and file watching
2. **Notes App** — color-coded, pinnable, searchable notes

Authentication is client-side only (localStorage). All storage is browser-local.

---

## Commands

```powershell
pnpm dev       # Vite dev server → http://localhost:5173
pnpm build     # TypeScript check + production build → dist/
pnpm preview   # Serve production build locally
```

---

## Agents

| Agent | File | Use when |
|---|---|---|
| `ux-ui-developer-agent` | `.claude/agents/ux-ui-developer-agent.md` | Any UI work — layout, components, accessibility, states, dark mode, responsive design |

Invoke: `@ux-ui-developer-agent` or naturally — *"have the ux agent review the login form"*.

---

## Architecture

```
src/
├── App.tsx                                # Root: routing + auth state + theme toggle
├── types.ts                               # Shared interfaces: MarkdownFile, Heading
├── index.css                              # Global CSS: @theme tokens, dark mode, markdown styles
├── components/
│   ├── mypartner/
│   │   └── MyPartnerShell.tsx             # Auth shell: Login form + Portal layout + featureRegistry
│   ├── notes/
│   │   └── NotesApp.tsx                   # Notes feature (create/edit/pin/search/color)
│   ├── markdown/
│   │   └── MarkdownWrapper.tsx            # Markdown editor orchestrator
│   ├── Sidebar.tsx                        # File list + heading navigation
│   ├── Content.tsx                        # Split-view content area
│   ├── MarkdownEditor.tsx                 # Raw text editor pane (contenteditable)
│   └── MarkdownViewer.tsx                 # Rendered HTML preview pane
└── utils/
    ├── fileSystem.ts                      # File System Access API wrapper
    ├── indexedDB.ts                       # Persist FileSystemFileHandle across page reloads
    ├── markdown.ts                        # marked.parse() + highlight.js + heading extraction
    └── storage.ts                         # localStorage JSON helpers
```

---

## Routing

Client-side routing using the browser History API (no React Router).

| Path | Renders | Condition |
|---|---|---|
| `/login` | `MyPartnerLogin` | Unauthenticated |
| `/portal/markdown` | `MyPartnerPortal` → `MarkdownWrapper` | Default after login |
| `/portal/notes` | `MyPartnerPortal` → `NotesApp` | Notes feature |

**`App.tsx` key functions:**
- `getRedirectPath(path, hasSession)` — enforces auth guard; returns redirect target or `null`
- `getActiveFeatureId(path): FeatureId` — maps path to `'markdown' | 'notes'`
- `navigateTo(path, replace?)` — pushes/replaces history and fires `popstate`

---

## Auth Flow

1. No session → `getRedirectPath` returns `/login` → `MyPartnerLogin` renders
2. Submit form → `handleLogin(session)` → stores `AuthSession` in localStorage under `mypartner-auth-session` → navigates to `/portal/markdown`
3. Logout → clears `mypartner-auth-session` → navigates to `/login`
4. Session survives page reload (read from localStorage on mount)

`AuthSession` shape (from `MyPartnerShell.tsx`):
```ts
interface AuthSession {
  name: string
  email: string
  company: string
  signedInAt: string
}
```

---

## Theme System

**How it works:**
- `data-theme="dark"` attribute set on `document.documentElement` by `App.tsx`
- Persisted to `localStorage` under key `mypartner-theme`
- On load: reads saved preference, falls back to `prefers-color-scheme`

**Global tokens (Tailwind `@theme` in `index.css`):**

| Token | Light | Dark |
|---|---|---|
| `--color-surface-0` | `#F8FAFC` | `#0D1117` |
| `--color-surface-1` | `#FFFFFF` | `#161B22` |
| `--color-surface-2` | `#F1F5F9` | `#1C2128` |
| `--color-ink-1` | `#0F172A` | `#E6EDF3` |
| `--color-ink-2` | `#475569` | `#8B949E` |
| `--color-ink-3` | `#94A3B8` | `#6E7681` |
| `--color-line` | `#E2E8F0` | `#30363D` |

**Brand palette:**
- `--color-crimson: #A82323` | `--color-cream: #FEFFD3` | `--color-sage: #BCD9A2` | `--color-forest: #6D9E51`

**MyPartner shell vars** (set inline via JS in `MyPartnerShell.tsx`, not in CSS):

| Var | Purpose |
|---|---|
| `--mp-bg` | Shell background |
| `--mp-bg-elevated` | Cards/panels |
| `--mp-bg-muted` | Toolbars, muted areas |
| `--mp-text` | Primary text |
| `--mp-text-muted` | Secondary text |
| `--mp-border` | Borders |
| `--mp-primary` | Primary brand color (teal: `#0f766e` light / `#2dd4bf` dark) |
| `--mp-primary-strong` | Hover state for primary |
| `--mp-accent` | Accent/highlight (amber) |
| `--mp-danger` | Destructive actions |
| `--mp-shadow` | Box shadow |
| `--mp-ring` | Focus ring |

**Rule:** Use `var(--color-surface-*)` and `var(--color-ink-*)` for any new UI elements. Never hardcode colors that break in dark mode.

---

## localStorage Keys

| Key | Type | Content |
|---|---|---|
| `mypartner-auth-session` | `AuthSession` | Login session |
| `mypartner-theme` | `'light' \| 'dark'` | Theme preference |
| `markdown-viewer-files` | `MarkdownFile[]` | Uploaded markdown files |
| `markdown-viewer-notes` | Note array | Notes app data |

---

## Tech Stack

| Layer | Tool | Version |
|---|---|---|
| UI | React | 19 |
| Language | TypeScript | 5 (strict mode) |
| Build | Vite | 7 |
| Styling | Tailwind CSS v4 (PostCSS `@theme`) | 4 |
| Markdown | marked | 17 |
| Syntax highlight | highlight.js (github-dark theme) | 11 |
| Icons | lucide-react (preferred) + react-icons | — |
| Notifications | react-hot-toast | — |
| Deploy | Vercel (`vercel.json` has SPA rewrite rule) | — |

---

## Key Conventions

- **No backend** — browser-only storage only (localStorage, IndexedDB, File System Access API)
- **Strict TypeScript** — no `any`, no unused vars/params (`tsconfig.app.json: strict: true`)
- **Tailwind v4** — uses `@theme` directive in `index.css`; do not add config to `tailwind.config.js`
- **Icons** — use `lucide-react` for new icons; avoid adding new `react-icons` imports
- **State** — local React state + localStorage; no Redux, Zustand, or Context needed
- **Comments** — only when the WHY is non-obvious; never describe what the code does
- **No `any`** — define types in `types.ts` or inline if feature-specific

---

## Feature: File System Access API

`utils/fileSystem.ts`:
- `openFileFromSystem()` — file picker → returns `File`
- `saveToFileHandle(handle, content)` — write to existing handle
- `saveAsNewFile(content)` — save-as dialog
- `checkFileModified(handle, lastModified)` — detect external edits
- `watchFile(handle, cb)` — polls every 2 s; returns cleanup function
- `isFileSystemAccessSupported()` — feature detection guard

File handles survive page reload via IndexedDB (`utils/indexedDB.ts`).

---

## Adding a New Portal Feature

1. Create `src/components/<feature>/FeatureApp.tsx`
2. Add entry to `featureRegistry` array in `MyPartnerShell.tsx`
3. Add route case in `App.tsx → getActiveFeatureId()`
4. Allow the path in `App.tsx → getRedirectPath()`
5. Render the component in `App.tsx` JSX (`activeFeatureId === '<feature>' && <FeatureApp />`)

---

## Notes App (`NotesApp.tsx`)

- Colors: mint, sky, coral, gold
- Features: pin, search (full-text), word count, createdAt/updatedAt timestamps
- Storage: `markdown-viewer-notes` in localStorage
- Layout: sidebar + main editor, 1-col mobile / 2-col desktop

---

## Markdown Editor (`MarkdownWrapper.tsx`)

- Drag-and-drop or picker upload of `.md` files
- localStorage persistence of file content
- IndexedDB persistence of file handles (for external file watching)
- Split-view: editor (contenteditable) + rendered preview
- 2-second poll detects external file changes
- Export as `.md` download

---

## Do Not

- Do not use `any` — write proper TS types
- Do not hardcode colors — use `var(--color-*)` or `var(--mp-*)` vars
- Do not break the `[data-theme="dark"]` CSS selector system in `index.css`
- Do not use Tailwind `bg-white` or similar — they override the theme system
- Don't ask for server start, don't start server
