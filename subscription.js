// ── Check if user has active subscription ────────────────────────────────────
async function hasActiveSubscription() {
    try {
        // Use the real subscriptions API endpoint
        const res = await api.request('/subscriptions/me');
        if (res.success && res.subscription) {
            return !!res.subscription.isActive;
        }
        return false;
    } catch {
        // Offline fallback — read from cached user in localStorage
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user) return false;
        const sub = user.subscription;
        if (!sub) return false;
        if ((sub.plan === 'monthly' || sub.plan === 'annual') && sub.status === 'active') {
            if (sub.endDate && new Date(sub.endDate) > new Date()) return true;
        }
        return false;
    }
}

// ── Subscribe (new plan) ──────────────────────────────────────────────────────
async function subscribe(plan) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!currentUser) {
        window.location.href = 'auth-login.html';
        return;
    }
    window.location.href = `payment.html?plan=${plan}`;
}

// ── Cancel active subscription ────────────────────────────────────────────────
async function cancelSubscription() {
    try {
        const res = await api.request('/subscriptions/cancel', { method: 'PUT' });
        if (res.success) {
            // Update the cached user so offline checks are consistent
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (user.subscription) {
                user.subscription.status = 'cancelled';
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
            toast?.success('Subscription cancelled.');
        } else {
            toast?.error(res.message || 'Could not cancel subscription.');
        }
        return res;
    } catch (err) {
        toast?.error('Network error. Please try again.');
        return { success: false, error: err.message };
    }
}

// ── Renew subscription (re-initiate payment) ──────────────────────────────────
async function renewSubscription() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const plan = user?.subscription?.plan;

    if (!plan || plan === 'free') {
        window.location.href = 'subscription.html';
        return;
    }

    try {
        const res = await api.request('/subscriptions/renew', { method: 'PUT' });
        if (res.checkoutUrl) {
            window.location.href = res.checkoutUrl;
        } else if (res.devMode) {
            window.location.href = `payment-success.html?tx_ref=${res.txRef}`;
        } else {
            toast?.error(res.message || 'Could not initiate renewal.');
        }
        return res;
    } catch (err) {
        toast?.error('Network error. Please try again.');
        return { success: false, error: err.message };
    }
}

function skipSubscription() {
    window.location.href = 'courses.html';
}

// ── On page load: if already subscribed, redirect ────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (await hasActiveSubscription()) {
        toast?.success('You already have full access!');
        setTimeout(() => window.location.href = 'courses.html', 1200);
    }
});
