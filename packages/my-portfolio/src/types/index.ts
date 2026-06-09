import type { LucideIcon } from '@mypartner/common/dependencies'

export interface PortfolioNavigationProps {
  path: string
  basePath: string
  onNavigate: (path: string) => void
}

export interface LogoProps {
  className?: string
  width?: string
  height?: string
}

export interface Category {
  name: string
  icon: LucideIcon
}

export interface TechItem {
  id: string
  name: string
  description: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  year: string
  paradigm: string
  features: string[]
  useCases: string[]
  icon: string
  isActive: boolean
}
