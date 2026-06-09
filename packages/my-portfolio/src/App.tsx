import { getPortfolioRoutes, PORTFOLIO_BASE_PATH } from './constants'
import { Home, Profile, TechStack } from './views'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

interface PortfolioAppProps {
  path?: string
  basePath?: string
  onNavigate?: (path: string) => void
}

const readPath = () => {
  if (typeof window === 'undefined') return PORTFOLIO_BASE_PATH
  return window.location.pathname.replace(/\/+$/, '') || PORTFOLIO_BASE_PATH
}

const fallbackNavigate = (nextPath: string) => {
  if (typeof window === 'undefined') return
  window.history.pushState({}, '', nextPath)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function PortfolioApp({
  path = readPath(),
  basePath = PORTFOLIO_BASE_PATH,
  onNavigate = fallbackNavigate,
}: PortfolioAppProps) {
  const routes = getPortfolioRoutes(basePath)
  const normalizedPath = path.replace(/\/+$/, '') || basePath

  const page = (() => {
    if (normalizedPath === routes.PROFILE) return <Profile />
    if (normalizedPath === routes.TECH_STACK) return <TechStack />
    return <Home onNavigate={onNavigate} routes={routes} />
  })()

  return (
    <div className="flex min-h-full flex-col bg-surface-0 text-ink-1">
      <Navbar path={normalizedPath} basePath={basePath} onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto">{page}</main>
      <Footer path={normalizedPath} basePath={basePath} onNavigate={onNavigate} />
    </div>
  )
}

export default PortfolioApp
