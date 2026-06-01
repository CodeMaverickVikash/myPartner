'use client'

import { ArrowRight, BookOpenText, NotebookTabs, type LucideIcon } from 'lucide-react'
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
    <div className="flex flex-1 flex-col items-center justify-center overflow-auto px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-1">Choose a workspace</h1>
          <p className="mt-3 text-sm text-ink-3">Select a tool to get started</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {featureRegistry.map(feature => {
            const Icon = icons[feature.id] ?? feature.icon
            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => onNavigate(feature.route)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-1 text-left transition-all duration-200 hover:border-forest/40 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
              >
                <div className="h-1 w-full shrink-0 bg-forest" />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest/10 text-forest transition-colors group-hover:bg-forest/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink-1">{feature.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-3">{taglines[feature.id] ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-forest opacity-0 transition-opacity group-hover:opacity-100">
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
