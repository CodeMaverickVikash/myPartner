import { useState, type ReactNode, type SyntheticEvent } from 'react'
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Download,
  Loader2,
  LogOut,
  Moon,
  NotebookTabs,
  Sun,
  Zap,
  type LucideIcon
} from '@markdown-viewer/common/dependencies'
import { getApiUrl } from '@markdown-viewer/common'
import { toast } from '@markdown-viewer/common/dependencies'
import { useInstallPrompt } from '../../pwa/hooks/useInstallPrompt'

export type ThemeMode = 'light' | 'dark'
export type FeatureId = 'markdown' | 'notes'

export interface AuthSession {
  name: string
  email: string
  company: string
  signedInAt: string
}

interface ShellProps {
  theme: ThemeMode
  onToggleTheme: () => void
}

interface LoginProps extends ShellProps {
  onLogin: (session: AuthSession) => void
}

interface PortalProps extends ShellProps {
  session: AuthSession
  children?: ReactNode
  onLogout: () => void
}

interface FeatureRegistryItem {
  id: FeatureId
  label: string
  route: string
  icon: LucideIcon
}

export const featureRegistry: FeatureRegistryItem[] = [
  { id: 'markdown', label: 'Markdown', route: '/portal/markdown', icon: BookOpenText },
  { id: 'notes',    label: 'Notes',    route: '/portal/notes',    icon: NotebookTabs },
]

function BrandMark() {
  return (
    <div className="inline-flex shrink-0 items-center gap-2.5" aria-label="myPartner">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-[#0f766e] to-[#14b8a6] text-xs font-black text-white shadow-sm">
        mP
      </span>
      <span className="hidden sm:block">
        <strong className="block text-sm font-extrabold leading-none text-ink-1">myPartner</strong>
        <small className="block text-[10px] leading-none text-ink-3 mt-0.5">Work portal</small>
      </span>
    </div>
  )
}

function ThemeButton({ theme, onToggleTheme }: ShellProps) {
  return (
    <button
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-1 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1 cursor-pointer"
      type="button"
      onClick={onToggleTheme}
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
    </button>
  )
}

const loginFeatures = [
  'Direct file system access with auto-sync',
  'Rich markdown editor with live preview',
  'Color-coded pinnable notes',
  'Offline-first — no data leaves your browser',
]

export function MyPartnerLogin({ theme, onLogin, onToggleTheme }: LoginProps) {
  const { canInstall, installed, install } = useInstallPrompt()
  const [isChecking, setIsChecking] = useState(false)
  const [emailError, setEmailError] = useState('')

  const inputClass =
    'mt-1.5 w-full rounded-xl border border-line bg-surface-0 px-4 py-2.5 text-sm text-ink-1 placeholder:text-ink-3 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20'

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email   = String(fd.get('email')   ?? '').trim()
    const name    = String(fd.get('name')    ?? '').trim()
    const company = String(fd.get('company') ?? '').trim()

    setIsChecking(true)
    setEmailError('')
    try {
      const res = await fetch(getApiUrl('/api/auth/check-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const { allowed } = (await res.json()) as { allowed: boolean }
      if (!allowed) {
        setEmailError('Access restricted. This email is not authorized.')
        setIsChecking(false)
        return
      }
    } catch {
      // fail open — a broken API should not lock users out
    }
    setIsChecking(false)

    onLogin({
      email,
      name:    name    || email.split('@')[0] || 'Partner',
      company: company || 'Workspace',
      signedInAt: new Date().toISOString(),
    })
  }

  return (
    <main className="min-h-screen bg-surface-0">
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface-1 px-5 lg:px-10">
        <BrandMark />
        <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-5xl flex-col items-center justify-center gap-12 px-5 py-12 lg:grid lg:grid-cols-[1fr_400px] lg:gap-20">

        {/* Hero */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">
            <Zap className="h-3 w-3" />
            Feature-focused workspace
          </span>

          <h1 className="mt-4 text-[clamp(36px,5vw,60px)] font-black leading-[1.05] tracking-tight text-ink-1">
            Your workspace,<br />your pace.
          </h1>

          <p className="mt-4 max-w-md text-base leading-7 text-ink-2">
            Access Markdown editor and Notes from one focused local portal — live file sync and full privacy, no backend required.
          </p>

          <ul className="mt-8 space-y-3">
            {loginFeatures.map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-ink-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-forest" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Login card */}
        <form
          className="w-full rounded-2xl border border-line bg-surface-1 p-7 shadow-2xl"
          onSubmit={handleSubmit}
        >
          <h2 className="text-xl font-bold text-ink-1">Sign in to continue</h2>
          <p className="mt-1 text-sm text-ink-3">Local workspace</p>

          <div className="mt-6 space-y-4">
            <label className="block text-xs font-semibold text-ink-2">
              Work email *
              <input
                className={inputClass}
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
                onChange={() => setEmailError('')}
              />
              {emailError && (
                <p id="email-error" role="alert" className="mt-1.5 text-xs text-crimson">
                  {emailError}
                </p>
              )}
            </label>
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3 font-semibold text-white transition hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking…
              </>
            ) : (
              <>
                Open portal
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={installed ? undefined : canInstall ? install : () => toast('To install: click the ⊕ icon in your browser\'s address bar, or use browser menu → Install app')}
            disabled={installed}
            className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-2.5 text-sm font-medium transition active:scale-[0.98] ${
              installed
                ? 'cursor-default border-forest/30 bg-forest/5 text-forest'
                : 'border-line bg-surface-0 text-ink-2 hover:border-forest/40 hover:bg-forest/5 hover:text-forest cursor-pointer'
            }`}
          >
            {installed
              ? <><CheckCircle2 className="h-4 w-4" /> App installed</>
              : <><Download className="h-4 w-4" /> Install as App</>
            }
          </button>
        </form>
      </div>
    </main>
  )
}

export function MyPartnerPortal({
  session,
  children,
  theme,
  onLogout,
  onToggleTheme,
}: PortalProps) {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-surface-0 max-lg:h-auto max-lg:min-h-screen">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface-1 px-4 lg:px-5">
        <BrandMark />
        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-3">{session.company}</p>
            <p className="truncate text-xs text-ink-2">{session.name}</p>
          </div>

          <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-2 transition hover:border-crimson/40 hover:bg-crimson/5 hover:text-crimson cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <section
        className="flex min-h-0 flex-1 flex-col overflow-auto lg:overflow-hidden [&>.app-container]:flex-1 [&>.app-container]:min-h-0 [&>main]:flex-1 [&>main]:min-h-0"
        aria-label="Feature workspace"
      >
        {children}
      </section>
    </main>
  )
}
