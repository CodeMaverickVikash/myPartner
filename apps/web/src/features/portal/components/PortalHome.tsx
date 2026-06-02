'use client'

import { ArrowRight, BookOpenText, NotebookTabs, type LucideIcon } from '@markdown-viewer/common/dependencies'
import { featureRegistry } from './MyPartnerShell'

interface PortalHomeProps {
  onNavigate: (path: string) => void
}

const taglines: Record<string, string> = {
  markdown: 'Live editor with file sync',
  notes:    'Pinnable notes, offline-first',
}

const icons: Record<string, LucideIcon> = {
  markdown: BookOpenText,
  notes:    NotebookTabs,
}

export default function PortalHome({ onNavigate }: PortalHomeProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-auto px-4 py-8 sm:px-6 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center sm:mb-12">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-1 sm:text-3xl">Choose a workspace</h1>
          <p className="mt-2 text-sm text-ink-3">Select a tool to get started</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {featureRegistry.map(feature => {
            const Icon = icons[feature.id] ?? feature.icon
            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => onNavigate(feature.route)}
                className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-line bg-surface-1 text-left transition-all duration-200 hover:border-forest/40 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              >
                <div className="h-1 w-full shrink-0 bg-forest" />
                <div className="flex flex-1 flex-col gap-2.5 p-4 sm:gap-3 sm:p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest/10 text-forest transition-colors group-hover:bg-forest/20 sm:h-11 sm:w-11 sm:rounded-xl">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-ink-1 sm:text-sm">{feature.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-3 sm:text-xs">{taglines[feature.id] ?? ''}</p>
                  </div>
                  <div className="hidden items-center gap-1 text-xs font-semibold text-forest opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
                    Open workspace
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
