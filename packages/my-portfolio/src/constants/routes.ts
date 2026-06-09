export const PORTFOLIO_BASE_PATH = '/portal/portfolio' as const

export const getPortfolioRoutes = (basePath: string = PORTFOLIO_BASE_PATH) => ({
  HOME: basePath,
  PROFILE: `${basePath}/profile`,
  TECH_STACK: `${basePath}/tech-stack`,
}) as const

export type PortfolioRoute = string
