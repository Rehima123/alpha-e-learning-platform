// ─── Firebase Auth Registration ───────────────────────────────────────────────
// Uses Firebase for email verification, falls back to backend-only if no Firebase

// ── Password strength ─────────────────────────────────────────────────────────
document.getElementById('password')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const bar = document.getElementById('strengthBar');
    const txt = document.getElementById('strengthText');
    if (!bar || !txt) return;

    let strength = 0;
    if (val.length >= 6)  strength++;
    if (val.length >= 10) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    const levels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#e74c3c', '#e67e22', '#f39c12', '#2ecc71', '#27ae60'];
    const widths = ['0%', '20%', '40%', '60%', '80%', '100%'];

    bar.style.width = widths[strength];
    bar.style.background = colors[strength];
    txt.textContent = levels[strength];
    txt.style.color = colors[strength];
});

// ── Firebase (loaded from CDN if config is set) ───────────────────────────────
let firebaseAuth = null;

async function initFirebase() {
    try {
        // Only load Firebase if config exists
        const cfg = window.FIREBASE_CONFIG;
        if (!cfg || cfg.apiKey === 'YOUR_API_KEY') return null;

        const { initializeApp }             = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getAuth, createUserWithEmailAndPassword, sendEmailVerification } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        const app = initializeApp(cfg);
        firebaseAuth = getAuth(app);
        return { firebaseAuth, createUserWithEmailAndPassword, sendEmailVerification };
    } catch (e) {
        console.warn('Firebase not configured:', e.message);
        return null;
    }
}

// ── Register form ─────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName        = document.getElementById('fullName').value.trim();
    const email           = document.getElementById('email').value.trim();
    const password        = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role            = document.getElementById('role')?.value || 'student';
    const errorDiv        = document.getElementById('errorMessage');
    const successDiv      = document.getElementById('successMessage');
    const submitBtn       = e.target.querySelector('button[type="submit"]');

    errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block'; return;
    }
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'block'; return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        // Try Firebase first (if configured)
        const fb = await initFirebase();
        if (fb) {
            const { firebaseAuth, createUserWithEmailAndPassword, sendEmailVerification } = fb;
            const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
            const user = userCredential.user;

            // Send verification email
            await sendEmailVerification(user);

            // Also register in backend (non-blocking)
            api.register({ fullName, email, password, role }).catch(() => {});

            // Send EmailJS notifications (welcome + admin alert) — non-blocking
            window.emailjsService?.sendRegistrationEmails({ fullName, email, role });

            // Show success — don't redirect yet (need email verification)
            if (successDiv) {
                successDiv.style.display = 'block';
                successDiv.innerHTML = `
                    <div style="background:rgba(39,174,96,0.1);border:1px solid #27ae60;border-radius:12px;padding:1.2rem;text-align:center">
                        <div style="font-size:2.5rem;margin-bottom:0.5rem">📧</div>
                        <h3 style="color:#27ae60;margin-bottom:0.5rem">ምዝገባዎ ተሳክቷል!</h3>
                        <p style="color:var(--text-secondary);font-size:0.9rem">
                            ወደ <strong>${email}</strong> የማረጋገጫ ኢሜይል ተልኳል።<br>
                            ኢሜይሉን ክፍተው ሊንኩን ተጭነው አካውንትዎን ያረጋግጡ።
                        </p>
                        <a href="auth-login.html" class="btn btn-success" style="margin-top:1rem;display:inline-block">
                            ወደ Login ሂዱ →
                        </a>
                    </div>
                `;
            } else {
                alert('ምዝገባዎ ተሳክቷል! 🎉\n\nወደ ' + email + ' የማረጋገጫ ኢሜይል ተልኳል።\nኢሜይሉን ክፍተው ሊንኩን ተጭኑ።');
                window.location.href = 'auth-login.html';
            }
            return;
        }

        // Fallback: backend-only registration (no email verification)
        const response = await api.register({ fullName, email, password, role });
        if (response.success) {
            api.setAuthToken(response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));

            // Send EmailJS notifications (welcome + admin alert) — non-blocking
            window.emailjsService?.sendRegistrationEmails({
                fullName: response.user.fullName,
                email:    response.user.email,
                role:     response.user.role
            });

            toast?.success(`Welcome, ${response.user.fullName}! 🎉`);
            setTimeout(() => {
                window.location.href = response.user.role === 'instructor'
                    ? 'instructor-dashboard.html' : 'courses.html';
            }, 800);
        } else {
            throw new Error(response.message || 'Registration failed');
        }

    } catch (error) {
        const fbErrors = {
            'auth/email-already-in-use': 'ይህ ኢሜይል ቀደም ሲል ተመዝግቧል።',
            'auth/weak-password':        'የይለፍ ቃሉ ቢያንስ 6 ቁምፊ መሆን አለበት።',
            'auth/invalid-email':        'ትክክለኛ ኢሜይል ያስፈልጋል።'
        };
        errorDiv.textContent = fbErrors[error.code] || error.message || 'Registration failed.';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});

