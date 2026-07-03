// course-payment.js — redirects to the unified payment page
// This file handles legacy ?id= links and forwards to payment.html

const urlParams = new URLSearchParams(window.location.search);
const courseId  = urlParams.get('id');

if (!courseId) {
    window.location.href = 'courses.html';
} else {
    // Redirect to the unified payment page which uses the real API
    window.location.replace(`payment.html?courseId=${courseId}`);
}
