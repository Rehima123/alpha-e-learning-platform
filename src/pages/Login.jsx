import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Initialize admin account
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    if (!users.find(u => u.role === 'admin')) {
      users.push({
        id: 1,
        fullName: 'Admin User',
        email: 'admin@alpha.com',
        password: 'admin123',
        role: 'admin',
        subscription: 'none',
        registeredAt: new Date().toISOString()
      })
      localStorage.setItem('users', JSON.stringify(users))
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    const result = login(email, password)
    
    if (result.success) {
      const user = result.user
      if (user.role === 'admin') {
        navigate('/admin')
      } else if (user.role === 'instructor') {
        navigate('/instructor')
      } else if (user.subscription === 'none') {
        navigate('/subscription')
      } else {
        navigate('/courses')
      }
    } else {
      setError(result.error)
    }
  }

  if (currentUser) {
    navigate('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600">
      <Navbar />
      
      <div className="flex items-center justify-center py-12 px-4">
        <div className="card max-w-md w-full p-8">
          <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Login to continue your learning journey
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary w-full">
              Login
            </button>
          </form>
          
          <p className="text-center mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded text-sm">
            <p className="font-semibold">Demo Accounts:</p>
            <p>Admin: admin@alpha.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
