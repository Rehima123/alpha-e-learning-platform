// ─── Firebase Auth Login + Email Verification Check ──────────────────────────

let firebaseAuthLogin = null;

async function initFirebaseLogin() {
    try {
        const cfg = window.FIREBASE_CONFIG;
        if (!cfg || cfg.apiKey === 'YOUR_API_KEY') return null;

        const { initializeApp, getApps, getApp } =
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

// ── Login form ────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email     = document.getElementById('email').value.trim();
    const password  = document.getElementById('password').value;
    const errorDiv  = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    errorDiv.style.display = 'none';
    submitBtn.disabled     = true;
    submitBtn.textContent  = 'Logging in...';

    try {
        // Try Firebase first (if configured)
        const fb = await initFirebaseLogin();
        if (fb) {
            try {
                const { firebaseAuthLogin, signInWithEmailAndPassword, signOut, sendEmailVerification } = fb;
                const userCredential = await signInWithEmailAndPassword(firebaseAuthLogin, email, password);
                const firebaseUser   = userCredential.user;

                // Try backend login first
                try {
                    const backendRes = await api.login({ email, password });
                    if (backendRes.success) {
                        api.setAuthToken(backendRes.token);
                        localStorage.setItem('currentUser', JSON.stringify(backendRes.user));
                        redirectByRole(backendRes.user);
                        return;
                    }
                } catch (_) {}

                // Backend failed — check Firebase email verification
                if (!firebaseUser.emailVerified) {
                    await signOut(firebaseAuthLogin);
                    errorDiv.innerHTML = `
                        <div>
                            አካውንትዎ ገና አልተረጋገጠም።<br>
                            <small style="opacity:0.85">ወደ <strong>${email}</strong> ማረጋገጫ ኢሜይል ይላካሉ።</small><br>
                            <button onclick="resendVerification('${email}','${encodeURIComponent(password)}')"
                                style="margin-top:8px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);
                                color:inherit;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.82rem">
                                📧 ድጋሚ ማረጋገጫ ኢሜይል ላክ
                            </button>
                        </div>`;
                    errorDiv.style.display = 'block';
                    return;
                }

                // Firebase verified — use Firebase user as fallback
                const fbUser = {
                    id: firebaseUser.uid,
                    fullName: firebaseUser.displayName || email.split('@')[0],
                    email: firebaseUser.email,
                    role: 'student'
                };
                localStorage.setItem('currentUser', JSON.stringify(fbUser));
                api.setAuthToken('firebase-' + firebaseUser.uid);
                redirectByRole(fbUser);
                return;

            } catch (firebaseErr) {
                // Firebase network error — fall through to backend-only login
                if (firebaseErr.code === 'auth/network-request-failed') {
                    console.warn('Firebase unreachable, trying backend only...');
                    // Fall through below
                } else {
                    throw firebaseErr;
                }
            }
        }

        // Fallback: backend-only login
        const response = await api.login({ email, password });
        if (response.success) {
            api.setAuthToken(response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            redirectByRole(response.user);
        } else {
            errorDiv.textContent   = response.message || 'Login failed';
            errorDiv.style.display = 'block';
        }

    } catch (error) {
        const fbErrors = {
            'auth/user-not-found':        'ይህ ኢሜይል አልተመዘገበም።',
            'auth/wrong-password':        'የይለፍ ቃሉ ስህተት ነው።',
            'auth/invalid-email':         'ትክክለኛ ኢሜይል ያስፈልጋል።',
            'auth/invalid-credential':    'ኢሜይሉ ወይም የይለፍ ቃሉ ስህተት ነው።',
            'auth/network-request-failed':'የኔትወርክ ስህተት። Backend ን እየሞክር ነው...'
        };

        if (error.code === 'auth/too-many-requests') {
            let secs = 60;
            errorDiv.innerHTML = `⚠️ ብዙ ጊዜ ሞክረዋል። እባክዎ <span id="countdown">${secs}</span> ሰከንድ ይጠብቁ።`;
            errorDiv.style.display = 'block';
            submitBtn.disabled = true;
            const timer = setInterval(() => {
                secs--;
                const el = document.getElementById('countdown');
                if (el) el.textContent = secs;
                if (secs <= 0) {
                    clearInterval(timer);
                    errorDiv.style.display = 'none';
                    submitBtn.disabled = false;
                }
            }, 1000);
            return;
        }

        errorDiv.textContent   = fbErrors[error.code] || error.message || 'Login failed.';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Sign In';
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
