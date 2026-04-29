import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="bg-secondary text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-bold">
            Alpha Freshman Tutorial
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-gray-300 transition">Home</Link>
            <Link to="/courses" className="hover:text-gray-300 transition">Courses</Link>
            
            {currentUser ? (
              <>
                <Link to="/dashboard" className="hover:text-gray-300 transition">My Learning</Link>
                {currentUser.role === 'instructor' && (
                  <Link to="/instructor" className="hover:text-gray-300 transition">My Courses</Link>
                )}
                {currentUser.role === 'admin' && (
                  <Link to="/admin" className="hover:text-gray-300 transition">Admin</Link>
                )}
                <span className="text-sm">👤 {currentUser.fullName}</span>
                <button onClick={logout} className="btn bg-danger hover:bg-red-600">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn bg-white text-secondary hover:bg-gray-100">
                  Login
                </Link>
                <Link to="/register" className="btn btn-success">
                  Sign Up
                </Link>
              </>
            )}
            
            <button
              onClick={toggleTheme}
              className="text-2xl hover:scale-110 transition-transform"
              title="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
