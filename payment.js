const ETB_RATE = 56;
const TAX_RATE = 0.15;

const params = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');
const plan     = params.get('plan');

let subtotal = 0, discount = 0, couponData = null;
let selectedMethod = 'chapa';

const planInfo = { monthly: { name: 'Monthly Subscription', etb: 1650 }, annual: { name: 'Annual Subscription', etb: 11300 } };

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) { window.location.href = 'auth-login.html'; return; }

    if (courseId) {
        try {
            const res = await api.getCourse(courseId);
            if (res.success) {
                const c = res.course;
                document.getElementById('orderIcon').textContent  = c.icon || '📚';
                document.getElementById('orderTitle').textContent = c.title;
                document.getElementById('orderType').textContent  = `Course · ${c.category}`;
                subtotal = Math.round(c.price * ETB_RATE);
            }
        } catch { toast.error('Failed to load course info'); }
    } else if (plan && planInfo[plan]) {
        document.getElementById('orderIcon').textContent  = plan === 'annual' ? '⭐' : '📅';
        document.getElementById('orderTitle').textContent = planInfo[plan].name;
        document.getElementById('orderType').textContent  = 'Subscription';
        subtotal = planInfo[plan].etb;
    }

    updateTotals();
}

function updateTotals() {
    const afterDiscount = subtotal - discount;
    const tax   = Math.round(afterDiscount * TAX_RATE);
    const total = afterDiscount + tax;

    document.getElementById('subtotalDisplay').textContent = `${subtotal.toLocaleString()} ETB`;
    document.getElementById('taxDisplay').textContent      = `${tax.toLocaleString()} ETB`;
    document.getElementById('totalDisplay').textContent    = `${total.toLocaleString()} ETB`;

    if (discount > 0) {
        document.getElementById('discountRow').style.display = 'flex';
        document.getElementById('discountDisplay').textContent = `-${discount.toLocaleString()} ETB`;
    }
}

async function applyCoupon() {
    const code = document.getElementById('couponInput').value.trim();
    if (!code) return;
    const msg = document.getElementById('couponMsg');
    try {
        const res = await api.request('/payments/validate-coupon', {
            method: 'POST',
            body: JSON.stringify({ code, amount: subtotal })
        });
        if (res.success) {
            couponData = res.coupon;
            discount = res.coupon.discount;
            msg.style.color = '#27ae60';
            msg.textContent = `✅ Coupon applied! You save ${discount.toLocaleString()} ETB`;
            updateTotals();
        }
    } catch (e) {
        msg.style.color = '#e74c3c';
        msg.textContent = `❌ ${e.message}`;
    }
}

function selectMethod(method) {
    selectedMethod = method;
    document.querySelectorAll('.pay-method').forEach(el => el.classList.remove('selected'));
    document.getElementById(`method-${method}`).classList.add('selected');
    document.getElementById('chapa-section').style.display = method === 'chapa' ? 'block' : 'none';
    document.getElementById('card-section').style.display  = method === 'card'  ? 'block' : 'none';
    document.getElementById('payBtn').textContent = method === 'chapa' ? 'Pay with Chapa' : 'Pay with Card';
}

async function processPayment() {
    const btn = document.getElementById('payBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        const body = {
            couponCode: couponData?.code,
            currency: 'ETB'
        };
        if (courseId) body.courseId = courseId;
        else body.plan = plan;

        const res = await api.request('/payments/initiate', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        if (res.devMode) {
            // Dev mode: simulate success
            const verify = await api.request('/payments/dev-verify', {
                method: 'POST',
                body: JSON.stringify({ txRef: res.txRef })
            });
            if (verify.success) {
                toast.success('Payment successful! 🎉');
                setTimeout(() => window.location.href = `payment-success.html?invoice=${verify.invoiceNumber}`, 1500);
            }
        } else if (res.checkoutUrl) {
            window.location.href = res.checkoutUrl;
        }
    } catch (e) {
        toast.error(e.message || 'Payment failed. Please try again.');
        btn.disabled = false;
        btn.textContent = selectedMethod === 'chapa' ? 'Pay with Chapa' : 'Pay with Card';
    }
}

// Card input formatting
document.getElementById('cardNumber')?.addEventListener('input', e => {
    let v = e.target.value.replace(/\s/g, '');
    e.target.value = v.match(/.{1,4}/g)?.join(' ') || v;
});
document.getElementById('expiry')?.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2,4);
    e.target.value = v;
});

init();
