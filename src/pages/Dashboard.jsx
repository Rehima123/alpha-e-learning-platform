import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ── Inline SVG Icons (no external dep) ───────────────────────────────────────
const Icon = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  BookOpen: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  CreditCard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  MessageCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
}

// ── Static freshman courses ───────────────────────────────────────────────────
const FRESHMAN_COURSES = [
  { id: 'eng1',  code: 'Eng 1011', title: 'Communicative English I',         icon: '📖', videos: 32, pdfs: 8,  color: 'from-blue-500 to-blue-700' },
  { id: 'math1', code: 'Math 1011', title: 'Mathematics for Natural Science', icon: '📐', videos: 28, pdfs: 12, color: 'from-purple-500 to-purple-700' },
  { id: 'phys1', code: 'Phys 1011', title: 'General Physics I',              icon: '⚛️', videos: 30, pdfs: 10, color: 'from-cyan-500 to-cyan-700' },
  { id: 'chem1', code: 'Chem 1011', title: 'General Chemistry',              icon: '🧪', videos: 26, pdfs: 9,  color: 'from-green-500 to-green-700' },
  { id: 'psy1',  code: 'Psy 1011',  title: 'General Psychology',             icon: '🧠', videos: 24, pdfs: 7,  color: 'from-pink-500 to-pink-700' },
  { id: 'logic1',code: 'Hsp 1011',  title: 'Critical Thinking & Logic',      icon: '💡', videos: 22, pdfs: 6,  color: 'from-orange-500 to-orange-700' },
  { id: 'bio1',  code: 'Bio 1011',  title: 'General Biology',                icon: '🌿', videos: 28, pdfs: 8,  color: 'from-teal-500 to-teal-700' },
  { id: 'geo1',  code: 'Geog 1011', title: 'Introduction to Geography',      icon: '🌍', videos: 20, pdfs: 6,  color: 'from-yellow-500 to-yellow-700' },
]

