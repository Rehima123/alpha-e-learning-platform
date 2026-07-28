// ── Check if user has active subscription ────────────────────────────────────
async function hasActiveSubscription() {
    try {
        const res = await api.getMe();
        if (!res.success || !res.user) return false;
        const sub = res.user.subscription;
        if (!sub) return false;
        if ((sub.plan === 'monthly' || sub.plan === 'annual') && sub.status === 'active') {
            if (sub.endDate && new Date(sub.endDate) > new Date()) return true;
        }
        return false;
    } catch {
        // Fallback to localStorage cache when offline
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (!user) return false;
        const sub = user.subscription;
        if (!sub) return false;
        if ((sub.plan === 'monthly' || sub.plan === 'annual') && sub.status === 'active') {
            if (sub.endDate && new Date(sub.endDate) > new Date()) return true;
        }
        return false;
    }
}

// ── Subscribe ─────────────────────────────────────────────────────────────────
async function subscribe(plan) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'auth-login.html';
        return;
    }

    // Redirect to payment with plan
    window.location.href = `payment.html?plan=${plan}`;
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
