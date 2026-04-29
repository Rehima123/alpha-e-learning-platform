import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem('currentUser')
    if (user) {
      setCurrentUser(JSON.parse(user))
    }
    setLoading(false)
  }, [])

  const login = (email, password) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const user = users.find(u => u.email === email && u.password === password)
    
    if (user) {
      setCurrentUser(user)
      localStorage.setItem('currentUser', JSON.stringify(user))
      return { success: true, user }
    }
    return { success: false, error: 'Invalid credentials' }
  }

  const register = (userData) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    
    if (users.find(u => u.email === userData.email)) {
      return { success: false, error: 'Email already registered' }
    }

    const newUser = {
      id: Date.now(),
      ...userData,
      subscription: 'none',
      registeredAt: new Date().toISOString()
    }

    users.push(newUser)
    localStorage.setItem('users', JSON.stringify(users))
    setCurrentUser(newUser)
    localStorage.setItem('currentUser', JSON.stringify(newUser))
    
    return { success: true, user: newUser }
  }

  const logout = () => {
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
  }

  const updateUser = (updates) => {
    const updatedUser = { ...currentUser, ...updates }
    setCurrentUser(updatedUser)
    localStorage.setItem('currentUser', JSON.stringify(updatedUser))
    
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const index = users.findIndex(u => u.id === currentUser.id)
    if (index !== -1) {
      users[index] = updatedUser
      localStorage.setItem('users', JSON.stringify(users))
    }
  }

  const value = {
    currentUser,
    login,
    register,
    logout,
    updateUser,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
