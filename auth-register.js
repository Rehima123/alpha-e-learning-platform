// ─── Alpha Freshman Tutorial — Registration with Phone OTP ───────────────────
//
// Flow A (Phone — default):
//   Step 1: Name + Phone + Password → Send OTP (Firebase Phone Auth)
//   Step 2: Enter 6-digit SMS code  → Verify OTP
//   Step 3: ✅ Verified → register in backend → redirect to courses
//
// Flow B (Email — tab):
//   Step 1: Name + Email + Password → Register directly → courses

// ── State ─────────────────────────────────────────────────────────────────────
let currentTab          = 'phone';  // 'phone' | 'email'
let confirmationResult  = null;     // Firebase OTP confirmation object
let resendTimer         = null;
let phoneAuthInstance   = null;     // Firebase auth instance (phone)
let recaptchaVerifier   = null;

// ── Password strength meter ───────────────────────────────────────────────────
document.getElementById('password')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const bar = document.getElementById('strengthBar');
    const txt = document.getElementById('strengthText');
    if (!bar || !txt) return;

    let s = 0;
    if (val.length >= 6)           s++;
    if (val.length >= 10)          s++;
    if (/[A-Z]/.test(val))         s++;
    if (/[0-9]/.test(val))         s++;
    if (/[^A-Za-z0-9]/.test(val))  s++;

    const levels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#e74c3c', '#e67e22', '#f39c12', '#2ecc71', '#27ae60'];
    const widths = ['0%', '20%', '40%', '60%', '80%', '100%'];
    bar.style.width      = widths[s];
    bar.style.background = colors[s];
    txt.textContent      = levels[s];
    txt.style.color      = colors[s];
});

// ── Tab switcher ──────────────────────────────────────────────────────────────
function switchTab(tab) {
    currentTab = tab;
    document.getElementById('tabPhone').classList.toggle('active', tab === 'phone');
    document.getElementById('tabEmail').classList.toggle('active', tab === 'email');
    document.getElementById('phoneSection').style.display = tab === 'phone' ? '' : 'none';
    document.getElementById('emailSection').style.display = tab === 'email' ? '' : 'none';

    const btn = document.getElementById('step1Btn');
    btn.textContent = tab === 'phone' ? '📱 Send OTP Code' : '🎓 Create Account';

    // Update required attributes
    const phoneEl = document.getElementById('phoneNumber');
    const emailEl = document.getElementById('email');
    if (tab === 'phone') {
        phoneEl.required = true;
        emailEl.required = false;
    } else {
        phoneEl.required = false;
        emailEl.required = true;
    }

    clearMessages();
}

// ── Step navigation ───────────────────────────────────────────────────────────
function showStep(n) {
    document.querySelectorAll('.register-step').forEach((el, i) => {
        el.classList.toggle('active', i + 1 === n);
    });
    const titles = {
        1: { title: 'Create Account',       sub: 'Start your learning journey today' },
        2: { title: 'Verify Phone Number',  sub: 'OTP code ያስገቡ' },
        3: { title: 'Account Created! 🎉',  sub: '' }
    };
    document.getElementById('stepTitle').textContent    = titles[n].title;
    document.getElementById('stepSubtitle').textContent = titles[n].sub;

    // Update step dots
    for (let i = 1; i <= 3; i++) {
        const dot  = document.getElementById(`dot${i}`);
        dot.className = 'step-dot';
        if (i < n)  dot.classList.add('done');
        if (i === n) dot.classList.add('active');
    }
    for (let i = 1; i <= 2; i++) {
        const line = document.getElementById(`line${i}`);
        line.className = 'step-line' + (i < n ? ' done' : '');
    }
}

function goBackToStep1() {
    confirmationResult = null;
    clearMessages();
    showStep(1);
    // Clear OTP boxes
    document.querySelectorAll('.otp-box').forEach(b => {
        b.value = '';
        b.classList.remove('otp-filled');
    });
}

function clearMessages() {
    document.getElementById('errorMessage').style.display  = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    el.innerHTML       = msg;
    el.style.display   = 'block';
    document.getElementById('successMessage').style.display = 'none';
}

