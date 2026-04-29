document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    errorDiv.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await api.login({ email, password });

        if (response.success) {
            api.setAuthToken(response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));

            const user = response.user;
            if (user.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else if (user.role === 'instructor') {
                window.location.href = 'instructor-dashboard.html';
            } else {
                window.location.href = 'courses.html';
            }
        } else {
            errorDiv.textContent = response.message || 'Login failed';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});
