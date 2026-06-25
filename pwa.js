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

    // Show navbar install button
    showNavInstallBtn();

    // Show banner if not dismissed in last 3 days
    const dismissed = localStorage.getItem('pwaInstallDismissed');
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (!dismissed || Date.now() - parseInt(dismissed) > threeDays) {
        showInstallBanner();
    }
});

// ── Navbar install button ─────────────────────────────────────────────────────
function showNavInstallBtn() {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (document.getElementById('pwa-nav-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'pwa-nav-btn';
    btn.innerHTML = '📲 Install App';
    btn.style.cssText = `
        background: linear-gradient(135deg,#667eea,#764ba2);
        color: white; border: none; padding: 7px 16px;
        border-radius: 20px; font-weight: 700; cursor: pointer;
        font-size: 0.82rem; white-space: nowrap;
    `;
    btn.onclick = triggerInstall;

    // Try to add to navbar
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        const li = document.createElement('li');
        li.appendChild(btn);
        navLinks.appendChild(li);
    }
}

// ── Install banner (bottom) ───────────────────────────────────────────────────
function showInstallBanner() {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (document.getElementById('pwa-install-banner')) return;

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

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.style.cssText = `
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        background:linear-gradient(135deg,#667eea,#764ba2); color:white;
        padding:14px 20px; border-radius:16px;
        box-shadow:0 8px 32px rgba(102,126,234,0.45); z-index:99999;
        display:flex; align-items:center; gap:14px;
        max-width:400px; width:calc(100% - 40px);
        animation:slideUpBanner 0.4s ease-out; font-family:'Segoe UI',sans-serif;
    `;
    banner.innerHTML = `
        <span style="font-size:2rem;flex-shrink:0">📱</span>
        <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.95rem">Install Alpha Freshman Tutorial</div>
            <div style="font-size:0.78rem;opacity:0.85;margin-top:2px">ወደ Home Screen ጨምር — offline ይሰራል!</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
            <button id="pwa-install-btn" style="
                background:white;color:#667eea;border:none;padding:8px 18px;
                border-radius:20px;font-weight:700;cursor:pointer;font-size:0.85rem">
                Install
            </button>
            <button id="pwa-dismiss-btn" style="
                background:rgba(255,255,255,0.18);color:white;border:none;
                padding:8px 12px;border-radius:20px;cursor:pointer;font-size:1rem">
                ✕
            </button>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwa-install-btn').onclick = () => { triggerInstall(); banner.remove(); };
    document.getElementById('pwa-dismiss-btn').onclick = () => {
        localStorage.setItem('pwaInstallDismissed', Date.now().toString());
        banner.remove();
    };
}

// ── Trigger native install dialog ─────────────────────────────────────────────
async function triggerInstall() {
    if (!deferredPrompt) {
        // Already installed or browser doesn't support
        alert('ይህን site Chrome browser ላይ ክፍት — address bar ላይ ➕ icon ያያሉ።\n\niPhone ላይ: Share → Add to Home Screen');
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        console.log('[PWA] Installed ✅');
    }
    deferredPrompt = null;
    document.getElementById('pwa-nav-btn')?.parentElement?.remove();
}

// ── Installed callback ────────────────────────────────────────────────────────
window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.getElementById('pwa-install-banner')?.remove();
    document.getElementById('pwa-nav-btn')?.parentElement?.remove();
    console.log('[PWA] App installed ✅');
});

// ── iOS Safari: show manual instructions ─────────────────────────────────────
function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

if (isIOS() && !window.matchMedia('(display-mode: standalone)').matches) {
    const dismissed = localStorage.getItem('iosPwaDismissed');
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (!dismissed || Date.now() - parseInt(dismissed) > threeDays) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (document.getElementById('ios-pwa-tip')) return;
                const tip = document.createElement('div');
                tip.id = 'ios-pwa-tip';
                tip.style.cssText = `
                    position:fixed; bottom:0; left:0; right:0;
                    background:linear-gradient(135deg,#667eea,#764ba2); color:white;
                    padding:16px 20px 24px; z-index:99999; font-family:'Segoe UI',sans-serif;
                    border-radius:20px 20px 0 0; box-shadow:0 -4px 20px rgba(0,0,0,0.2);
                `;
                tip.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                        <strong style="font-size:1rem">📱 Install on iPhone</strong>
                        <button onclick="this.parentElement.parentElement.remove();localStorage.setItem('iosPwaDismissed','${Date.now()}')"
                            style="background:none;border:none;color:white;font-size:1.3rem;cursor:pointer">✕</button>
                    </div>
                    <p style="font-size:0.88rem;margin:0;line-height:1.6;opacity:0.92">
                        1. ከታች Share button (□↑) click አድርግ<br>
                        2. <strong>"Add to Home Screen"</strong> ምረጥ<br>
                        3. <strong>"Add"</strong> click አድርግ — app ሆኖ ይጨምራል!
                    </p>
                `;
                document.body.appendChild(tip);
            }, 2000);
        });
    }
}
