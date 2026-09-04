/**
 * AuthForm.jsx — Alpha Freshman Tutorial
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified Login / Register modal with three auth methods:
 *
 *  1. 🔵 Google (primary — 1-click, Firebase GoogleAuthProvider)
 *  2. 📧 Email + Password (secondary — standard form)
 *  3. 📱 Phone OTP (optional collapsible tab — Firebase RecaptchaVerifier)
 *
 * Phone SMS is OPTIONAL — students can always use Google or Email instead.
 * All methods sync the JWT/token with the Node.js + MongoDB backend.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate }                               from 'react-router-dom'
import { useAuth }                                   from '../context/AuthContext'

// ── Firebase config (loaded from window — see firebase-config.js) ─────────────
const FIREBASE_CFG = window.FIREBASE_CONFIG || {}
const FB_CONFIGURED = FIREBASE_CFG.apiKey && FIREBASE_CFG.apiKey !== 'YOUR_API_KEY'

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : '/api'

// ── Lazy Firebase loader ──────────────────────────────────────────────────────
let _fbApp = null
let _fbAuth = null

async function getFirebase() {
  if (_fbAuth) return _fbAuth
  if (!FB_CONFIGURED) return null
  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js')
    const { getAuth }                = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
    const existing = getApps().find(a => a.name === 'auth-form')
    _fbApp  = existing || initializeApp(FIREBASE_CFG, 'auth-form')
    _fbAuth = getAuth(_fbApp)
    return _fbAuth
  } catch { return null }
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const IconEye     = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconEyeOff  = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10 10 0 0112 20C5 20 1 12 1 12a18 18 0 015.06-5.94M9.9 4.24A9 9 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.16 3.19M1 1l22 22"/></svg>
const IconMail    = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
const IconPhone   = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
const IconUser    = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const IconSpinner = () => <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>

// ── Google SVG logo ───────────────────────────────────────────────────────────
const IconGoogle = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.6 29.3 37 24 37a13 13 0 010-26c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7A21 21 0 1024 45c11.6 0 21-9.4 21-21 0-1.4-.1-2.7-.4-4z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A13 13 0 0124 11c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7A21 21 0 006.3 14.7z"/>
    <path fill="#4CAF50" d="M24 45a21 21 0 0014.2-5.5l-6.6-5.3A13 13 0 0124 37a13 13 0 01-12.3-8.7L5 33.5A21 21 0 0024 45z"/>
    <path fill="#1976D2" d="M43.6 20H24v8h11.3a13.2 13.2 0 01-4.5 6.2l6.6 5.3C41 35.8 45 30.4 45 24c0-1.4-.1-2.7-.4-4z"/>
  </svg>
)

// ── Auth method tabs ──────────────────────────────────────────────────────────
const AUTH_METHODS = [
  { id: 'email', label: '📧 Email',  icon: <IconMail />  },
  { id: 'phone', label: '📱 Phone',  icon: <IconPhone /> },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function AuthForm({ initialTab = 'login' }) {
  const navigate      = useNavigate()
  const { login: ctxLogin, register: ctxRegister } = useAuth()

  // ── Top-level state ─────────────────────────────────────────────────────────
  const [mode,        setMode]        = useState(initialTab === 'register' ? 'register' : 'login')
  const [authMethod,  setAuthMethod]  = useState('email')   // 'email' | 'phone'
  const [showPwd,     setShowPwd]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')

  // ── Email/password form ─────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [fullName, setFullName] = useState('')
  const [eduLevel, setEduLevel] = useState('Freshman Year')

  // ── Phone OTP state ─────────────────────────────────────────────────────────
  const [phone,         setPhone]         = useState('')
  const [otp,           setOtp]           = useState('')
  const [otpSent,       setOtpSent]       = useState(false)
  const [confirmResult, setConfirmResult] = useState(null)
  const [otpLoading,    setOtpLoading]    = useState(false)
  const recaptchaRef = useRef(null)
  const recaptchaContainerRef = useRef(null)

  // Clear messages when switching modes
  useEffect(() => { setError(''); setSuccess('') }, [mode, authMethod])

  // ── Redirect by role ────────────────────────────────────────────────────────
  const redirectByRole = useCallback((user) => {
    const adminRoles = ['admin','super_admin','content_admin','finance_admin','support_admin']
    if (adminRoles.includes(user.role))  navigate('/admin')
    else if (user.role === 'instructor') navigate('/instructor')
    else                                 navigate('/courses')
  }, [navigate])

  // ── Sync to backend and navigate ────────────────────────────────────────────
  const syncToBackend = useCallback(async ({ email: e, password: p, fullName: n, googleUser }) => {
    try {
      if (googleUser) {
        // Google OAuth — try login first, register if new
        let res = await ctxLogin(googleUser.email, 'google-oauth-' + googleUser.uid)
        if (!res.success) {
          res = await ctxRegister({
            fullName:  googleUser.displayName || googleUser.email.split('@')[0],
            email:     googleUser.email,
            password:  'google-oauth-' + googleUser.uid,
            role:      'student',
          })
        }
        if (res.success) { setSuccess('✅ Logged in!'); redirectByRole(res.user) }
        else             setError(res.error || 'Backend sync failed. Using Google session.')
        return
      }

      if (mode === 'login') {
        const res = await ctxLogin(e, p)
        if (res.success) { setSuccess('✅ Welcome back!'); redirectByRole(res.user) }
        else              setError(res.error || 'Invalid credentials.')
      } else {
        const res = await ctxRegister({ fullName: n, email: e, password: p, educationLevel: eduLevel, role: 'student' })
        if (res.success) { setSuccess('✅ Account created!'); redirectByRole(res.user) }
        else              setError(res.error || 'Registration failed.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
  }, [mode, eduLevel, ctxLogin, ctxRegister, redirectByRole])

  // ════════════════════════════════════════════════════════════════════════════
  // GOOGLE AUTH
  // ════════════════════════════════════════════════════════════════════════════
  const handleGoogle = async () => {
    if (!FB_CONFIGURED) { setError('Google login is not configured.'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const auth = await getFirebase()
      if (!auth) throw new Error('Firebase unavailable')
      const { signInWithPopup, GoogleAuthProvider } =
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
      const provider = new GoogleAuthProvider()
      provider.addScope('email'); provider.addScope('profile')
      const result    = await signInWithPopup(auth, provider)
      const gUser     = result.user

      // Sync with backend
      await syncToBackend({ googleUser: gUser })
    } catch (err) {
      const msgs = {
        'auth/popup-closed-by-user':    'Google login cancelled.',
        'auth/popup-blocked':           'Popup was blocked. Allow popups for this site.',
        'auth/cancelled-popup-request': 'Google login cancelled.',
        'auth/unauthorized-domain':     'This domain is not authorised in Firebase Console.',
        'auth/network-request-failed':  'Network error. Check your connection.',
      }
      setError(msgs[err.code] || err.message || 'Google login failed.')
    } finally { setLoading(false) }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EMAIL + PASSWORD AUTH
  // ════════════════════════════════════════════════════════════════════════════
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    if (!email || !password) { setError('Email and password are required.'); return }
    if (mode === 'register') {
      if (!fullName.trim())        { setError('Full name is required.'); return }
      if (password.length < 6)     { setError('Password must be at least 6 characters.'); return }
      if (password !== confirm)    { setError('Passwords do not match.'); return }
    }

    setLoading(true)

    // Try Firebase email auth first (if configured), then fall through to backend
    if (FB_CONFIGURED) {
      try {
        const auth = await getFirebase()
        const { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } =
          await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')

        if (mode === 'login') {
          const uc   = await signInWithEmailAndPassword(auth, email, password)
          if (!uc.user.emailVerified) {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
            await signOut(auth)
            setError('Email not verified. Check your inbox and click the verification link.')
            setLoading(false); return
          }
        } else {
          const uc = await createUserWithEmailAndPassword(auth, email, password)
          await sendEmailVerification(uc.user)
          // Don't redirect yet — also register on backend
        }
      } catch (fbErr) {
        const fbMsgs = {
          'auth/email-already-in-use':  'This email is already registered. Try logging in.',
          'auth/user-not-found':        'No account found with this email.',
          'auth/wrong-password':        'Incorrect password.',
          'auth/invalid-credential':    'Incorrect email or password.',
          'auth/weak-password':         'Password must be at least 6 characters.',
          'auth/invalid-email':         'Please enter a valid email address.',
          'auth/too-many-requests':     'Too many attempts. Please wait and try again.',
          'auth/network-request-failed': null, // fall through to backend
        }
        if (fbMsgs[fbErr.code] !== undefined && fbMsgs[fbErr.code] !== null) {
          setError(fbMsgs[fbErr.code])
          setLoading(false); return
        }
        // network error — fall through to backend-only
      }
    }

    // Backend auth
    await syncToBackend({ email, password, fullName })
    setLoading(false)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PHONE OTP AUTH  (OPTIONAL)
  // ════════════════════════════════════════════════════════════════════════════

  // Initialise invisible reCAPTCHA
  const initRecaptcha = useCallback(async () => {
    if (recaptchaRef.current) return recaptchaRef.current
    if (!FB_CONFIGURED) return null
    try {
      const auth = await getFirebase()
      const { RecaptchaVerifier } =
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
      })
      await recaptchaRef.current.render()
      return recaptchaRef.current
    } catch { return null }
  }, [])

  const handleSendOTP = async () => {
    if (!phone.trim()) { setError('Enter your phone number.'); return }
    const formatted = phone.startsWith('+') ? phone : '+251' + phone.replace(/^0/, '')
    setOtpLoading(true); setError(''); setSuccess('')
    try {
      if (!FB_CONFIGURED) throw new Error('Firebase not configured.')
      const auth       = await getFirebase()
      const verifier   = await initRecaptcha()
      if (!auth || !verifier) throw new Error('Firebase not available.')
      const { signInWithPhoneNumber } =
        await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
      const result = await signInWithPhoneNumber(auth, formatted, verifier)
      setConfirmResult(result)
      setOtpSent(true)
      setSuccess(`OTP sent to ${formatted}`)
    } catch (err) {
      const msgs = {
        'auth/invalid-phone-number':    'Invalid phone number. Use format: 0911223344',
        'auth/too-many-requests':       'Too many requests. Please try again later.',
        'auth/captcha-check-failed':    'reCAPTCHA failed. Refresh and try again.',
        'auth/quota-exceeded':          'SMS quota exceeded. Please use Email login.',
      }
      setError(msgs[err.code] || err.message || 'Failed to send OTP.')
      // Reset reCAPTCHA on error
      recaptchaRef.current = null
    } finally { setOtpLoading(false) }
  }

  const handleVerifyOTP = async () => {
    if (!otp.trim()) { setError('Enter the OTP code.'); return }
    if (!confirmResult) { setError('Please request OTP first.'); return }
    setOtpLoading(true); setError(''); setSuccess('')
    try {
      const result   = await confirmResult.confirm(otp)
      const fbUser   = result.user
      const formatted = phone.startsWith('+') ? phone : '+251' + phone.replace(/^0/, '')

      // Sync with backend using phone number
      try {
        let res = await fetch(`${API_BASE}/auth/login`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ phoneNumber: formatted, password: 'phone-otp-' + fbUser.uid })
        })
        let data = await res.json()

        if (!res.ok) {
          // Register new user via phone
          const regBody = {
            fullName:    fullName.trim() || 'Student',
            phoneNumber: formatted,
            password:    'phone-otp-' + fbUser.uid,
            role:        'student',
          }
          res  = await fetch(`${API_BASE}/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(regBody)
          })
          data = await res.json()
        }

        if (data.token) {
          localStorage.setItem('authToken',    data.token)
          localStorage.setItem('currentUser',  JSON.stringify(data.user))
          setSuccess('✅ Phone verified! Redirecting...')
          setTimeout(() => redirectByRole(data.user), 800)
        } else {
          throw new Error(data.message || 'Backend sync failed')
        }
      } catch {
        // Backend unavailable — use Firebase phone session
        const fallback = { id: fbUser.uid, fullName: fullName || 'Student', phoneNumber: formatted, role: 'student' }
        localStorage.setItem('currentUser', JSON.stringify(fallback))
        localStorage.setItem('authToken',   'firebase-phone-' + fbUser.uid)
        setSuccess('✅ Phone verified!')
        setTimeout(() => redirectByRole(fallback), 800)
      }
    } catch (err) {
      setError(err.code === 'auth/invalid-verification-code'
        ? 'Wrong OTP code. Check your SMS and try again.'
        : (err.message || 'OTP verification failed.'))
    } finally { setOtpLoading(false) }
  }

  // ── Tab header styles ───────────────────────────────────────────────────────
  const tabCls = (id) =>
    `flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 ` +
    (authMethod === id
      ? 'border-blue-600 text-blue-700 bg-blue-50'
      : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50')

  // ── Input wrapper ───────────────────────────────────────────────────────────
  const Input = ({ icon, type = 'text', placeholder, value, onChange, disabled, ...rest }) => (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        className={`w-full ${icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200
          rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition disabled:opacity-60`}
        {...rest}
      />
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950
      flex items-center justify-center p-4">

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} className="fixed bottom-0 left-0 z-50" />

      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 px-6 py-6 text-center">
            <div className="text-4xl mb-2">🎓</div>
            <h1 className="text-white text-xl font-bold tracking-wide">Alpha Freshman Tutorial</h1>
            <p className="text-blue-100 text-xs mt-1">
              {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
            </p>
          </div>

          {/* ── Login / Register toggle ─────────────────────────────────────── */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => { setMode('login');    setError(''); setSuccess('') }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess('') }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                mode === 'register'
                  ? 'text-blue-700 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-slate-400 hover:text-slate-600'}`}
            >
              Register
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* ── Alerts ──────────────────────────────────────────────────── */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                <span className="mt-0.5 flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">
                <span>✅</span><span>{success}</span>
              </div>
            )}

            {/* ── OPTION 1: Google ─────────────────────────────────────────── */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading || !FB_CONFIGURED}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4
                bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50
                rounded-xl text-sm font-semibold text-slate-700 transition-all shadow-sm
                hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <IconSpinner /> : <IconGoogle />}
              <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
              <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                FAST
              </span>
            </button>

            {/* ── Divider ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or sign in with</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* ── Auth method tabs (Email / Phone) ─────────────────────────── */}
            <div className="flex rounded-xl overflow-hidden border border-slate-200">
              {AUTH_METHODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setAuthMethod(m.id); setError(''); setSuccess('') }}
                  className={tabCls(m.id)}
                >
                  {m.icon}
                  {m.label}
                  {m.id === 'phone' && (
                    <span className="ml-0.5 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      OPTIONAL
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* OPTION 2 — EMAIL / PASSWORD                                   */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {authMethod === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {/* Full name (register only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                    <Input
                      icon={<IconUser />}
                      placeholder="Abebe Kebede"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
                  <Input
                    icon={<IconMail />}
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                {/* Education level (register only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Education Level</label>
                    <select
                      value={eduLevel}
                      onChange={e => setEduLevel(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl
                        focus:outline-none focus:border-blue-500 transition disabled:opacity-60"
                    >
                      <option value="Freshman Year">Freshman Year</option>
                      <option value="High School (Grade 11-12)">High School (Grade 11-12)</option>
                      <option value="Department Courses">Department Courses</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPwd ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                </div>

                {/* Confirm password (register only) */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password</label>
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                )}

                {/* Forgot password link (login only) */}
                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={async () => {
                        if (!email) { setError('Enter your email to reset password.'); return }
                        try {
                          const r = await fetch(`${API_BASE}/auth/forgot-password`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                          })
                          const d = await r.json()
                          if (d.success) setSuccess('Reset link sent to your email.')
                          else setError(d.message || 'Failed to send reset email.')
                        } catch { setError('Network error.') }
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600
                    hover:from-blue-700 hover:to-indigo-700 text-white font-semibold
                    rounded-xl shadow-md hover:shadow-lg transition-all
                    disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? <><IconSpinner /><span>Please wait…</span></> :
                    mode === 'login' ? '🔐 Sign In' : '🚀 Create Account'}
                </button>
              </form>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* OPTION 3 — PHONE OTP  (OPTIONAL)                              */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {authMethod === 'phone' && (
              <div className="space-y-3">
                {/* Optional notice */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  <span>💡</span>
                  <span>Phone verification is <strong>optional</strong>. You can use Google or Email instead.</span>
                </div>

                {!FB_CONFIGURED && (
                  <div className="p-3 bg-slate-100 rounded-xl text-slate-500 text-xs text-center">
                    Firebase is not configured on this deployment.<br/>
                    Please use <strong>Google</strong> or <strong>Email</strong> login.
                  </div>
                )}

                {FB_CONFIGURED && (
                  <>
                    {/* Name (register only) */}
                    {mode === 'register' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                        <Input
                          icon={<IconUser />}
                          placeholder="Abebe Kebede"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Phone number input */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Phone Number <span className="text-slate-400">(Ethiopian — starts with 09 or +251)</span>
                      </label>
                      <div className="flex gap-2">
                        <Input
                          icon={<IconPhone />}
                          type="tel"
                          placeholder="0911223344 or +251911223344"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          disabled={otpSent}
                        />
                        {!otpSent && (
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={otpLoading || !phone}
                            className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700
                              text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                          >
                            {otpLoading ? <IconSpinner /> : 'Send OTP'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* OTP code input */}
                    {otpSent && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-600">
                          Enter 6-digit OTP sent to {phone}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            placeholder="123456"
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="flex-1 px-4 py-2.5 text-center text-lg font-bold tracking-widest
                              bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500
                              focus:outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOTP}
                            disabled={otpLoading || otp.length < 6}
                            className="flex-shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700
                              text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                          >
                            {otpLoading ? <IconSpinner /> : 'Verify'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOtpSent(false); setOtp(''); setConfirmResult(null); setError(''); setSuccess('') }}
                          className="text-xs text-slate-400 hover:text-slate-600 underline"
                        >
                          ← Change phone number
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Mode toggle footer ──────────────────────────────────────── */}
            <p className="text-center text-xs text-slate-500 pt-1">
              {mode === 'login' ? (
                <>Don&apos;t have an account?{' '}
                  <button onClick={() => { setMode('register'); setError(''); setSuccess('') }}
                    className="text-blue-600 font-semibold hover:underline">Register</button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                    className="text-blue-600 font-semibold hover:underline">Sign In</button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Sub-caption */}
        <p className="text-center text-slate-400 text-xs mt-4">
          🔒 Your data is secure. We never share your information.
        </p>
      </div>
    </div>
  )
}
