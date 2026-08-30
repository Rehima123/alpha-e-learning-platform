import { createContext, useContext, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const NavigationContext = createContext()

export function NavigationProvider({ children }) {
  const navigate   = useNavigate()
  const [history, setHistory] = useState([])

  const push = useCallback((path) => {
    setHistory(prev => [...prev, path])
    navigate(path)
  }, [navigate])

  const back = useCallback(() => {
    if (history.length > 0) {
      const newHistory = [...history]
      newHistory.pop()
      setHistory(newHistory)
      navigate(-1)
    } else {
      navigate('/')
    }
  }, [history, navigate])

  const canGoBack = history.length > 0

  return (
    <NavigationContext.Provider value={{ push, back, canGoBack, history }}>
      {children}
    </NavigationContext.Provider>
  )
}

export const useNav = () => {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNav must be inside NavigationProvider')
  return ctx
}
