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
        } catch { toast?.error('Failed to load course info'); }
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
    document.getElementById('manual-section').style.display = method === 'manual' ? 'block' : 'none';

    const payBtn = document.getElementById('payBtn');
    if (method === 'chapa')  { payBtn.textContent = 'Pay with Chapa';  payBtn.style.display = 'block'; }
    else if (method === 'card') { payBtn.textContent = 'Pay with Card'; payBtn.style.display = 'block'; }
    else {
        payBtn.style.display = 'none'; // Manual: submit button is inside the section
    }
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
                toast?.success('Payment successful! 🎉');
                setTimeout(() => window.location.href = `payment-success.html?invoice=${verify.invoiceNumber}`, 1500);
            }
        } else if (res.checkoutUrl) {
            window.location.href = res.checkoutUrl;
        }
    } catch (e) {
        toast?.error(e.message || 'Payment failed. Please try again.');
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

// ── Manual Payment helpers ────────────────────────────────────────────────────
let receiptBase64 = null;
let receiptFileName = '';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.color = '#27ae60';
        setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 2000);
    }).catch(() => {
        toast?.info('Account number: ' + text);
    });
}

function handleReceiptFile(input) {
    const file = input.files[0];
    if (!file) return;
    processReceiptFile(file);
}

function handleReceiptDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    processReceiptFile(file);
}

function processReceiptFile(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        toast?.error('Only JPG, PNG, GIF or PDF files are allowed');
        return;
    }
    if (file.size > MAX_FILE_SIZE) {
        toast?.error('File size must be under 5MB');
        return;
    }

    receiptFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        receiptBase64 = e.target.result; // full data URI

        const uploadArea = document.getElementById('uploadArea');
        const preview    = document.getElementById('receiptPreview');
        const previewImg = document.getElementById('receiptPreviewImg');
        const previewName= document.getElementById('receiptPreviewName');

        uploadArea.classList.add('has-file');
        previewName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

        if (file.type !== 'application/pdf') {
            previewImg.src = receiptBase64;
            previewImg.style.display = 'block';
        } else {
            previewImg.style.display = 'none';
        }
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function clearReceipt() {
    receiptBase64   = null;
    receiptFileName = '';
    document.getElementById('receiptFile').value = '';
    document.getElementById('receiptPreview').style.display = 'none';
    document.getElementById('receiptPreviewImg').src = '';
    document.getElementById('uploadArea').classList.remove('has-file');
}

async function submitManualPayment() {
    const submitBtn = document.getElementById('manualSubmitBtn');
    if (!receiptBase64) {
        toast?.error('Please upload your payment receipt first');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const afterDiscount = subtotal - discount;
    const tax   = Math.round(afterDiscount * TAX_RATE);
    const total = afterDiscount + tax;

    try {
        const body = {
            receiptImage:    receiptBase64,
            receiptFileName: receiptFileName,
            amount:          total,
            studentName:     currentUser?.fullName,
            studentEmail:    currentUser?.email
        };
        if (courseId) body.courseId = courseId;
        else body.plan = plan;

        const res = await api.request('/payments/manual-receipt', {
            method: 'POST',
            body: JSON.stringify(body)
        });

        if (res.success) {
            // Show success state
            document.getElementById('manualSuccessBanner').style.display = 'block';
            document.getElementById('uploadArea').style.display = 'none';
            document.getElementById('receiptPreview').style.display = 'none';
            submitBtn.style.display = 'none';
            document.querySelectorAll('.bank-detail-box, label[for]').forEach(el => el.style.opacity = '0.5');
        }
    } catch (e) {
        toast?.error(e.message || 'Failed to submit receipt. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 Send Receipt for Verification';
    }
}

init();
