// ─── PWA Install & Service Worker ────────────────────────────────────────────

let deferredPrompt;

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker Registered!', reg))
            .catch(err => console.warn('Service Worker Registration Failed:', err));
    });
}

// ── Capture install prompt ────────────────────────────────────────────────────
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show all install buttons
    document.querySelectorAll('#installBtn, #autoInstallBtn, #pwa-nav-btn').forEach(btn => {
        if (btn) btn.style.display = 'block';
    });

    // Show bottom banner
    const dismissed = localStorage.getItem('pwaInstallDismissed');
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    if (!dismissed || Date.now() - parseInt(dismissed) > threeDays) {
        showInstallBanner();
    }
});

// ── Install button click (any #installBtn on page) ────────────────────────────
document.addEventListener('click', async (e) => {
    const ids = ['installBtn', 'autoInstallBtn', 'pwa-nav-btn'];
    if (e.target && ids.includes(e.target.id)) {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('ተማሪው አፑን ጭኖታል!');
            }
            deferredPrompt = null;
            document.querySelectorAll('#installBtn, #autoInstallBtn, #pwa-nav-btn').forEach(btn => {
                if (btn) btn.style.display = 'none';
            });
        } else {
            const ua = navigator.userAgent.toLowerCase();
            if (/iphone|ipad|ipod/.test(ua)) {
                alert('🍎 iPhone: Safari → Share (□↑) → Add to Home Screen');
            } else if (/android/.test(ua)) {
                alert('🤖 Android: Chrome → ⋮ menu → Add to Home Screen');
            } else {
                alert('💻 Desktop: Chrome/Edge address bar → ⊕ icon → Install');
            }
        }
    }
});

// ── triggerInstall (called from other scripts) ────────────────────────────────
async function triggerInstall() {
    const btn = document.getElementById('installBtn') || document.getElementById('autoInstallBtn');
    if (btn) btn.click();
}

// ── Install banner (bottom of screen) ────────────────────────────────────────
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
            <button id="installBtn" style="
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

    document.getElementById('pwa-dismiss-btn').onclick = () => {
        localStorage.setItem('pwaInstallDismissed', Date.now().toString());
        banner.remove();
    };
}

// ── iOS Safari install tip ────────────────────────────────────────────────────
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    && !window.matchMedia('(display-mode: standalone)').matches) {
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
                    padding:16px 20px 28px; z-index:99999;
                    border-radius:20px 20px 0 0;
                    font-family:'Segoe UI',sans-serif;
                `;
                tip.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                        <strong style="font-size:1rem">📱 Install on iPhone</strong>
                        <button onclick="this.parentElement.parentElement.remove();localStorage.setItem('iosPwaDismissed','${Date.now()}')"
                            style="background:none;border:none;color:white;font-size:1.4rem;cursor:pointer">✕</button>
                    </div>
                    <p style="font-size:0.88rem;margin:0;line-height:1.7;opacity:0.92">
                        1. Share button <strong>(□↑)</strong> click አድርግ<br>
                        2. <strong>"Add to Home Screen"</strong> ምረጥ<br>
                        3. <strong>"Add"</strong> click → app ይጨምራል! ✅
                    </p>
                `;
                document.body.appendChild(tip);
            }, 2000);
        });
    }
}

// ── Already installed ─────────────────────────────────────────────────────────
window.addEventListener('appinstalled', () => {
    console.log('ተማሪው አፑን ጭኖታል! ✅');
    deferredPrompt = null;
    document.getElementById('pwa-install-banner')?.remove();
    document.querySelectorAll('#installBtn, #autoInstallBtn, #pwa-nav-btn').forEach(btn => {
        if (btn) btn.style.display = 'none';
    });
});
