import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// ── Service Worker: auto-reload on new version (PWA mobile fix) ──────────────
if ('serviceWorker' in navigator) {
  // Listen for SW_UPDATED messages from the service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED') {
      console.log('[App] New version deployed:', event.data.version)
      // Show a non-blocking toast banner then auto-reload after 2s
      showUpdateBanner()
    }
  })

  // Check for new SW on every page focus (mobile background/foreground)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.update().catch(() => {})
      })
    }
  })
}

function showUpdateBanner() {
  // Remove any existing banner
  const existing = document.getElementById('sw-update-banner')
  if (existing) existing.remove()

  const banner = document.createElement('div')
  banner.id = 'sw-update-banner'
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white; text-align: center; padding: 12px 20px;
    font-family: sans-serif; font-size: 14px; font-weight: 600;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center; gap: 12px;
  `
  banner.innerHTML = `
    <span>🔄 አዲስ ስሪት ዝግጁ ነው! (New version available)</span>
    <button onclick="window.location.reload()" style="
      background: white; color: #667eea; border: none; padding: 6px 14px;
      border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 13px;
    ">Update Now</button>
    <button onclick="this.parentElement.remove()" style="
      background: rgba(255,255,255,0.2); color: white; border: none;
      padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 13px;
    ">✕</button>
  `
  document.body.prepend(banner)

  // Auto-reload after 5 seconds if user doesn't dismiss
  setTimeout(() => {
    if (document.getElementById('sw-update-banner')) {
      window.location.reload()
    }
  }, 5000)
}
