import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdateAvailableToast() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return

    toast(
      () => (
        <button
          type="button"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          onClick={() => void updateServiceWorker(true)}
        >
          New version available — tap to update
        </button>
      ),
      { duration: Infinity, id: 'pwa-update' },
    )
  }, [needRefresh, updateServiceWorker])

  return null
}
