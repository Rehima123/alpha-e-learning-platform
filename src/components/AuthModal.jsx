/**
 * AuthModal.jsx
 *
 * Mobile-responsive auth modal with:
 *  1. Google Sign-In (one click)
 *  2. Email/Password Sign-In & Sign-Up toggle
 *
 * After any successful Firebase auth → calls POST /api/auth/sync-user
 * to get a backend JWT with the correct role assigned.
 *
 * Usage:
 *   const [showAuth, setShowAuth] = useState(false)
 *   <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  X, Mail, Lock, User, Eye, EyeOff,
  Chrome, AlertCircle, CheckCircle, Loader
} from 'lucide-react'

// ── Firebase imports (loaded dynamically to avoid bundle bloat) ───────────────
async function getFirebase() {
  const { initializeApp, getApps, getApp } =
    await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js')
  const {
    getAuth,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider
  } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')

  const cfg = window.FIREBASE_CONFIG
  if (!cfg || cfg.apiKey === 'YOUR_API_KEY') throw new Error('Firebase not configured')

  const app  = getApps().find(a => a.name === 'auth-modal') || initializeApp(cfg, 'auth-modal')
  const auth = getAuth(app)
  return { auth, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider }
}

// ── Sync Firebase user to backend ─────────────────────────────────────────────
async function syncToBackend(firebaseUser) {
  const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api'

  const res  = await fetch(`${API}/auth/sync-user`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firebaseUid: firebaseUser.uid,
      email:       firebaseUser.email,
      fullName:    firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      avatar:      firebaseUser.photoURL || null
    })
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.message || 'Sync failed')
  return data // { token, user }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AuthModal({ isOpen, onClose, redirectTo = null }) {
  const { setCurrentUserExternal } = useAuth()  // see note below
  const navigate = useNavigate()

  const [mode,       setMode]       = useState('login')   // 'login' | 'register'
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [fullName,   setFullName]   = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  if (!isOpen) return null

  const clearMessages = () => { setError(''); setSuccess('') }

  // ── After sync: store token + user, close modal, redirect ────────────────
  const handleSyncSuccess = (data) => {
    localStorage.setItem('authToken',   data.token)
    localStorage.setItem('currentUser', JSON.stringify(data.user))
    // If AuthContext exposes a setter, update it directly
    if (typeof setCurrentUserExternal === 'function') {
      setCurrentUserExternal(data.user)
    }
    setSuccess(`Welcome, ${data.user.fullName}! 🎉`)
    setTimeout(() => {
      onClose()
      if (redirectTo) {
        navigate(redirectTo)
      } else {
        const adminRoles = ['admin','super_admin','content_admin','finance_admin','support_admin']
        navigate(adminRoles.includes(data.user.role) ? '/admin' : '/dashboard')
      }
    }, 800)
  }

  // ── Google Sign-In ────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    clearMessages()
    setLoading(true)
    try {
      const { auth, signInWithPopup, GoogleAuthProvider } = await getFirebase()
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')

      const result      = await signInWithPopup(auth, provider)
      const firebaseUser = result.user
      const data        = await syncToBackend(firebaseUser)
      handleSyncSuccess(data)
    } catch (err) {
      const msgs = {
        'auth/popup-closed-by-user':    'Google sign-in was cancelled.',
        'auth/popup-blocked':           'Popup blocked. Allow popups for this site.',
        'auth/cancelled-popup-request': 'Google sign-in cancelled.',
        'auth/unauthorized-domain':     'Domain not authorized in Firebase. Check Firebase Console.',
        'auth/network-request-failed':  'Network error. Check your connection.'
      }
      setError(msgs[err.code] || err.message || 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  // ── Email / Password ──────────────────────────────────────────────────────
  const handleEmailAuth = async (e) => {
    e.preventDefault()
    clearMessages()

    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    if (mode === 'register' && !fullName.trim()) { setError('Full name is required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      const { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = await getFirebase()

      let firebaseUser
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        firebaseUser = cred.user
        // Update Firebase display name
        const { updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
        await updateProfile(firebaseUser, { displayName: fullName.trim() }).catch(() => {})
        firebaseUser.displayName = fullName.trim()
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
        firebaseUser = cred.user
      }

      const data = await syncToBackend(firebaseUser)
      handleSyncSuccess(data)

    } catch (err) {
      const msgs = {
        'auth/email-already-in-use':  'An account with this email already exists.',
        'auth/user-not-found':        'No account found with this email.',
        'auth/wrong-password':        'Incorrect password.',
        'auth/invalid-credential':    'Incorrect email or password.',
        'auth/weak-password':         'Password must be at least 6 characters.',
        'auth/invalid-email':         'Please enter a valid email address.',
        'auth/too-many-requests':     'Too many attempts. Please wait a moment.'
      }
      setError(msgs[err.code] || err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
    >
      {/* Modal card */}
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10
        rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
          <h2 className="text-xl font-bold text-white">
            {mode === 'login' ? '🔐 Sign In' : '🎓 Create Account'}
          </h2>
          <p className="text-blue-100 text-sm mt-0.5">
            {mode === 'login'
              ? 'Welcome back to Alpha Freshman Tutorial'
              : 'Join thousands of Ethiopian freshman students'}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70
            hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Feedback */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30
              text-red-400 text-sm rounded-xl px-4 py-3" role="alert">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/30
              text-green-400 text-sm rounded-xl px-4 py-3" role="status">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white
              hover:bg-gray-50 text-gray-800 font-semibold rounded-xl py-3 px-4
              transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? <Loader className="w-5 h-5 animate-spin text-gray-500" />
              : <Chrome className="w-5 h-5 text-blue-600" />
            }
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-xs font-medium">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleEmailAuth} className="space-y-3" noValidate>

            {/* Full name — register only */}
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-white/10 text-white placeholder-slate-500
                    rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500
                    focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'email' : 'new-email'}
                className="w-full bg-slate-800 border border-white/10 text-white placeholder-slate-500
                  rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500
                  focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-slate-800 border border-white/10 text-white placeholder-slate-500
                  rounded-xl py-3 pl-10 pr-10 text-sm focus:outline-none focus:border-blue-500
                  focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                  hover:text-slate-300 transition-colors"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600
                hover:from-blue-500 hover:to-purple-500 text-white font-bold
                rounded-xl py-3 transition-all shadow-lg shadow-blue-500/20
                disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Mode toggle */}
          <p className="text-center text-sm text-slate-400">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('register'); clearMessages() }}
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); clearMessages() }}
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
