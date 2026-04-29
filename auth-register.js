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

// ── Register form ─────────────────────────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName        = document.getElementById('fullName').value.trim();
    const email           = document.getElementById('email').value.trim();
    const password        = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role            = document.getElementById('role').value;
    const errorDiv        = document.getElementById('errorMessage');
    const submitBtn       = e.target.querySelector('button[type="submit"]');

    errorDiv.style.display = 'none';

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'block';
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        const response = await api.register({ fullName, email, password, role: role || 'student' });

        if (response.success) {
            api.setAuthToken(response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            toast?.success(`Welcome, ${response.user.fullName}! 🎉`);

            setTimeout(() => {
                if (response.user.role === 'instructor') {
                    window.location.href = 'instructor-dashboard.html';
                } else {
                    window.location.href = 'courses.html';
                }
            }, 800);
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Registration failed. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});