function showSuccess(msg) {
    const el = document.getElementById('successMessage');
    el.innerHTML       = msg;
    el.style.display   = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}

// ── OTP Input UX — auto-advance boxes ─────────────────────────────────────────
document.querySelectorAll('.otp-box').forEach((box, idx, all) => {
    box.addEventListener('input', (e) => {
        // Accept only digits
        box.value = box.value.replace(/\D/g, '').slice(-1);
        box.classList.toggle('otp-filled', box.value !== '');

        // Advance to next
        if (box.value && idx < all.length - 1) {
            all[idx + 1].focus();
        }

        // Enable verify button when all 6 filled
        const filled = [...all].every(b => b.value !== '');
        document.getElementById('verifyOtpBtn').disabled = !filled;
    });

    // Backspace: go to previous box
    box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) {
            all[idx - 1].focus();
        }
    });

    // Paste support — auto-fill all 6 boxes
    box.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData)
            .getData('text').replace(/\D/g, '').slice(0, 6);
        pasted.split('').forEach((char, i) => {
            if (all[i]) {
                all[i].value = char;
                all[i].classList.add('otp-filled');
            }
        });
        if (pasted.length === 6) {
            document.getElementById('verifyOtpBtn').disabled = false;
            all[5].focus();
        }
    });
});

// ── Get full OTP string ───────────────────────────────────────────────────────
function getOTPValue() {
    return [...document.querySelectorAll('.otp-box')].map(b => b.value).join('');
}

// ── Firebase Phone Auth init ──────────────────────────────────────────────────
async function initPhoneAuth() {
    if (phoneAuthInstance) return phoneAuthInstance;

    const cfg = window.FIREBASE_CONFIG;
    if (!cfg || cfg.apiKey === 'YOUR_API_KEY') {
        throw new Error('Firebase not configured. Phone OTP unavailable.');
    }

    const { initializeApp, getApps } =
        await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    const { getAuth, RecaptchaVerifier } =
        await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

    const existing = getApps().find(a => a.name === 'phone-auth-app');
    const app      = existing || initializeApp(cfg, 'phone-auth-app');
    phoneAuthInstance = getAuth(app);

    // Invisible reCAPTCHA — required by Firebase Phone Auth
    if (!recaptchaVerifier) {
        recaptchaVerifier = new RecaptchaVerifier(phoneAuthInstance, 'recaptcha-container', {
            size:     'invisible',
            callback: () => {},
            'expired-callback': () => {
                // reCAPTCHA expired — clear so it re-renders next time
                recaptchaVerifier = null;
            }
        });
        try {
            await recaptchaVerifier.render();
        } catch (renderErr) {
            console.warn('[reCAPTCHA] render failed:', renderErr.message);
            recaptchaVerifier = null;
        }
    }

    return phoneAuthInstance;
}

