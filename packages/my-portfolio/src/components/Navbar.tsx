import { useState } from 'react'
import { Code2, Home, Menu, User, X } from '@mypartner/common/dependencies'
import { getPortfolioRoutes } from '../constants'
import type { PortfolioNavigationProps } from '../types'
import { NavbarLogo } from './Logo'

const navIcons = {
  Home,
  Profile: User,
  'Tech Stack': Code2,
}

const navItems = (basePath: string) => {
  const routes = getPortfolioRoutes(basePath)
  return [
    { href: routes.HOME, label: 'Home' },
    { href: routes.PROFILE, label: 'Profile' },
    { href: routes.TECH_STACK, label: 'Tech Stack' },
  ]
}

const Navbar = ({ path, basePath, onNavigate }: PortfolioNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const items = navItems(basePath)

  const navigate = (href: string) => {
    setIsOpen(false)
    onNavigate(href)
  }

  const linkClass = (href: string) => {
    const isActive = path === href
    return [
      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors cursor-pointer',
      isActive
        ? 'bg-forest text-white'
        : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
    ].join(' ')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface-1/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={() => navigate(basePath)} className="cursor-pointer">
          <NavbarLogo />
        </button>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {items.map(item => {
            const Icon = navIcons[item.label as keyof typeof navIcons]
            return (
              <button key={item.href} type="button" onClick={() => navigate(item.href)} className={linkClass(item.href)}>
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => setIsOpen(current => !current)}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-0 text-ink-2 md:hidden"
          aria-label="Toggle portfolio navigation"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {isOpen && (
        <nav className="border-t border-line bg-surface-1 px-4 py-3 md:hidden">
          <div className="mx-auto grid max-w-7xl gap-1">
            {items.map(item => {
              const Icon = navIcons[item.label as keyof typeof navIcons]
              return (
                <button key={item.href} type="button" onClick={() => navigate(item.href)} className={linkClass(item.href)}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </header>
  )
}

export default Navbar
