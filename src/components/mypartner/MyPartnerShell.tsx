import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  LogOut,
  Moon,
  NotebookTabs,
  Sun,
  Zap,
  type LucideIcon
} from 'lucide-react'

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
  activeFeatureId: FeatureId
  session: AuthSession
  children?: ReactNode
  onLogout: () => void
  onNavigate: (path: string) => void
}

interface FeatureRegistryItem {
  id: FeatureId
  label: string
  route: string
  icon: LucideIcon
}

export const featureRegistry: FeatureRegistryItem[] = [
  { id: 'markdown', label: 'Markdown', route: '/portal/markdown', icon: BookOpenText },
  { id: 'notes',    label: 'Notes',    route: '/portal/notes',    icon: NotebookTabs  }
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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-1 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1"
      type="button"
      onClick={onToggleTheme}
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      {theme === 'dark'
        ? <Sun className="h-[15px] w-[15px]" />
        : <Moon className="h-[15px] w-[15px]" />
      }
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
  const inputClass = 'mt-1.5 w-full rounded-xl border border-line bg-surface-0 px-4 py-2.5 text-sm text-ink-1 placeholder:text-ink-3 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email   = String(formData.get('email')   ?? '').trim()
    const name    = String(formData.get('name')    ?? '').trim()
    const company = String(formData.get('company') ?? '').trim()
    onLogin({
      email,
      name:    name    || email.split('@')[0] || 'Partner',
      company: company || 'Workspace',
      signedInAt: new Date().toISOString()
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
            {loginFeatures.map(feature => (
              <li key={feature} className="flex items-center gap-3 text-sm text-ink-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-forest" />
                {feature}
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
          <p className="mt-1 text-sm text-ink-3">Local workspace · no password required</p>

          <div className="mt-6 space-y-4">
            <label className="block text-xs font-semibold text-ink-2">
              Work email *
              <input className={inputClass} name="email" type="email" placeholder="you@company.com" required />
            </label>
            <label className="block text-xs font-semibold text-ink-2">
              Name
              <input className={inputClass} name="name" type="text" placeholder="Your name" />
            </label>
            <label className="block text-xs font-semibold text-ink-2">
              Company
              <input className={inputClass} name="company" type="text" placeholder="Company or team" />
            </label>
          </div>

          <button
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3 font-semibold text-white transition hover:bg-forest-strong active:scale-[0.98]"
            type="submit"
          >
            Open portal
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </main>
  )
}

export function MyPartnerPortal({
  activeFeatureId,
  session,
  children,
  theme,
  onLogout,
  onNavigate,
  onToggleTheme
}: PortalProps) {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-surface-0 max-lg:h-auto max-lg:min-h-screen">

      {/* Topbar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface-1 px-4 lg:px-5">
        <BrandMark />

        <div className="h-6 w-px shrink-0 bg-line" />

        {/* Feature tabs */}
        <nav className="flex gap-1" aria-label="Features">
          {featureRegistry.map(feature => (
            <button
              key={feature.id}
              type="button"
              onClick={() => onNavigate(feature.route)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                feature.id === activeFeatureId
                  ? 'bg-forest/10 text-forest'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1'
              }`}
            >
              <feature.icon className="h-4 w-4" />
              {feature.label}
            </button>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-3">{session.company}</p>
            <p className="truncate text-xs text-ink-2">{session.name}</p>
          </div>

          <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-2 transition hover:border-crimson/40 hover:bg-crimson/5 hover:text-crimson"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Feature workspace */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden [&>.app-container]:flex-1 [&>.app-container]:min-h-0 [&>main]:flex-1 [&>main]:min-h-0" aria-label="Feature workspace">
        {children}
      </section>
    </main>
  )
}

/* ── UserAvatar (unused but kept for future use) ── */
export function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest/20 text-xs font-bold text-forest">
      {initials}
    </span>
  )
}

/* ── Dropdown component (kept for potential reuse) ── */
function Dropdown({ children, trigger }: { children: ReactNode; trigger: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && event.target instanceof Node && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-xl border border-line bg-surface-1 p-1.5 shadow-xl">
          {children}
        </div>
      )}
    </div>
  )
}

export { Dropdown }
