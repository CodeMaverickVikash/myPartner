import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import './App.css'
import MarkdownWrapper from './components/markdown/MarkdownWrapper'
import {
  MyPartnerLogin,
  MyPartnerPortal,
  type AuthSession,
  type FeatureId,
  type ThemeMode
} from './components/mypartner/MyPartnerShell'
import NotesApp from './components/notes/NotesApp'
import OfflineBanner from './components/pwa/OfflineBanner'
import UpdateAvailableToast from './components/pwa/UpdateAvailableToast'

const AUTH_KEY = 'mypartner-auth-session'
const THEME_KEY = 'mypartner-theme'

const getPath = () => window.location.pathname.replace(/\/+$/, '') || '/'

const readSession = (): AuthSession | null => {
  try {
    const value = localStorage.getItem(AUTH_KEY)
    return value ? JSON.parse(value) as AuthSession : null
  } catch {
    return null
  }
}

const readTheme = (): ThemeMode => {
  const savedTheme = localStorage.getItem(THEME_KEY)
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  const prefersDark = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
  return prefersDark ? 'dark' : 'light'
}

const navigateTo = (nextPath: string, replace = false) => {
  if (window.location.pathname === nextPath) return

  if (replace) {
    window.history.replaceState({}, '', nextPath)
  } else {
    window.history.pushState({}, '', nextPath)
  }

  window.dispatchEvent(new PopStateEvent('popstate'))
}

const getRedirectPath = (path: string, hasSession: boolean) => {
  if (!hasSession) {
    return path === '/login' ? null : '/login'
  }

  if (path === '/' || path === '/login' || path === '/app' || path === '/portal') return '/portal/markdown'
  if (path === '/markdown') return '/portal/markdown'
  if (path === '/notes') return '/portal/notes'
  if (path === '/portal/markdown' || path === '/portal/notes') return null

  return '/portal/markdown'
}

const getActiveFeatureId = (path: string): FeatureId => {
  if (path === '/portal/notes') return 'notes'
  return 'markdown'
}

function App() {
  const [path, setPath] = useState(getPath)
  const [session, setSession] = useState<AuthSession | null>(() => readSession())
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme())

  useEffect(() => {
    const handlePopState = () => setPath(getPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0d1117' : '#F5F3EF')
    }
  }, [theme])

  useEffect(() => {
    const redirectPath = getRedirectPath(path, Boolean(session))
    if (redirectPath) navigateTo(redirectPath, true)
  }, [path, session])

  const handleLogin = (nextSession: AuthSession) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    navigateTo('/portal/markdown')
  }

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY)
    setSession(null)
    navigateTo('/login')
  }

  const toggleTheme = () => setTheme(currentTheme => currentTheme === 'dark' ? 'light' : 'dark')
  const activeFeatureId = getActiveFeatureId(path)

  return (
    <>
      <OfflineBanner />
      <UpdateAvailableToast />
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: theme === 'dark' ? '#1C2128' : '#ffffff',
            color: theme === 'dark' ? '#E6EDF3' : '#0F172A',
            border: `1px solid ${theme === 'dark' ? '#30363D' : '#E2E8F0'}`,
            padding: '10px 14px',
            borderRadius: '8px',
            boxShadow: theme === 'dark'
              ? '0 4px 12px rgba(0,0,0,0.4)'
              : '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: '13px',
            fontWeight: '500'
          },
          success: {
            style: { background: '#10b981', color: '#fff', border: 'none' },
            iconTheme: { primary: '#fff', secondary: '#10b981' }
          },
          error: {
            style: { background: '#ef4444', color: '#fff', border: 'none' },
            iconTheme: { primary: '#fff', secondary: '#ef4444' }
          }
        }}
      />

      {!session ? (
        <MyPartnerLogin
          theme={theme}
          onLogin={handleLogin}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <MyPartnerPortal
          activeFeatureId={activeFeatureId}
          session={session}
          theme={theme}
          onLogout={handleLogout}
          onNavigate={navigateTo}
          onToggleTheme={toggleTheme}
        >
          {activeFeatureId === 'markdown' && <MarkdownWrapper />}
          {activeFeatureId === 'notes' && <NotesApp />}
        </MyPartnerPortal>
      )}
    </>
  )
}

export default App
