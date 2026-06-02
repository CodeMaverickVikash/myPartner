import { useState } from 'react'
import { Download, X } from '@mypartner/common/dependencies'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

const DISMISS_KEY = 'mypartner-pwa-install-dismissed'

export default function InstallPrompt() {
  const { canInstall, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1'
  )

  if (!canInstall || dismissed) return null

  const handleInstall = async () => {
    await install()
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  return (
    <div
      role="banner"
      className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-2 text-xs font-medium text-ink-2"
    >
      <Download className="h-3.5 w-3.5 shrink-0 text-ink-1" aria-hidden="true" />
      <span className="flex-1">Install myPartner Portal for quick offline access.</span>
      <button
        onClick={handleInstall}
        className="rounded px-2.5 py-1 text-xs font-semibold bg-ink-1 text-surface-1 hover:opacity-80 transition-opacity cursor-pointer"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="rounded p-0.5 hover:bg-line transition-colors cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