// ── STEP 1 SUBMIT ─────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const fullName        = document.getElementById('fullName').value.trim();
    const password        = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role            = document.getElementById('role')?.value || 'student';
    const submitBtn       = document.getElementById('step1Btn');

    // ── Validate common fields ────────────────────────────────────────────────
    if (!fullName) { showError('ሙሉ ስምዎን ያስገቡ።'); return; }
    if (password !== confirmPassword) { showError('Passwords do not match.'); return; }
    if (password.length < 6) { showError('Password ቢያንስ 6 ቁምፊ ያስፈልጋል።'); return; }

    submitBtn.disabled    = true;
    submitBtn.textContent = '⏳ Please wait...';

    // ════════════════════════════════════════════════════════════════════════
    // PATH A — Phone OTP
    // ════════════════════════════════════════════════════════════════════════
    if (currentTab === 'phone') {
        const rawPhone = document.getElementById('phoneNumber').value.trim();

        if (!rawPhone || rawPhone.length < 9) {
            showError('ትክክለኛ ስልክ ቁጥር ያስፈልጋል (9 ቁጥር).');
            submitBtn.disabled    = false;
            submitBtn.textContent = '📱 Send OTP Code';
            return;
        }

        // Normalize: strip leading 0 if present, prepend +251
        const normalized = '+251' + rawPhone.replace(/^0/, '');

        // Store for later use in backend registration
        const university = typeof getSelectedUniversity === 'function' ? getSelectedUniversity() : '';
        const stream     = typeof getSelectedStream     === 'function' ? getSelectedStream()     : '';
        window._pendingReg = { fullName, phoneNumber: normalized, password, role, university, stream };

        try {
            const auth = await initPhoneAuth();
            const { signInWithPhoneNumber } =
                await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

            confirmationResult = await signInWithPhoneNumber(auth, normalized, recaptchaVerifier);

            // Show OTP step
            document.getElementById('otpSentTo').textContent = normalized;
            showStep(2);
            startResendTimer(60);

            // Focus first OTP box
            setTimeout(() => document.querySelector('.otp-box')?.focus(), 300);

        } catch (err) {
            const msgs = {
                'auth/invalid-phone-number':   'ስልክ ቁጥሩ ትክክል አይደለም። +251 format ያስፈልጋል።',
                'auth/too-many-requests':      'ብዙ ጊዜ ሞክረዋል። ትንሽ ቆይተው ይሞክሩ።',
                'auth/quota-exceeded':         'SMS quota exceeded. ቆይተው ይሞክሩ።',
                'auth/captcha-check-failed':   'reCAPTCHA failed. Page ን refresh አድርጉ።',
                'auth/network-request-failed': 'ኢንተርኔት ችግር አለ። ይፈትሹ።',
                'auth/missing-phone-number':   'ስልክ ቁጥር ያስፈልጋል።',
                'auth/app-not-authorized':     'Firebase ላይ Phone Auth enabled አልሆነም። Console ይፈትሹ።'
            };
            // "Firebase not configured" — show friendly message
            if (err.message?.includes('Firebase not configured')) {
                showError('⚠️ Phone OTP አሁን አይሰራም። ✉️ Email tab ይጠቀሙ።');
            } else if (err.code === 'auth/operation-not-allowed') {
                // Firebase Phone Auth not enabled in console — switch to email tab
                showError('📵 Phone OTP አሁን አይሰራም። <strong>✉️ Email tab</strong> ይጠቀሙ።');
                // Auto-switch to email tab after 2 seconds
                setTimeout(() => switchTab('email'), 2000);
            } else if (err.code) {
                showError(msgs[err.code] || ('OTP መላክ አልተሳካም: ' + err.message));
            } else {
                showError('OTP መላክ አልተሳካም። ✉️ Email tab ይጠቀሙ።');
            }
            // Reset reCAPTCHA on error
            if (recaptchaVerifier) {
                try { recaptchaVerifier.clear(); } catch {}
                recaptchaVerifier = null;
            }
        } finally {
            submitBtn.disabled    = false;
            submitBtn.textContent = '📱 Send OTP Code';
        }
        return;
    }

    // ════════════════════════════════════════════════════════════════════════
    // PATH B — Email (direct registration, no OTP)
    // ════════════════════════════════════════════════════════════════════════
    const email = document.getElementById('email').value.trim();
    if (!email) {
        showError('ኢሜይልዎን ያስገቡ።');
        submitBtn.disabled    = false;
        submitBtn.textContent = '🎓 Create Account';
        return;
    }

    try {
        const response = await api.register({
            fullName, email, password, role,
            university: typeof getSelectedUniversity === 'function' ? getSelectedUniversity() : '',
            stream:     typeof getSelectedStream     === 'function' ? getSelectedStream()     : '',
            educationLevel: document.getElementById('university')?.value || ''
        });
        if (response.success) {
            api.setAuthToken(response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));

            window.emailjsService?.sendRegistrationEmails({
                fullName: response.user.fullName,
                email:    response.user.email,
                role:     response.user.role
            });

            document.getElementById('welcomeName').textContent = response.user.fullName;
            showStep(3);
            setTimeout(() => {
                window.location.href = response.user.role === 'instructor'
                    ? 'instructor-dashboard.html' : 'courses.html';
            }, 1800);
        } else {
            // Surface the actual backend error message
            showError(response.message || 'ምዝገባ አልተሳካም። ደግሞ ይሞክሩ።');
        }
    } catch (err) {
        // Network error — server may be sleeping (cold start), retry once
        if (err.message?.includes('API request failed') || err.message?.includes('fetch')) {
            showError('⏳ Server እየተነሳ ነው... ደቂቃ ቆይተው ደግሞ ይሞክሩ።');
        } else {
            showError(err.message || 'ምዝገባ አልተሳካም።');
        }
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = '🎓 Create Account';
    }
});

