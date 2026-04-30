// ─── PWA Install & Service Worker ────────────────────────────────────────────

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[PWA] Service Worker registered', reg.scope))
            .catch(err => console.warn('[PWA] SW registration failed:', err));
    });
}

// ── Install prompt ────────────────────────────────────────────────────────────
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
});

function showInstallBanner() {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('pwaInstallDismissed')) return;

    // Create banner
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 14px 20px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(102,126,234,0.4);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 14px;
        max-width: 380px;
        width: calc(100% - 40px);
        animation: slideUpBanner 0.4s ease-out;
        font-family: 'Segoe UI', sans-serif;
    `;

    banner.innerHTML = `
        <span style="font-size:2rem;flex-shrink:0">📱</span>
        <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.95rem">Install Alpha Freshman Tutorial</div>
            <div style="font-size:0.78rem;opacity:0.85;margin-top:2px">Add to home screen for offline access</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
            <button id="pwa-install-btn" style="
                background:white;color:#667eea;border:none;padding:8px 16px;
                border-radius:20px;font-weight:700;cursor:pointer;font-size:0.85rem;
                white-space:nowrap">
                Install
            </button>
            <button id="pwa-dismiss-btn" style="
                background:rgba(255,255,255,0.2);color:white;border:none;
                padding:8px 10px;border-radius:20px;cursor:pointer;font-size:0.85rem">
                ✕
            </button>
        </div>
    `;

    // Add animation
    if (!document.getElementById('pwaStyle')) {
        const s = document.createElement('style');
        s.id = 'pwaStyle';
        s.textContent = `
            @keyframes slideUpBanner {
                from { opacity:0; transform:translateX(-50%) translateY(20px); }
                to   { opacity:1; transform:translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(s);
    }

    document.body.appendChild(banner);

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('[PWA] User accepted install');
            toast?.success('App installed! 🎉 Find it on your home screen.');
        }
        deferredPrompt = null;
        banner.remove();
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
        localStorage.setItem('pwaInstallDismissed', '1');
        banner.remove();
    });
}

// ── Already installed ─────────────────────────────────────────────────────────
window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    document.getElementById('pwa-install-banner')?.remove();
    toast?.success('App installed! Open from your home screen anytime. 🎉');
});
