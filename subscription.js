// ── Check if user has active subscription ────────────────────────────────────
function hasActiveSubscription() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return false;
    const sub = user.subscription;
    if (!sub) return false;
    if (sub.plan === 'monthly' || sub.plan === 'annual') {
        if (sub.endDate && new Date(sub.endDate) > new Date()) return true;
        if (sub.status === 'active') return true;
    }
    return false;
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
document.addEventListener('DOMContentLoaded', () => {
    if (hasActiveSubscription()) {
        toast?.success('You already have full access!');
        setTimeout(() => window.location.href = 'courses.html', 1200);
    }
});
