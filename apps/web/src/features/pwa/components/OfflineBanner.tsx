import { useEffect, useState } from 'react'
import { WifiOff } from '@markdown-viewer/common/dependencies'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState<boolean>(() => (
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  ))

  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-2 text-xs font-medium text-[var(--color-ink-2)]"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      You are offline. All data is saved locally and available without a connection.
    </div>
  )
}
