import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  })
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    const result = register({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
      role: formData.role
    })
    
    if (result.success) {
      if (formData.role === 'instructor') {
        navigate('/instructor')
      } else {
        navigate('/subscription')
      }
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600">
      <Navbar />
      
      <div className="flex items-center justify-center py-12 px-4">
        <div className="card max-w-md w-full p-8">
          <h2 className="text-3xl font-bold text-center mb-2">Create Account</h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Start your learning journey today
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 font-medium">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="input"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="input"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="input"
                placeholder="At least 6 characters"
                required
              />
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="input"
                placeholder="Confirm your password"
                required
              />
            </div>
            
            <div>
              <label className="block mb-2 font-medium">Register as</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="input"
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>
            
            <button type="submit" className="btn btn-primary w-full">
              Create Account
            </button>
          </form>
          
          <p className="text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
