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

            // Check email verification
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

            // Email verified — also login to backend
            try {
                const backendRes = await api.login({ email, password });
                if (backendRes.success) {
                    api.setAuthToken(backendRes.token);
                    localStorage.setItem('currentUser', JSON.stringify(backendRes.user));
                    redirectByRole(backendRes.user);
                    return;
                }
            } catch (_) {}

            // Firebase-only user (no backend)
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
