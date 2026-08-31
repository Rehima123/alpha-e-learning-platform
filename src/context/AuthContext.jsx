import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext()

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading]         = useState(true)

  // ── Verify token with server on every mount ─────────────────────────────────
  // This fixes the mobile "stale session" problem — instead of trusting
  // localStorage blindly, we always re-validate with the server on app load.
  useEffect(() => {
    const validateSession = async () => {
      const token      = localStorage.getItem('authToken')
      const storedUser = localStorage.getItem('currentUser')

      // No token stored — not logged in
      if (!token || !storedUser) {
        setLoading(false)
        return
      }

      // Firebase tokens (Google OAuth fallback) — trust localStorage
      if (token.startsWith('firebase-')) {
        try {
          setCurrentUser(JSON.parse(storedUser))
        } catch {
          localStorage.removeItem('currentUser')
          localStorage.removeItem('authToken')
        }
        setLoading(false)
        return
      }

      // Backend JWT — always validate with server (fixes mobile stale state)
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          // No cache — always get fresh user state
          cache: 'no-store'
        })

        if (res.ok) {
          const data = await res.json()
          const freshUser = data.user || data
          // Update localStorage with latest server data (role, subscription, etc.)
          localStorage.setItem('currentUser', JSON.stringify(freshUser))
          setCurrentUser(freshUser)
        } else {
          // Token invalid/expired — clear session silently
          localStorage.removeItem('authToken')
          localStorage.removeItem('currentUser')
          setCurrentUser(null)
        }
      } catch {
        // Network error — fall back to stored user so app still works offline
        try {
          setCurrentUser(JSON.parse(storedUser))
        } catch {
          localStorage.removeItem('currentUser')
          localStorage.removeItem('authToken')
        }
      } finally {
        setLoading(false)
      }
    }

    validateSession()
  }, [])

  const login = async (phoneNumberOrEmail, password) => {
    try {
      const identifier = phoneNumberOrEmail
      const body = identifier.includes('@')
        ? { email: identifier, password }
        : { phoneNumber: identifier, password }

      const res  = await fetch(`${API_BASE_URL}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message || 'Login failed' }

      localStorage.setItem('authToken',    data.token)
      localStorage.setItem('currentUser',  JSON.stringify(data.user))
      setCurrentUser(data.user)
      return { success: true, user: data.user }
    } catch {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const register = async (userData) => {
    try {
      const res  = await fetch(`${API_BASE_URL}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(userData)
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message || 'Registration failed' }

      localStorage.setItem('authToken',   data.token)
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      setCurrentUser(data.user)
      return { success: true, user: data.user }
    } catch {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token && !token.startsWith('firebase-')) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch { /* ignore logout errors */ }
    setCurrentUser(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
  }

  // Refresh user data from server (call after payment/enrollment changes)
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('authToken')
    if (!token || token.startsWith('firebase-')) return
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache:   'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        const freshUser = data.user || data
        localStorage.setItem('currentUser', JSON.stringify(freshUser))
        setCurrentUser(freshUser)
      }
    } catch { /* ignore */ }
  }, [])

  const value = {
    currentUser,
    login,
    register,
    logout,
    refreshUser,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
