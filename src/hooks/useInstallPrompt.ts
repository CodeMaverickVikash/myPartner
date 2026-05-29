import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent
  }
}

// ── Module-level singleton ────────────────────────────────────────────────────
// Multiple hook instances (InstallPrompt banner + login page button) run on the
// same page. In production the SW is pre-cached so beforeinstallprompt fires
// before React effects run and lands in window.__pwaPrompt. Without shared
// state the first hook to mount consumes __pwaPrompt and the second gets
// nothing. By moving state to module scope every instance always sees the same
// prompt regardless of mount order or event timing.

let _prompt: BeforeInstallPromptEvent | null = null
let _installed = false
const _subs = new Set<() => void>()

function _notify() {
  _subs.forEach(fn => fn())
}

if (typeof window !== 'undefined') {
  // Pick up early-captured prompt (fired before the bundle loaded)
  if (window.__pwaPrompt) {
    _prompt = window.__pwaPrompt
    window.__pwaPrompt = undefined
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _prompt = e as BeforeInstallPromptEvent
    _installed = false
    _notify()
  })

  window.addEventListener('appinstalled', () => {
    _prompt = null
    _installed = true
    _notify()
  })
}
// ─────────────────────────────────────────────────────────────────────────────

export function useInstallPrompt() {
  const [, tick] = useState(0)

  useEffect(() => {
    const rerender = () => tick(n => n + 1)
    _subs.add(rerender)
    // Prompt may have already arrived before this hook mounted
    if (_prompt !== null || _installed) rerender()
    return () => { _subs.delete(rerender) }
  }, [])

  const install = async () => {
    if (!_prompt) return false
    const p = _prompt
    _prompt = null       // prevent double-invocation before async resolves
    _notify()
    await p.prompt()
    const { outcome } = await p.userChoice
    if (outcome === 'accepted') {
      _installed = true
    }
    _notify()
    return outcome === 'accepted'
  }

  return {
    canInstall: _prompt !== null && !_installed,
    installed: _installed,
    install,
  }
}
