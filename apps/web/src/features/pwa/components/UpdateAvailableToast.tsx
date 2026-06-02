import { useEffect } from 'react'
import { toast } from '@markdown-viewer/common/dependencies'

export default function UpdateAvailableToast() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let isMounted = true

    const showUpdateToast = (registration: ServiceWorkerRegistration) => {
      toast(
        () => (
          <button
            type="button"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => registration.waiting?.postMessage({ type: 'SKIP_WAITING' })}
          >
            New version available - tap to update
          </button>
        ),
        { duration: Infinity, id: 'pwa-update' },
      )
    }

    const reloadOnControllerChange = () => {
      window.location.reload()
    }

    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
      if (!isMounted) return

      if (!navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('controllerchange', reloadOnControllerChange, { once: true })
      }

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(registration)
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing
        if (!installingWorker) return

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(registration)
          }
        })
      })
    }).catch((error) => {
      console.error('Service worker registration failed:', error)
    })

    return () => {
      isMounted = false
      navigator.serviceWorker.removeEventListener('controllerchange', reloadOnControllerChange)
    }
  }, [])

  return null
}