// ── STEP 2 — Verify OTP ───────────────────────────────────────────────────────
async function verifyOTP() {
    const otpCode  = getOTPValue();
    const btn      = document.getElementById('verifyOtpBtn');

    if (otpCode.length !== 6) { showError('6-digit OTP ያስፈልጋል።'); return; }
    if (!confirmationResult)  { showError('OTP session ጠፍቷል። ተመልሰው ይሞክሩ።'); return; }

    clearMessages();
    btn.disabled    = true;
    btn.textContent = '⏳ Verifying...';

    try {
        // 1️⃣ Verify OTP with Firebase
        const result      = await confirmationResult.confirm(otpCode);
        const firebaseUser = result.user;

        // 2️⃣ Register in backend with phone number
        const { fullName, phoneNumber, password, role } = window._pendingReg;
        const response = await api.register({ fullName, phoneNumber, password, role });

        if (!response.success) {
            // User might already exist — try login
            if (response.message?.includes('already exists')) {
                const loginRes = await api.login({ phoneNumber, password });
                if (loginRes.success) {
                    api.setAuthToken(loginRes.token);
                    localStorage.setItem('currentUser', JSON.stringify(loginRes.user));
                    document.getElementById('welcomeName').textContent = loginRes.user.fullName;
                    showStep(3);
                    stopResendTimer();
                    setTimeout(() => {
                        window.location.href = loginRes.user.role === 'instructor'
                            ? 'instructor-dashboard.html' : 'courses.html';
                    }, 1800);
                    return;
                }
            }
            throw new Error(response.message || 'Registration failed after OTP');
        }

        // 3️⃣ Store credentials
        api.setAuthToken(response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));

        // 4️⃣ Send welcome email (non-blocking) — no email to send for phone-only users
        window.emailjsService?.sendRegistrationEmails({
            fullName: response.user.fullName,
            email:    response.user.email || '',
            role:     response.user.role
        });

        // 5️⃣ Show success
        document.getElementById('welcomeName').textContent = response.user.fullName;
        stopResendTimer();
        showStep(3);
        setTimeout(() => {
            window.location.href = response.user.role === 'instructor'
                ? 'instructor-dashboard.html' : 'courses.html';
        }, 1800);

    } catch (err) {
        const msgs = {
            'auth/invalid-verification-code': 'OTP ስህተት ነው። ደግመው ይሞክሩ።',
            'auth/code-expired':              'OTP ጊዜው አልፏል። ዳግም ይላኩ።',
            'auth/too-many-requests':         'ብዙ ጊዜ ሞክረዋል። ቆይተው ይሞክሩ።'
        };
        showError(msgs[err.code] || ('OTP verification failed: ' + err.message));
        btn.disabled    = false;
        btn.textContent = '✅ Verify & Create Account';
    }
}

// ── Resend OTP timer ──────────────────────────────────────────────────────────
function startResendTimer(seconds) {
    const btn      = document.getElementById('resendBtn');
    const countdown = document.getElementById('resendCountdown');
    btn.disabled   = true;
    let remaining  = seconds;

    countdown.textContent = remaining;
    resendTimer = setInterval(() => {
        remaining--;
        countdown.textContent = remaining;
        if (remaining <= 0) {
            clearInterval(resendTimer);
            btn.disabled      = false;
            btn.textContent   = 'Resend OTP';
            btn.innerHTML     = 'Resend OTP';
        } else {
            btn.innerHTML = `⏳ Resend in <span id="resendCountdown">${remaining}</span>s`;
        }
    }, 1000);
}

function stopResendTimer() {
    if (resendTimer) { clearInterval(resendTimer); resendTimer = null; }
}

