import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ADMIN_ROLES = ['admin', 'super_admin', 'content_admin', 'finance_admin', 'support_admin']

export default function ProtectedRoute({ children, role }) {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-2xl text-white animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" />
  }

  // Admin role check — accept all admin variants
  if (role === 'admin' && !ADMIN_ROLES.includes(currentUser.role)) {
    return <Navigate to="/" />
  }

  // Specific non-admin role check
  if (role && role !== 'admin' && currentUser.role !== role) {
    return <Navigate to="/" />
  }

  return children
}
