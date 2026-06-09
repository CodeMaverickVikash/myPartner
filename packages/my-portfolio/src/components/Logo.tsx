import type { LogoProps } from '../types'

const Logo = ({ className = '', width = '40', height = '40' }: LogoProps) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="8" y="8" width="84" height="84" rx="18" fill="var(--color-forest)" />
      <path d="M28 64V34h8l14 20 14-20h8v30h-8V47L53 64h-6L36 47v17h-8Z" fill="white" />
      <path d="M22 28h56" stroke="white" strokeOpacity=".45" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export function NavbarLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo />
      <span>
        <strong className="block text-sm font-extrabold leading-none text-ink-1">VM Portfolio</strong>
        <small className="block text-[10px] leading-none text-ink-3">Engineer profile</small>
      </span>
    </div>
  )
}

export function LogoWithText() {
  return (
    <div className="flex items-center gap-3">
      <Logo width="44" height="44" />
      <span>
        <strong className="block text-base font-extrabold text-ink-1">Vikash Maskhare</strong>
        <small className="text-xs text-ink-3">Software Engineer</small>
      </span>
    </div>
  )
}

export default Logo
