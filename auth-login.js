// ─── Firebase Auth Login + Email Verification Check ──────────────────────────

let firebaseAuthLogin = null;

async function initFirebaseLogin() {
    try {
        const cfg = window.FIREBASE_CONFIG;
        if (!cfg || cfg.apiKey === 'YOUR_API_KEY') return null;

        const { initializeApp, getApps } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getAuth, signInWithEmailAndPassword, signOut, sendEmailVerification } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        if (!firebaseAuthLogin) {
            const existing = getApps().find(a => a.name === 'login-app');
            const app = existing || initializeApp(cfg, 'login-app');
            firebaseAuthLogin = getAuth(app);
        }
        return { firebaseAuthLogin, signInWithEmailAndPassword, signOut, sendEmailVerification };
    } catch (e) {
        return null;
    }
}

// ── Helper: is identifier an email? ──────────────────────────────────────────
function isEmail(identifier) {
    return identifier.includes('@');
}

// ── Helper: show/hide messages ────────────────────────────────────────────────
function showError(msg) {
    const el = document.getElementById('errorMessage');
    if (!el) return;
    el.innerHTML = msg;
    el.style.display = 'block';
    document.getElementById('successMessage').style.display = 'none';
}
function showSuccess(msg) {
    const el = document.getElementById('successMessage');
    if (!el) return;
    el.innerHTML = msg;
    el.style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
}
function clearMessages() {
    document.getElementById('errorMessage').style.display  = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// ── Login form ────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const identifier = document.getElementById('email').value.trim();
    const password   = document.getElementById('password').value;
    const submitBtn  = document.getElementById('loginBtn');

    if (!identifier || !password) {
        showError('Email/phone number እና password ያስፈልጋሉ።');
        return;
    }

    clearMessages();
    submitBtn.disabled    = true;
    submitBtn.textContent = '⏳ Logging in...';

    try {
        // ── Path A: Email login (try Firebase first, then backend) ────────────
        if (isEmail(identifier)) {
            const fb = await initFirebaseLogin();

            if (fb) {
                try {
                    const { firebaseAuthLogin, signInWithEmailAndPassword, signOut } = fb;
                    const userCredential = await signInWithEmailAndPassword(firebaseAuthLogin, identifier, password);
                    const firebaseUser   = userCredential.user;

                    // Always try backend login too (gets role/subscription data)
                    try {
                        const backendRes = await api.login({ email: identifier, password });
                        if (backendRes.success) {
                            api.setAuthToken(backendRes.token);
                            localStorage.setItem('currentUser', JSON.stringify(backendRes.user));
                            showSuccess('✅ Login successful! Redirecting...');
                            setTimeout(() => redirectByRole(backendRes.user), 600);
                            return;
                        }
                    } catch (_) {}

                    // Backend failed — check email verification
                    if (!firebaseUser.emailVerified) {
                        await signOut(firebaseAuthLogin);
                        showError(`
                            አካውንትዎ ገና አልተረጋገጠም።<br>
                            <small>ወደ <strong>${identifier}</strong> ማረጋገጫ ኢሜይል ይፈልጉ።</small><br>
                            <button onclick="resendVerification('${identifier}','${encodeURIComponent(password)}')"
                                style="margin-top:8px;background:#e74c3c;border:none;color:white;
                                padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.82rem">
                                📧 ድጋሚ ማረጋገጫ ኢሜይል ላክ
                            </button>`);
                        return;
                    }

                    // Firebase verified — use as fallback
                    const fbUser = {
                        id: firebaseUser.uid,
                        fullName: firebaseUser.displayName || identifier.split('@')[0],
                        email: firebaseUser.email,
                        role: 'student'
                    };
                    localStorage.setItem('currentUser', JSON.stringify(fbUser));
                    api.setAuthToken('firebase-' + firebaseUser.uid);
                    showSuccess('✅ Login successful! Redirecting...');
                    setTimeout(() => redirectByRole(fbUser), 600);
                    return;

                } catch (firebaseErr) {
                    if (firebaseErr.code === 'auth/network-request-failed') {
                        // Firebase unreachable — fall through to backend-only
                    } else if (firebaseErr.code === 'auth/too-many-requests') {
                        let secs = 60;
                        showError(`⚠️ ብዙ ጊዜ ሞክረዋል። እባክዎ <span id="countdown">${secs}</span> ሰከንድ ይጠብቁ።`);
                        submitBtn.disabled = true;
                        const timer = setInterval(() => {
                            secs--;
                            const el = document.getElementById('countdown');
                            if (el) el.textContent = secs;
                            if (secs <= 0) { clearInterval(timer); submitBtn.disabled = false; clearMessages(); }
                        }, 1000);
                        return;
                    } else {
                        const fbErrors = {
                            'auth/user-not-found':     'ይህ ኢሜይል አልተመዘገበም።',
                            'auth/wrong-password':     'የይለፍ ቃሉ ስህተት ነው።',
                            'auth/invalid-email':      'ትክክለኛ ኢሜይል ያስፈልጋል።',
                            'auth/invalid-credential': 'ኢሜይሉ ወይም የይለፍ ቃሉ ስህተት ነው።',
                        };
                        // Don't show Firebase error yet — try backend first
                        if (!['auth/user-not-found','auth/wrong-password','auth/invalid-credential'].includes(firebaseErr.code)) {
                            showError(fbErrors[firebaseErr.code] || firebaseErr.message);
                            return;
                        }
                        // Fall through to backend
                    }
                }
            }

            // ── Backend-only email login ──────────────────────────────────────
            const response = await api.login({ email: identifier, password });
            if (response.success) {
                api.setAuthToken(response.token);
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                showSuccess('✅ Login successful! Redirecting...');
                setTimeout(() => redirectByRole(response.user), 600);
            } else {
                showError(response.message || 'ኢሜይሉ ወይም የይለፍ ቃሉ ስህተት ነው።');
            }

        } else {
            // ── Path B: Phone number login (backend only — no Firebase) ──────
            const response = await api.login({ phoneNumber: identifier, password });
            if (response.success) {
                api.setAuthToken(response.token);
                localStorage.setItem('currentUser', JSON.stringify(response.user));
                showSuccess('✅ Login successful! Redirecting...');
                setTimeout(() => redirectByRole(response.user), 600);
            } else {
                showError(response.message || 'Phone number ወይም password ስህተት ነው።');
            }
        }

    } catch (error) {
        showError(error.message || 'Login failed. Please try again.');
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = '🔐 Login';
    }
});