// ── Google Sign-Up ────────────────────────────────────────────────────────────
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

        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getAuth, signInWithPopup, GoogleAuthProvider } =
            await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        let app;
        try { app = initializeApp(cfg, 'google-register'); }
        catch { app = (await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js")).getApp('google-register'); }

        const auth     = getAuth(app);
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');

        const result = await signInWithPopup(auth, provider);
        const user   = result.user;

        const errorDiv   = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');

        // Register in backend
        const googleFullName = user.displayName || user.email.split('@')[0];
        const googleEmail    = user.email;
        const googlePassword = 'google-oauth-' + user.uid;

        try {
            let backendRes;
            let isNewUser = false;

            // Try register first
            try {
                backendRes = await api.register({
                    fullName: googleFullName,
                    email:    googleEmail,
                    password: googlePassword,
                    role:     'student'
                });
                if (backendRes?.success) isNewUser = true;
            } catch (_) {}

            // Already registered — login instead
            if (!backendRes?.success) {
                backendRes = await api.login({
                    email:    googleEmail,
                    password: googlePassword
                });
            }

            if (backendRes?.success) {
                api.setAuthToken(backendRes.token);
                localStorage.setItem('currentUser', JSON.stringify(backendRes.user));

                // Send welcome email: backend already handles it on register.
                // EmailJS is an optional extra layer — only if configured.
                if (isNewUser && window.emailjsService && window.EMAILJS_CONFIG?.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
                    window.emailjsService.sendRegistrationEmails({
                        fullName: backendRes.user.fullName,
                        email:    backendRes.user.email,
                        role:     backendRes.user.role
                    });
                }

                if (successDiv) {
                    successDiv.style.display = 'block';
                    successDiv.innerHTML = `
                        <div style="background:rgba(39,174,96,0.1);border:1px solid #27ae60;border-radius:12px;padding:1rem;text-align:center">
                            <div style="font-size:2rem;margin-bottom:0.5rem">🎉</div>
                            <h3 style="color:#27ae60;margin-bottom:0.3rem">Welcome, ${backendRes.user.fullName}!</h3>
                            <p style="font-size:0.85rem;color:var(--text-secondary)">
                                ${isNewUser ? 'Account created with Google' : 'Signed in with Google'}
                            </p>
                        </div>`;
                }
                setTimeout(() => window.location.href = 'courses.html', 1500);
                return;
            }
        } catch (_) {}

        // Fallback: Firebase-only (no backend) — send EmailJS welcome email if configured
        const fbUser = {
            id: user.uid,
            fullName: googleFullName,
            email: googleEmail,
            role: 'student',
            avatar: user.photoURL
        };
        api.setAuthToken('firebase-' + user.uid);
        localStorage.setItem('currentUser', JSON.stringify(fbUser));

        // Only send EmailJS if properly configured
        if (window.emailjsService && window.EMAILJS_CONFIG?.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
            window.emailjsService.sendRegistrationEmails({
                fullName: fbUser.fullName,
                email:    fbUser.email,
                role:     fbUser.role
            });
        }

        window.location.href = 'courses.html';

    } catch (error) {
        const msg = {
            'auth/popup-closed-by-user':    'Google sign-up cancelled.',
            'auth/popup-blocked':           'Popup blocked. Please allow popups for this site.',
            'auth/cancelled-popup-request': 'Google sign-up cancelled.'
        };
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = msg[error.code] || 'Google sign-up failed: ' + error.message;
            errorDiv.style.display = 'block';
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔍 Sign up with Google';
    }
});
