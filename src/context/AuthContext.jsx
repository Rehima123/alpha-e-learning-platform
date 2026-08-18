import { createContext, useContext, useState, useEffect } from 'react'

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
  const [loading, setLoading] = useState(true)

  // On mount: restore user from stored token
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('currentUser')
    if (token && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('currentUser')
        localStorage.removeItem('authToken')
      }
    }
    setLoading(false)
  }, [])

  const login = async (phoneNumberOrEmail, password) => {
    try {
      // Accept either phone number or email as the identifier
      const identifier = phoneNumberOrEmail
      const body = identifier.includes('@')
        ? { email: identifier, password }
        : { phoneNumber: identifier, password }

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message || 'Login failed' }

      localStorage.setItem('authToken', data.token)
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      setCurrentUser(data.user)
      return { success: true, user: data.user }
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const register = async (userData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message || 'Registration failed' }

      localStorage.setItem('authToken', data.token)
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      setCurrentUser(data.user)
      return { success: true, user: data.user }
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch { /* ignore logout errors */ }
    setCurrentUser(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
  }

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