// ── Progress Bar Component ────────────────────────────────────────────────────
function ProgressBar({ value, colorClass = 'bg-gradient-to-r from-blue-500 to-purple-600' }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ── Course Card Component ─────────────────────────────────────────────────────
function CourseCard({ course, enrollment, onContinue }) {
  const progress = enrollment ? Math.round(enrollment.progress || 0) : 0
  const isEnrolled = !!enrollment
  const isCompleted = progress >= 100

  return (
    <div className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 hover:shadow-xl hover:shadow-purple-900/20 transition-all duration-300 hover:-translate-y-1">
      {/* Card Header */}
      <div className={`bg-gradient-to-br ${course.color} p-5 relative overflow-hidden`}>
        <div className="absolute -top-4 -right-4 text-6xl opacity-20 select-none">{course.icon}</div>
        <div className="relative z-10">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">
            {course.code}
          </span>
          <h3 className="text-white font-bold text-base leading-tight">{course.title}</h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Icon.Play />
            <span>{course.videos} ቪዲዮዎች</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Icon.FileText />
            <span>{course.pdfs} PDFs</span>
          </span>
        </div>

        {/* Progress */}
        {isEnrolled ? (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Progress</span>
              <span className={`font-bold ${isCompleted ? 'text-green-400' : 'text-blue-400'}`}>{progress}%</span>
            </div>
            <ProgressBar value={progress} colorClass={isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-purple-600'} />
            <div className="flex items-center gap-1.5 mt-1.5">
              {isCompleted
                ? <><Icon.CheckCircle /><span className="text-green-400 text-xs font-medium">ተጠናቋል!</span></>
                : <><Icon.Clock /><span className="text-slate-500 text-xs">{enrollment?.completedLessons?.length || 0} / {enrollment?.course?.totalLessons || '?'} ትምህርቶች</span></>
              }
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">ገና አልተመዘገቡም</span>
              <span className="text-slate-500">0%</span>
            </div>
            <ProgressBar value={0} />
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => onContinue(course)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200
            ${isEnrolled
              ? isCompleted
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-purple-900/30'
              : 'bg-white/8 text-slate-300 hover:bg-white/12 border border-white/10'
            }`}
        >
          {isCompleted ? (
            <><Icon.CheckCircle /><span>ክለሳ</span></>
          ) : isEnrolled ? (
            <><Icon.Play /><span>ትምህርቱን ቀጥል</span><Icon.ArrowRight /></>
          ) : (
            <><span>ለመማር ይመዝገቡ</span><Icon.ArrowRight /></>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Quick Action Card ─────────────────────────────────────────────────────────
function QuickAction({ icon, label, sublabel, onClick, gradient }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} hover:scale-105 hover:shadow-lg transition-all duration-200 text-left w-full group`}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-white font-semibold text-sm">{label}</div>
        {sublabel && <div className="text-white/60 text-xs mt-0.5">{sublabel}</div>}
      </div>
      <Icon.ArrowRight className="ml-auto text-white/40 group-hover:text-white/80 transition-colors" />
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Student Dashboard
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab]       = useState('home')
  const [searchQuery, setSearchQuery]   = useState('')
  const [enrollments, setEnrollments]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [notifOpen, setNotifOpen]       = useState(false)
  const [profileOpen, setProfileOpen]   = useState(false)

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api' : '/api'

  // Load enrollments
  const loadEnrollments = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return
      const res = await fetch(`${API_BASE}/enrollments/my-enrollments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) setEnrollments(data.enrollments || [])
    } catch (err) {
      console.error('Failed to load enrollments:', err)
    } finally {
      setLoading(false)
    }
  }, [API_BASE])

  useEffect(() => { loadEnrollments() }, [loadEnrollments])

  // Derived stats
  const approvedEnrollments = enrollments.filter(e => e.status === 'approved')
  const totalCourses        = approvedEnrollments.length
  const completedCourses    = approvedEnrollments.filter(e => (e.progress || 0) >= 100).length
  const overallProgress     = totalCourses > 0
    ? Math.round(approvedEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / totalCourses)
    : 0

  // Enrollment lookup helper
  const getEnrollment = (courseId) =>
    approvedEnrollments.find(e =>
      (e.course?._id || e.course) === courseId ||
      (e.course?.title || '').toLowerCase().includes(courseId.toLowerCase())
    )

  // Filter courses
  const filteredCourses = FRESHMAN_COURSES.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Course continue handler
  const handleContinueCourse = (course) => {
    const enrollment = getEnrollment(course.id)
    if (enrollment?.course?._id) {
      navigate(`/course/${enrollment.course._id}`)
    } else {
      navigate('/courses')
    }
  }

  // User initials
  const initials = (currentUser?.fullName || 'S').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const firstName = currentUser?.fullName?.split(' ')[0] || 'ተማሪ'

  // Current semester
  const now = new Date()
  const month = now.getMonth() + 1
  const term = month >= 9 || month <= 1 ? 'የመጀመሪያ ሴሚስተር' : 'ሁለተኛ ሴሚስተር'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white pb-20 md:pb-0">

      {/* ── Top Navigation ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-white/8 shadow-xl shadow-black/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 h-16">

            {/* Logo */}
            <Link to="/" className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 text-lg whitespace-nowrap hidden sm:block">
              Alpha Freshman
            </Link>

            {/* Search Bar */}
            <div className="flex-1 relative max-w-md mx-auto">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon.Search />
              </div>
              <input
                type="text"
                placeholder="ትምህርት ፈልግ..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setActiveTab('home') }}
                className="w-full bg-white/6 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
                  className="p-2 rounded-xl bg-white/6 hover:bg-white/12 transition-colors relative"
                >
                  <Icon.Bell />
                  {enrollments.filter(e => e.status === 'pending').length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl p-4 text-sm">
                    <div className="font-bold mb-3 text-base">🔔 ማሳወቂያዎች</div>
                    {enrollments.filter(e => e.status === 'pending').length > 0 ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-300 text-xs">
                        ⏳ {enrollments.filter(e => e.status === 'pending').length} enrollment request(s) pending admin approval
                      </div>
                    ) : (
                      <p className="text-slate-400 text-center py-2">አዲስ ማሳወቂያ የለም</p>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Avatar */}
              <div className="relative">
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-lg hover:scale-105 transition-transform"
                >
                  {initials}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-sm">
                    <div className="p-4 border-b border-white/8">
                      <div className="font-bold">{currentUser?.fullName}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{currentUser?.email}</div>
                      <span className="inline-block mt-1.5 bg-blue-500/15 text-blue-400 text-xs px-2 py-0.5 rounded-lg">
                        {currentUser?.role || 'student'}
                      </span>
                    </div>
                    <Link to="/courses" className="flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors">
                      <Icon.BookOpen /> Courses
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/8 transition-colors"
                    >
                      <span>🚪</span> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 group transition-colors"
        >
          <Icon.ChevronLeft />
          <span className="group-hover:underline">ወደ ኋላ</span>
        </button>

        {/* ── Welcome Banner ──────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-slate-900/0 border border-blue-500/20 rounded-3xl p-6 md:p-8 mb-8 overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">👋</span>
                <span className="text-sm text-slate-400">እንኳን ደህና መጣህ/ሽ,</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
                {firstName}!
              </h1>

              {/* Status Pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Account: Active (Full Access)
                </span>
                <span className="bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-xl">
                  📅 {term} · {now.getFullYear()}
                </span>
              </div>

              <p className="text-slate-400 text-sm">
                በዚህ ሴሚስተር ከ <span className="text-white font-semibold">{FRESHMAN_COURSES.length}</span> ትምህርቶች ውስጥ{' '}
                <span className="text-blue-400 font-semibold">{totalCourses}</span> ተመዝግበዋል።
              </p>
            </div>

            {/* Overall Progress Ring */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="48" cy="48" r="38" fill="none"
                    stroke="url(#progressGrad)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - overallProgress / 100)}`}
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">{overallProgress}%</span>
                </div>
              </div>
              <span className="text-xs text-slate-400 text-center">Overall<br/>Progress</span>
            </div>
          </div>

          {/* Mini Stats Row */}
          <div className="relative z-10 grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/8">
            {[
              { label: 'ምዝገቦች',    value: totalCourses,    icon: '📚' },
              { label: 'ተጠናቅቃለሁ', value: completedCourses, icon: '✅' },
              { label: 'በሂደት',     value: totalCourses - completedCourses, icon: '⏳' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-lg mb-0.5">{stat.icon}</div>
                <div className="text-xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Courses Section ─────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">
              {searchQuery ? `ፍለጋ: "${searchQuery}"` : '📚 የፍሬሽማን ትምህርቶች'}
            </h2>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                ×  አጥፋ
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/5 border border-white/8 rounded-2xl h-52 animate-pulse" />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-4xl mb-3">🔍</div>
              <p>"{searchQuery}" ለሚለው ፍለጋ ምንም ትምህርት አልተገኘም።</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCourses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={getEnrollment(course.id)}
                  onContinue={handleContinueCourse}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Quick Access Section ────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold mb-4">⚡ ፈጣን መዳረሻ</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            <QuickAction
              icon="📥"
              label="Downloaded Videos & PDFs"
              sublabel="Offline ሆነው ያሉ ሃብቶች"
              gradient="from-blue-600/20 to-blue-900/20 hover:from-blue-600/30"
              onClick={() => navigate('/offline')}
            />
            <QuickAction
              icon="💳"
              label="Payment Receipt"
              sublabel="Account Settings"
              gradient="from-purple-600/20 to-purple-900/20 hover:from-purple-600/30"
              onClick={() => navigate('/payment')}
            />
            <QuickAction
              icon="💬"
              label="Support / Telegram"
              sublabel="ጥያቄዎ ካሎ ያግኙን"
              gradient="from-teal-600/20 to-teal-900/20 hover:from-teal-600/30"
              onClick={() => window.open('https://t.me/alphafreshman', '_blank')}
            />
          </div>
        </section>
      </main>

      {/* ── Mobile Bottom Navigation (PWA Style) ──────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {[
            { id: 'home',     label: 'ዳሽቦርድ',   icon: <Icon.Home />,     action: () => { setActiveTab('home'); setSearchQuery('') } },
            { id: 'courses',  label: 'ትምህርቶቼ',  icon: <Icon.BookOpen />, action: () => { setActiveTab('courses'); navigate('/courses') } },
            { id: 'offline',  label: 'Downloads', icon: <Icon.Download />, action: () => { setActiveTab('offline'); navigate('/offline') } },
            { id: 'profile',  label: 'መገለጫ',    icon: <Icon.User />,     action: () => setActiveTab('profile') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 min-w-0
                ${activeTab === tab.id
                  ? 'text-blue-400 bg-blue-500/15'
                  : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {tab.icon}
              <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Click-outside close for dropdowns */}
      {(notifOpen || profileOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setNotifOpen(false); setProfileOpen(false) }}
        />
      )}
    </div>
  )
}
