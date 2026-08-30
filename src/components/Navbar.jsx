import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNavHistory } from '../context/NavHistoryContext'

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const { theme, toggleTheme }  = useTheme()
  const { canGoBack, goBack }   = useNavHistory()
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = useState(false)

  const initials  = currentUser
    ? (currentUser.fullName || currentUser.email || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : ''
  const firstName = currentUser?.fullName?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Student'

  const handleLogout = async () => {
    setProfileOpen(false)
    try { await logout() } catch {}
    navigate('/login')
  }

  return (
    <nav className="bg-slate-900 dark:bg-slate-950 text-white shadow-xl border-b border-white/8 sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center h-16 gap-3">

          {/* ── Back Button (stack-based) ── */}
          {canGoBack && (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white
                bg-white/8 hover:bg-white/15 px-3 py-1.5 rounded-xl transition-all group mr-1"
              title="Go back"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              <span className="hidden sm:inline">← ተመለስ</span>
            </button>
          )}

          {/* ── Logo ── */}
          <Link to="/"
            className="font-black text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
            Alpha Freshman
          </Link>

          {/* ── Nav Links (desktop) ── */}
          <nav className="hidden md:flex items-center gap-5 text-sm ml-4">
            <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
            {currentUser && (
              <Link to="/dashboard" className="text-slate-300 hover:text-white transition-colors">
                My Learning
              </Link>
            )}
            {currentUser?.role === 'instructor' && (
              <Link to="/instructor" className="text-slate-300 hover:text-white transition-colors">
                My Courses
              </Link>
            )}
            {['admin','super_admin','content_admin','finance_admin','support_admin'].includes(currentUser?.role) && (
              <Link to="/admin" className="text-slate-300 hover:text-white transition-colors">
                Admin
              </Link>
            )}
          </nav>

          {/* ── Right Side ── */}
          <div className="flex items-center gap-2 ml-auto">

            {/* Welcome greeting (desktop) */}
            {currentUser && (
              <span className="hidden lg:inline text-xs text-slate-400 font-medium whitespace-nowrap">
                Welcome, <span className="text-white font-semibold">{firstName}</span>!
              </span>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/8 hover:bg-white/15 transition-colors text-slate-300 hover:text-white"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              }
            </button>

            {/* Auth section */}
            {currentUser ? (
              // ── Single Profile Avatar Dropdown ──
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(o => !o)}
                  className="flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10
                    rounded-xl pl-1.5 pr-3 py-1.5 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600
                    flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                    {initials}
                  </div>
                  <span className="text-sm font-semibold text-white hidden sm:inline max-w-[100px] truncate">
                    {firstName}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {profileOpen && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-white/10
                      rounded-2xl shadow-2xl overflow-hidden z-50">
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-white/8">
                        <p className="font-bold text-white text-sm">{currentUser.fullName || firstName}</p>
                        <p className="text-slate-400 text-xs mt-0.5 truncate">{currentUser.email || ''}</p>
                        <span className="inline-block mt-1.5 bg-blue-500/15 text-blue-400 text-[10px]
                          font-bold px-2 py-0.5 rounded-lg capitalize">
                          {currentUser.role || 'student'}
                        </span>
                      </div>
                      {/* Links */}
                      <Link to="/dashboard" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300
                          hover:bg-white/5 hover:text-white transition-colors">
                        <span>📊</span> My Dashboard
                      </Link>
                      {currentUser.role === 'instructor' && (
                        <Link to="/instructor" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300
                            hover:bg-white/5 hover:text-white transition-colors">
                          <span>🎓</span> Instructor Panel
                        </Link>
                      )}
                      {['admin','super_admin','content_admin','finance_admin','support_admin'].includes(currentUser.role) && (
                        <Link to="/admin" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300
                            hover:bg-white/5 hover:text-white transition-colors">
                          <span>⚙️</span> Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-white/8 mt-1" />
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400
                          hover:bg-red-500/8 transition-colors">
                        <span>🚪</span> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Not logged in
              <div className="flex items-center gap-2">
                <Link to="/login"
                  className="px-4 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 text-sm font-semibold
                    text-white transition-all border border-white/10">
                  Login
                </Link>
                <Link to="/register"
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600
                    hover:from-blue-500 hover:to-purple-500 text-sm font-bold text-white transition-all shadow">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