async function resendOTP() {
    clearMessages();
    const btn = document.getElementById('resendBtn');
    btn.disabled = true;

    const { phoneNumber } = window._pendingReg || {};
    if (!phoneNumber) { goBackToStep1(); return; }

    try {
        // Reset reCAPTCHA before resend
        if (recaptchaVerifier) {
            try { recaptchaVerifier.clear(); } catch {}
            recaptchaVerifier = null;
        }

        const auth = await initPhoneAuth();
        const { signInWithPhoneNumber, RecaptchaVerifier } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        // Re-init reCAPTCHA
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible', callback: () => {}
        });
        await recaptchaVerifier.render();

        confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        showSuccess(`✅ OTP ወደ ${phoneNumber} ዳግም ተልኳል!`);
        startResendTimer(60);

        // Clear boxes and focus first
        document.querySelectorAll('.otp-box').forEach(b => {
            b.value = '';
            b.classList.remove('otp-filled');
        });
        document.getElementById('verifyOtpBtn').disabled = true;
        setTimeout(() => document.querySelector('.otp-box')?.focus(), 200);

    } catch (err) {
        showError('OTP ዳግም መላክ አልተሳካም: ' + err.message);
        btn.disabled = false;
    }
}

// ── Google Sign-Up ────────────────────────────────────────────────────────────
document.getElementById('googleSignupBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('googleSignupBtn');
    btn.disabled     = true;
    btn.textContent  = '⏳ Connecting to Google...';
    clearMessages();

    try {
        const cfg = window.FIREBASE_CONFIG;
        if (!cfg || cfg.apiKey === 'YOUR_API_KEY') {
            showError('Google login is not configured yet.');
            return;
        }

        const { initializeApp, getApps } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getAuth, signInWithPopup, GoogleAuthProvider } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        const existing = getApps().find(a => a.name === 'google-register');
        const app      = existing || initializeApp(cfg, 'google-register');
        const auth     = getAuth(app);
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');

        const result         = await signInWithPopup(auth, provider);
        const user           = result.user;
        const googleFullName = user.displayName || user.email.split('@')[0];
        const googleEmail    = user.email;
        const googlePassword = 'google-oauth-' + user.uid;

        // Try register first, fallback to login if already exists
        let backendRes = await api.register({
            fullName: googleFullName,
            email:    googleEmail,
            password: googlePassword,
            role:     'student'
        });
        let isNewUser = backendRes?.success;

        if (!isNewUser) {
            backendRes = await api.login({ email: googleEmail, password: googlePassword });
        }

        if (backendRes?.success) {
            api.setAuthToken(backendRes.token);
            localStorage.setItem('currentUser', JSON.stringify(backendRes.user));

            if (isNewUser && window.emailjsService && window.EMAILJS_CONFIG?.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
                window.emailjsService.sendRegistrationEmails({
                    fullName: backendRes.user.fullName,
                    email:    backendRes.user.email,
                    role:     backendRes.user.role
                });
            }

            document.getElementById('welcomeName').textContent = backendRes.user.fullName;
            showStep(3);
            setTimeout(() => window.location.href = 'courses.html', 1800);
            return;
        }

        // Pure Firebase fallback
        const fbUser = { id: user.uid, fullName: googleFullName, email: googleEmail, role: 'student', avatar: user.photoURL };
        api.setAuthToken('firebase-' + user.uid);
        localStorage.setItem('currentUser', JSON.stringify(fbUser));
        window.location.href = 'courses.html';

    } catch (err) {
        const msgs = {
            'auth/popup-closed-by-user':    'Google sign-up cancelled.',
            'auth/popup-blocked':           'Popup blocked. Please allow popups for this site.',
            'auth/cancelled-popup-request': 'Google sign-up cancelled.'
        };
        showError(msgs[err.code] || 'Google sign-up failed: ' + err.message);
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '🔍 Sign up with Google';
    }
});

// ── Init: check Firebase Phone Auth availability, default to best tab ─────────
(async function initDefaultTab() {
    try {
        const cfg = window.FIREBASE_CONFIG;
        if (!cfg || cfg.apiKey === 'YOUR_API_KEY') {
            // No Firebase — default to email
            switchTab('email');
            return;
        }
        // Default to phone (Firebase is configured — user must enable Phone in Console)
        switchTab('phone');
    } catch {
        switchTab('email');
    }
})();
