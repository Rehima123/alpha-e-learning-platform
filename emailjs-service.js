/**
 * EmailJS Service — Alpha Freshman Tutorial
 * ─────────────────────────────────────────
 * Handles two notification emails on registration:
 *  1. Welcome email  → new user
 *  2. Admin alert    → supportalphafreshman@gmail.com
 *
 * Setup (EmailJS dashboard → https://www.emailjs.com):
 *  • Create a Service   → copy SERVICE_ID
 *  • Create Template 1  → WELCOME_TEMPLATE_ID   (to_email, to_name, role, date)
 *  • Create Template 2  → ADMIN_TEMPLATE_ID     (user_name, user_email, user_role, reg_time)
 *  • Copy your PUBLIC_KEY from Account → API Keys
 *
 * Set these values in window.EMAILJS_CONFIG (or a <script> block before this file):
 *
 *   window.EMAILJS_CONFIG = {
 *     PUBLIC_KEY:        "YOUR_PUBLIC_KEY",
 *     SERVICE_ID:        "YOUR_SERVICE_ID",
 *     WELCOME_TEMPLATE:  "YOUR_WELCOME_TEMPLATE_ID",
 *     ADMIN_TEMPLATE:    "YOUR_ADMIN_TEMPLATE_ID",
 *     ADMIN_EMAIL:       "supportalphafreshman@gmail.com"
 *   };
 */

// ── Load EmailJS SDK from CDN (lightweight, ~10 KB) ──────────────────────────
let _emailjsReady = false;

async function _loadEmailJS() {
    if (_emailjsReady) return true;
    if (window.emailjs) { _emailjsReady = true; return true; }

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.onload = () => {
            const cfg = window.EMAILJS_CONFIG || {};
            if (cfg.PUBLIC_KEY) {
                window.emailjs.init({ publicKey: cfg.PUBLIC_KEY });
            }
            _emailjsReady = true;
            resolve(true);
        };
        script.onerror = () => {
            console.warn('[EmailJS] SDK failed to load.');
            resolve(false);
        };
        document.head.appendChild(script);
    });
}

// ── Config helper ─────────────────────────────────────────────────────────────
function _cfg() {
    return window.EMAILJS_CONFIG || {};
}

function _isConfigured() {
    const c = _cfg();
    const ok = c.PUBLIC_KEY && c.SERVICE_ID && c.WELCOME_TEMPLATE && c.ADMIN_TEMPLATE
        && c.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY';
    if (!ok) console.warn('[EmailJS] Not configured — set window.EMAILJS_CONFIG before use.');
    return ok;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Welcome Email → sent to the newly registered user
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {{ fullName: string, email: string, role: string }} user
 */
async function sendWelcomeEmail(user) {
    try {
        const loaded = await _loadEmailJS();
        if (!loaded || !_isConfigured()) return;

        const c = _cfg();
        const params = {
            to_email:    user.email,
            to_name:     user.fullName,
            user_role:   user.role === 'instructor' ? 'Instructor' : 'Student',
            platform:    'Alpha Freshman Tutorial',
            login_url:   `${window.location.origin}/auth-login.html`,
            courses_url: `${window.location.origin}/courses.html`,
            reg_date:    new Date().toLocaleDateString('en-ET', {
                            year: 'numeric', month: 'long', day: 'numeric',
                            timeZone: 'Africa/Addis_Ababa'
                         }),
            // Subject line — reference this in EmailJS template as {{subject}}
            subject:     'Welcome to Alpha Tutorial - Way to Success 🚀'
        };

        await window.emailjs.send(c.SERVICE_ID, c.WELCOME_TEMPLATE, params);
        console.log('[EmailJS] Welcome email sent to', user.email);
    } catch (err) {
        // Non-blocking — never crash registration flow
        console.warn('[EmailJS] Welcome email failed:', err?.text || err?.message || err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Admin Alert Email → sent to supportalphafreshman@gmail.com
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {{ fullName: string, email: string, role: string }} user
 */
async function sendAdminRegistrationAlert(user) {
    try {
        const loaded = await _loadEmailJS();
        if (!loaded || !_isConfigured()) return;

        const c = _cfg();
        const now = new Date();
        const params = {
            to_email:      c.ADMIN_EMAIL || 'supportalphafreshman@gmail.com',
            admin_email:   c.ADMIN_EMAIL || 'supportalphafreshman@gmail.com',
            user_name:     user.fullName,
            user_email:    user.email,
            user_role:     user.role === 'instructor' ? 'Instructor' : 'Student',
            reg_time:      now.toLocaleString('en-ET', {
                               year: 'numeric', month: 'long', day: 'numeric',
                               hour: '2-digit', minute: '2-digit',
                               timeZone: 'Africa/Addis_Ababa'
                           }) + ' (Addis Ababa)',
            dashboard_url: `${window.location.origin}/admin-dashboard.html`,
            // Subject line — reference this in EmailJS template as {{subject}}
            subject:       '🚨 New User Registration Alert'
        };

        await window.emailjs.send(c.SERVICE_ID, c.ADMIN_TEMPLATE, params);
        console.log('[EmailJS] Admin alert sent to', params.admin_email);
    } catch (err) {
        console.warn('[EmailJS] Admin alert failed:', err?.text || err?.message || err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Combined helper — call both in parallel, fire-and-forget
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Fires both emails asynchronously without blocking the UI.
 * @param {{ fullName: string, email: string, role: string }} user
 */
function sendRegistrationEmails(user) {
    // Parallel, non-blocking
    Promise.all([
        sendWelcomeEmail(user),
        sendAdminRegistrationAlert(user)
    ]).catch(() => {}); // safety net — never throws
}

// Export for use in both vanilla JS and React environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sendWelcomeEmail, sendAdminRegistrationAlert, sendRegistrationEmails };
} else {
    window.emailjsService = { sendWelcomeEmail, sendAdminRegistrationAlert, sendRegistrationEmails };
}