function redirectByRole(user) {
    const adminRoles = ['admin','super_admin','content_admin','finance_admin','support_admin'];
    if (adminRoles.includes(user.role)) {
        window.location.href = 'admin-dashboard.html';
    } else if (user.role === 'instructor') {
        window.location.href = 'instructor-dashboard.html';
    } else {
        window.location.href = 'courses.html';
    }
}

// ── Forgot Password ───────────────────────────────────────────────────────────
document.getElementById('forgotPwdLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('email').value.trim();
    if (!identifier || !isEmail(identifier)) {
        showError('Password reset ለማድረግ email address ይጻፉ።');
        return;
    }
    try {
        const res = await api.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: identifier })
        });
        if (res.success) {
            showSuccess(`✅ Password reset link ወደ ${identifier} ተልኳል።`);
        } else {
            showError(res.message || 'Password reset failed.');
        }
    } catch {
        showError('Password reset request failed. Please try again.');
    }
});

async function resendVerification(email, passwordEncoded) {
    const password = decodeURIComponent(passwordEncoded);
    try {
        const fb = await initFirebaseLogin();
        if (!fb) { alert('Firebase not configured'); return; }
        const { firebaseAuthLogin, signInWithEmailAndPassword, sendEmailVerification, signOut } = fb;
        const uc = await signInWithEmailAndPassword(firebaseAuthLogin, email, password);
        await sendEmailVerification(uc.user);
        await signOut(firebaseAuthLogin);
        alert('✅ ማረጋገጫ ኢሜይል ድጋሚ ተልኳል! ወደ ' + email + ' ይፈልጉ።');
    } catch (e) {
        alert('ስህተት: ' + e.message);
    }
}

// ── Google Sign-In ────────────────────────────────────────────────────────────
document.querySelector('.btn-google')?.addEventListener('click', async () => {
    const btn = document.querySelector('.btn-google');
    btn.disabled     = true;
    btn.textContent  = '⏳ Connecting to Google...';

    try {
        const cfg = window.FIREBASE_CONFIG;
        if (!cfg || cfg.apiKey === 'YOUR_API_KEY') {
            alert('Google login is not configured yet.');
            return;
        }

        const { initializeApp, getApps, getApp } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getAuth, signInWithPopup, GoogleAuthProvider } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        const existing = getApps().find(a => a.name === 'google-login');
        const app      = existing || initializeApp(cfg, 'google-login');

        const auth     = getAuth(app);
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');

        const result = await signInWithPopup(auth, provider);
        const user   = result.user;

        const gFullName = user.displayName || user.email.split('@')[0];
        const gEmail    = user.email;
        const gPassword = 'google-oauth-' + user.uid;

        // Try backend login first, then register if new user
        let backendRes  = await api.login({ email: gEmail, password: gPassword });
        let isNewUser   = false;

        if (!backendRes.success) {
            backendRes = await api.register({
                fullName: gFullName,
                email:    gEmail,
                password: gPassword,
                role:     'student'
            });
            if (backendRes.success) isNewUser = true;
        }

        if (backendRes.success) {
            api.setAuthToken(backendRes.token);
            localStorage.setItem('currentUser', JSON.stringify(backendRes.user));

            // Optional EmailJS (only if configured)
            if (isNewUser && window.emailjsService && window.EMAILJS_CONFIG?.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
                window.emailjsService.sendRegistrationEmails({
                    fullName: backendRes.user.fullName,
                    email:    backendRes.user.email,
                    role:     backendRes.user.role
                });
            }

            redirectByRole(backendRes.user);
            return;
        }

        // Backend unavailable — use Firebase user directly as fallback
        const fbUser = {
            id:            user.uid,
            fullName:      gFullName,
            email:         gEmail,
            role:          'student',
            avatar:        user.photoURL,
            emailVerified: true
        };
        api.setAuthToken('firebase-' + user.uid);
        localStorage.setItem('currentUser', JSON.stringify(fbUser));
        localStorage.setItem('authToken',   'firebase-' + user.uid);
        redirectByRole(fbUser);

    } catch (error) {
        const msg = {
            'auth/popup-closed-by-user':    'Google login cancelled.',
            'auth/popup-blocked':           'Popup was blocked. Please allow popups for this site.',
            'auth/cancelled-popup-request': 'Google login cancelled.',
            'auth/unauthorized-domain':     'ይህ domain Firebase ላይ authorized አልሆነም። Firebase Console → Authentication → Settings → Authorized domains ይፈትሹ።',
            'auth/operation-not-allowed':   'Google Sign-In Firebase Console ላይ enabled አልሆነም።',
            'auth/network-request-failed':  'የኔትወርክ ስህተት። Internet connection ይፈትሹ።'
        };
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent   = msg[error.code] || 'Google login failed: ' + error.message;
            errorDiv.style.display = 'block';
        }
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '🔍 Continue with Google';
    }
});
