import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// On the very first visit the SW registers mid-page and claims via clientsClaim,
// but Chrome has already skipped the installability check by then.
// Reload once (when there was no prior controller) so the SW is active from the
// start of the next page load, which lets Chrome fire beforeinstallprompt.
if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  }, { once: true })
}

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

