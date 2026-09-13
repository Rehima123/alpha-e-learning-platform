/**
 * ProtectedAdminRoute.jsx
 *
 * Wraps admin-only routes. Redirects:
 *   - Unauthenticated users  → /login
 *   - Non-admin users        → / (home)
 *
 * Admin = role is 'admin', 'super_admin', 'content_admin',
 *         'finance_admin', or 'support_admin'
 *         OR email === 'supportalphafreshman@gmail.com'
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ADMIN_EMAIL = 'supportalphafreshman@gmail.com'
const ADMIN_ROLES = ['admin','super_admin','content_admin','finance_admin','support_admin']

export default function ProtectedAdminRoute({ children }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  // Still validating session — show nothing (avoid flash of wrong page)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent
            rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Checking access...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const isAdminEmail = currentUser.email?.toLowerCase() === ADMIN_EMAIL
  const isAdminRole  = ADMIN_ROLES.includes(currentUser.role)

  // Logged in but not admin
  if (!isAdminEmail && !isAdminRole) {
    return <Navigate to="/" replace />
  }

  return children
}
