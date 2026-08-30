import { createContext, useContext, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const NavHistoryContext = createContext()

// Pages that should NEVER show a back button
const ROOT_PATHS = ['/', '/login', '/register']

export function NavHistoryProvider({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [stack, setStack] = useState([location.pathname])

  // Call this instead of navigate() to maintain history
  const pushView = useCallback((path) => {
    setStack(prev => {
      // Avoid duplicate consecutive entries
      if (prev[prev.length - 1] === path) return prev
      return [...prev, path]
    })
    navigate(path)
  }, [navigate])

  const goBack = useCallback(() => {
    setStack(prev => {
      if (prev.length <= 1) {
        navigate('/')
        return ['/']
      }
      const newStack = prev.slice(0, -1)
      navigate(newStack[newStack.length - 1])
      return newStack
    })
  }, [navigate])

  const canGoBack = stack.length > 1 && !ROOT_PATHS.includes(location.pathname)

  return (
    <NavHistoryContext.Provider value={{ stack, pushView, goBack, canGoBack }}>
      {children}
    </NavHistoryContext.Provider>
  )
}

export function useNavHistory() {
  const ctx = useContext(NavHistoryContext)
  if (!ctx) throw new Error('useNavHistory must be inside NavHistoryProvider')
  return ctx
}
