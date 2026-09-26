# EmailJS Setup Guide — Alpha Freshman Tutorial

## 1. Create Account & Service
1. Go to [https://www.emailjs.com](https://www.emailjs.com) → Sign up (free tier allows 200 emails/month)
2. **Email Services** → Add New Service → Gmail → connect `supportalphafreshman@gmail.com`
3. Copy the **Service ID** (e.g. `service_abc123`)

---

## 2. Create Template 1 — Welcome Email (sent to user)

**Name:** `welcome_user`  
**To Email:** `{{to_email}}`  
**Subject:** `{{subject}}`

**Body (HTML):**
```html
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:32px;text-align:center;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0">Alpha Freshman Tutorial</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">Way to Success 🚀</p>
  </div>
  <div style="background:white;padding:32px;border:1px solid #eee">
    <h2 style="color:#667eea">እንኳን ደህና መጡ, {{to_name}}! 🎉</h2>
    <p>Thank you for registering on <strong>Alpha Freshman Tutorial</strong>.</p>
    <p>Your account has been created as a <strong>{{user_role}}</strong>.</p>
    <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0">
      <h3 style="color:#667eea;margin:0 0 12px">Get Started:</h3>
      <ul style="margin:0;padding-left:20px;color:#555;line-height:2">
        <li>Browse 22 Ethiopian Freshman courses</li>
        <li>Request enrollment in your desired courses</li>
        <li>Track your progress on the dashboard</li>
        <li>Study with AI-powered quizzes and notes</li>
      </ul>
    </div>
    <a href="{{courses_url}}"
       style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);
       color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
      Browse Courses →
    </a>
    <p style="margin-top:24px;font-size:0.85rem;color:#888">
      Registered on: {{reg_date}}
    </p>
  </div>
  <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:0.78rem;color:#888;border-radius:0 0 8px 8px">
    © 2026 Alpha Freshman Tutorial · Way to Success
  </div>
</div>
```

**Variables used:** `to_email`, `to_name`, `user_role`, `courses_url`, `reg_date`, `subject`

---

## 3. Create Template 2 — Admin Alert (sent to admin)

**Name:** `admin_new_registration`  
**To Email:** `{{admin_email}}`  
**Subject:** `{{subject}}`

**Body (HTML):**
```html
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:24px;text-align:center;border-radius:8px 8px 0 0">
    <h2 style="color:white;margin:0">Alpha Freshman Tutorial</h2>
    <p style="color:rgba(255,255,255,0.85);margin:4px 0 0">Admin Notification</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #eee">
    <h3 style="color:#e74c3c">🚨 New User Registration Alert</h3>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#666;width:40%">Name</td><td style="font-weight:600">{{user_name}}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Email</td><td>{{user_email}}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Role</td><td>{{user_role}}</td></tr>
      <tr><td style="padding:8px 0;color:#666">Registered At</td><td>{{reg_time}}</td></tr>
    </table>
    <a href="{{dashboard_url}}"
       style="display:inline-block;margin-top:16px;background:#667eea;color:white;
       padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">
      View Admin Dashboard →
    </a>
  </div>
  <div style="background:#f9f9f9;padding:12px;text-align:center;font-size:0.78rem;color:#888;border-radius:0 0 8px 8px">
    © 2026 Alpha Freshman Tutorial
  </div>
</div>
```

**Variables used:** `admin_email`, `user_name`, `user_email`, `user_role`, `reg_time`, `dashboard_url`, `subject`

---

## 4. Get Your Public Key

EmailJS Dashboard → **Account** → **API Keys** → copy **Public Key**

---

## 5. Fill in `auth-register.html`

Replace the placeholder values in the `<script>` block near the bottom of `auth-register.html`:

```js
window.EMAILJS_CONFIG = {
    PUBLIC_KEY:       'aBcDeFgHiJkLmNoP',     // ← your Public Key
    SERVICE_ID:       'service_abc123',         // ← your Service ID
    WELCOME_TEMPLATE: 'template_welcome123',    // ← Template 1 ID
    ADMIN_TEMPLATE:   'template_admin456',      // ← Template 2 ID
    ADMIN_EMAIL:      'supportalphafreshman@gmail.com'
};
```

For the React app, set the same values via environment variables in `.env`:

```env
VITE_EMAILJS_PUBLIC_KEY=aBcDeFgHiJkLmNoP
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_WELCOME_TEMPLATE=template_welcome123
VITE_EMAILJS_ADMIN_TEMPLATE=template_admin456
```

---

## Summary

| What                  | Where it goes         |
|-----------------------|-----------------------|
| Public Key            | `EMAILJS_CONFIG.PUBLIC_KEY`  |
| Service ID            | `EMAILJS_CONFIG.SERVICE_ID`  |
| Welcome Template ID   | `EMAILJS_CONFIG.WELCOME_TEMPLATE` |
| Admin Template ID     | `EMAILJS_CONFIG.ADMIN_TEMPLATE`   |
| Admin email           | `supportalphafreshman@gmail.com`  |
