import { BriefcaseBusiness, Code2, Mail, MapPin, Phone } from '@mypartner/common/dependencies'
import { CONTACT_INFO, SOCIAL_LINKS } from '../constants'
import type { PortfolioNavigationProps } from '../types'
import { LogoWithText } from './Logo'

const Footer = (_props: PortfolioNavigationProps) => {
  return (
    <footer className="border-t border-line bg-surface-1">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1fr_auto]">
        <div>
          <LogoWithText />
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-2">
            React and Angular developer focused on practical, maintainable web applications.
          </p>
          <div className="mt-4 grid gap-2 text-sm text-ink-2 sm:grid-cols-3">
            <a className="flex items-center gap-2 hover:text-forest" href={`mailto:${CONTACT_INFO.EMAIL}`}>
              <Mail className="h-4 w-4" />
              {CONTACT_INFO.EMAIL}
            </a>
            <a className="flex items-center gap-2 hover:text-forest" href={`tel:${CONTACT_INFO.PHONE.replace(/\s/g, '')}`}>
              <Phone className="h-4 w-4" />
              {CONTACT_INFO.PHONE}
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {CONTACT_INFO.LOCATION}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <a className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2 hover:bg-surface-2 hover:text-forest" href={SOCIAL_LINKS.GITHUB} target="_blank" rel="noreferrer" aria-label="GitHub">
            <Code2 className="h-4 w-4" />
          </a>
          <a className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2 hover:bg-surface-2 hover:text-forest" href={SOCIAL_LINKS.LINKEDIN} target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <BriefcaseBusiness className="h-4 w-4" />
          </a>
          <a className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-2 hover:bg-surface-2 hover:text-forest" href={SOCIAL_LINKS.EMAIL} aria-label="Email">
            <Mail className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
