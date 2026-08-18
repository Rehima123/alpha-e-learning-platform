// ─── Firebase Auth Login + Email Verification Check ──────────────────────────

let firebaseAuthLogin = null;

async function initFirebaseLogin() {
    try {
        const cfg = window.FIREBASE_CONFIG;
        if (!cfg || cfg.apiKey === 'YOUR_API_KEY') return null;

        const { initializeApp }   = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getAuth, signInWithEmailAndPassword, signOut, sendEmailVerification } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        if (!firebaseAuthLogin) {
            const app = initializeApp(cfg, 'login-app');
            firebaseAuthLogin = getAuth(app);
        }
        return { firebaseAuthLogin, signInWithEmailAndPassword, signOut, sendEmailVerification };
    } catch (e) {
        return null;
    }
}

// ── Login form ────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    errorDiv.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        // Try Firebase first (if configured)
        const fb = await initFirebaseLogin();
        if (fb) {
            const { firebaseAuthLogin, signInWithEmailAndPassword, signOut, sendEmailVerification } = fb;
            const userCredential = await signInWithEmailAndPassword(firebaseAuthLogin, email, password);
            const user = userCredential.user;

            // Try backend login first — if backend accepts the credentials, let the user in
            // regardless of Firebase email verification status
            try {
                const backendRes = await api.login({ email, password });
                if (backendRes.success) {
                    api.setAuthToken(backendRes.token);
                    localStorage.setItem('currentUser', JSON.stringify(backendRes.user));
                    redirectByRole(backendRes.user);
                    return;
                }
            } catch (_) {}

            // Backend failed — check Firebase email verification as a secondary gate
            if (!user.emailVerified) {
                await signOut(firebaseAuthLogin);

                // Show resend option
                errorDiv.innerHTML = `
                    <div>
                        አካውንትዎ ገና አልተረጋገጠም።<br>
                        <small style="opacity:0.85">ወደ <strong>${email}</strong> ማረጋገጫ ኢሜይል ይላካሉ።</small><br>
                        <button onclick="resendVerification('${email}','${password}')"
                            style="margin-top:8px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);
                            color:inherit;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.82rem">
                            📧 ድጋሚ ማረጋገጫ ኢሜይል ላክ
                        </button>
                    </div>`;
                errorDiv.style.display = 'block';
                return;
            }

            // Firebase verified, use Firebase user as fallback
            const fbUser = {
                id: user.uid, fullName: user.displayName || email.split('@')[0],
                email: user.email, role: 'student'
            };
            localStorage.setItem('currentUser', JSON.stringify(fbUser));
            api.setAuthToken('firebase-' + user.uid);
            redirectByRole(fbUser);
            return;
        }

        // Fallback: backend-only login
        const response = await api.login({ email, password });
        if (response.success) {
            api.setAuthToken(response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            redirectByRole(response.user);
        } else {
            errorDiv.textContent = response.message || 'Login failed';
            errorDiv.style.display = 'block';
        }

    } catch (error) {
        const fbErrors = {
            'auth/user-not-found':     'ይህ ኢሜይል አልተመዘገበም።',
            'auth/wrong-password':     'የይለፍ ቃሉ ስህተት ነው።',
            'auth/invalid-email':      'ትክክለኛ ኢሜይል ያስፈልጋል።',
            'auth/too-many-requests':  'ብዙ ጊዜ ሞክረዋል። ትንሽ ቆይተው ይሞክሩ።',
            'auth/invalid-credential': 'ኢሜይሉ ወይም የይለፍ ቃሉ ስህተት ነው።'
        };
        errorDiv.textContent = fbErrors[error.code] || error.message || 'Login failed.';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
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

async function resendVerification(email, password) {
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
    btn.disabled = true;
    btn.textContent = '⏳ Connecting to Google...';

    try {
        const cfg = window.FIREBASE_CONFIG;
        if (!cfg || cfg.apiKey === 'YOUR_API_KEY') {
            alert('Google login is not configured yet.');
            return;
        }

        const { initializeApp }   = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getAuth, signInWithPopup, GoogleAuthProvider } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        let app;
        try { app = initializeApp(cfg, 'google-login'); }
        catch { app = (await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js")).getApp('google-login'); }

        const auth     = getAuth(app);
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');

        const result = await signInWithPopup(auth, provider);
        const user   = result.user;

        // Register/login in backend
        try {
            // Try login first
            let backendRes = await api.login({ email: user.email, password: 'google-oauth-' + user.uid });
            if (!backendRes.success) {
                // New user — auto-register
                backendRes = await api.register({
                    fullName: user.displayName || user.email.split('@')[0],
                    email:    user.email,
                    password: 'google-oauth-' + user.uid,
                    role:     'student'
                });
            }
            if (backendRes.success) {
                api.setAuthToken(backendRes.token);
                localStorage.setItem('currentUser', JSON.stringify(backendRes.user));
                redirectByRole(backendRes.user);
                return;
            }
        } catch (_) {}

        // Fallback: use Firebase user
        const fbUser = {
            id: user.uid,
            fullName: user.displayName || user.email.split('@')[0],
            email: user.email,
            role: 'student',
            avatar: user.photoURL
        };
        api.setAuthToken('firebase-' + user.uid);
        localStorage.setItem('currentUser', JSON.stringify(fbUser));
        window.location.href = 'courses.html';

    } catch (error) {
        const msg = {
            'auth/popup-closed-by-user': 'Google login cancelled.',
            'auth/popup-blocked':        'Popup was blocked. Please allow popups for this site.',
            'auth/cancelled-popup-request': 'Google login cancelled.'
        };
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = msg[error.code] || 'Google login failed: ' + error.message;
            errorDiv.style.display = 'block';
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔍 Continue with Google';
    }
});
