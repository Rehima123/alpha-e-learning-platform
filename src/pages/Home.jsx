import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import EnrollmentModal from '../components/EnrollmentModal'

// ── Course Data ───────────────────────────────────────────────────────────────
const NATURAL_COURSES = [
  { code: 'Math 1011', title: 'Applied Mathematics I',        category: 'Natural Science', icon: '📐' },
  { code: 'Phys 1011', title: 'General Physics I',            category: 'Natural Science', icon: '⚛️' },
  { code: 'Chem 1011', title: 'General Chemistry',            category: 'Natural Science', icon: '🧪' },
  { code: 'Bio 1011',  title: 'General Biology',              category: 'Natural Science', icon: '🌿' },
  { code: 'Eng 1011',  title: 'Communicative English I',      category: 'Natural Science', icon: '📖' },
  { code: 'Hsp 1011',  title: 'Critical Thinking & Logic',    category: 'Natural Science', icon: '💡' },
]
const SOCIAL_COURSES = [
  { code: 'Eng 1011',  title: 'Communicative English I',      category: 'Social Science',  icon: '📖' },
  { code: 'Hsp 1011',  title: 'Critical Thinking & Logic',    category: 'Social Science',  icon: '💡' },
  { code: 'Psy 1011',  title: 'General Psychology',           category: 'Social Science',  icon: '🧠' },
  { code: 'Geog 1011', title: 'Introduction to Geography',    category: 'Social Science',  icon: '🌍' },
  { code: 'Econ 1011', title: 'Introduction to Economics',    category: 'Social Science',  icon: '📊' },
  { code: 'Hist 1011', title: 'History of Ethiopia & Horn',   category: 'Social Science',  icon: '📜' },
]

// ── Auto-Popup Banner ─────────────────────────────────────────────────────────
function AutoPopup({ onEnroll, onClose }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-blue-950/40 to-purple-950/30 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-900/40 text-center overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Decorative */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-slate-400 hover:text-white transition-all text-sm">✕</button>

        <div className="relative z-10">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-2xl font-black text-white mb-2">Alpha Freshman Tutorial</h2>
          <p className="text-slate-400 text-sm mb-1">Ethiopian University Freshman Courses</p>
          <div className="inline-block bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-bold px-3 py-1.5 rounded-xl mb-5">
            🎁 ሁሉም ኮርሶች በ1 ምዝገባ!
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            ቪዲዮ ትምህርቶች፣ PDF ማስታወሻዎች፣ እና Offline PWA access — ሁሉም በ1 ዓመት ምዝገባ ያገኛሉ።
          </p>
          <button onClick={onEnroll}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-base hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-purple-900/40 mb-3">
            🚀 አሁኑኑ ይመዝገቡ
          </button>
          <button onClick={onClose} className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
            ኋላ ይመዝገቡ
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Course Row Card ───────────────────────────────────────────────────────────
function CourseRow({ course, onEnroll }) {
  const catColor = course.category === 'Natural Science'
    ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
    : 'bg-purple-500/15 text-purple-300 border-purple-500/20'

  return (
    <div className="group flex items-center gap-4 p-4 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      <div className="text-2xl flex-shrink-0 w-10 text-center">{course.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-400">{course.code}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${catColor}`}>{course.category}</span>
        </div>
        <div className="font-semibold text-white text-sm mt-0.5 truncate">{course.title}</div>
      </div>
      <button onClick={onEnroll}
        className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-all hover:from-blue-600 hover:to-purple-600">
        Enroll →
      </button>
    </div>
  )
}

// ── Stats Counter ─────────────────────────────────────────────────────────────
function StatCard({ value, label, icon }) {
  return (
    <div className="text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

// ── Main Home Page ────────────────────────────────────────────────────────────
export default function Home() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [autoPopupOpen, setAutoPopupOpen]     = useState(false)
  const [activeStream, setActiveStream]       = useState('Natural Science')

  // Auto popup after 3 seconds (only for non-logged-in users)
  useEffect(() => {
    if (currentUser) return
    const timer = setTimeout(() => setAutoPopupOpen(true), 3000)
    return () => clearTimeout(timer)
  }, [currentUser])

  const openEnroll = () => { setAutoPopupOpen(false); setEnrollModalOpen(true) }
  const courses = activeStream === 'Natural Science' ? NATURAL_COURSES : SOCIAL_COURSES

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* ── Auto Popup ── */}
      {autoPopupOpen && <AutoPopup onEnroll={openEnroll} onClose={() => setAutoPopupOpen(false)} />}

      {/* ── Enrollment Modal ── */}
      <EnrollmentModal isOpen={enrollModalOpen} onClose={() => setEnrollModalOpen(false)} />

      {/* ── Sticky Top Header ── */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex-shrink-0">
            Alpha Freshman
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/" className="text-white font-semibold">Home</Link>
            <a href="#courses" className="text-slate-400 hover:text-white transition-colors">Courses</a>
            {currentUser
              ? <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">Dashboard</Link>
              : <Link to="/login" className="text-slate-400 hover:text-white transition-colors">Login</Link>
            }
          </nav>

          {/* Sticky Enroll CTA */}
          <button onClick={openEnroll}
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-sm hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-900/30">
            አሁኑኑ ይመዝገቡ 🚀
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4">

        {/* ── Hero Section ── */}
        <section className="py-16 md:py-24 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-blue-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold px-4 py-2 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Ethiopian Freshman University Courses — 2024/25
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              Freshman ትምህርት<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                በቀላሉ ይማሩ
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              ቪዲዮ ትምህርቶች፣ PDF ማስታወሻዎች እና Offline PWA access — ሁሉም ኮርሶች በ1 ምዝገባ ያገኛሉ።
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button onClick={openEnroll}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-base hover:from-blue-500 hover:to-purple-500 transition-all shadow-2xl shadow-purple-900/40">
                🚀 አሁኑኑ ይመዝገቡ (Enroll Now)
              </button>
              <a href="#courses"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/15 text-white font-bold text-base hover:bg-white/8 transition-all">
                📚 ኮርሶችን ይመልከቱ ↓
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto py-6 border-y border-white/8">
              <StatCard value="1,200+" label="ተማሪዎች"    icon="👥" />
              <StatCard value="12+"    label="ኮርሶች"      icon="📚" />
              <StatCard value="100%"   label="Offline PWA" icon="📱" />
            </div>
          </div>
        </section>

        {/* ── Courses Section ── */}
        <section id="courses" className="pb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">📚 Freshman Courses</h2>
            <p className="text-slate-400 text-sm">ስትሪምዎን ይምረጡ</p>
          </div>

          {/* Stream Tabs */}
          <div className="flex justify-center gap-3 mb-8">
            {['Natural Science', 'Social Science'].map(s => (
              <button key={s} onClick={() => setActiveStream(s)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border
                  ${activeStream === s
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg shadow-purple-900/30'
                    : 'bg-white/4 border-white/10 text-slate-400 hover:text-white hover:bg-white/8'}`}>
                {s === 'Natural Science' ? '🔬' : '📚'} {s}
              </button>
            ))}
          </div>

          {/* Course List */}
          <div className="max-w-2xl mx-auto space-y-3">
            {courses.map(course => (
              <CourseRow key={course.code + course.title} course={course} onEnroll={openEnroll} />
            ))}
          </div>

          {/* CTA after course list */}
          <div className="max-w-2xl mx-auto mt-10 bg-gradient-to-br from-blue-900/30 to-purple-900/20 border border-blue-500/20 rounded-3xl p-8 text-center">
            <h3 className="text-xl font-black text-white mb-3">ሁሉም ኮርሶችን ይዩ 👆</h3>
            <p className="text-slate-400 text-sm mb-6">
              አንዴ ተመዝግበው ሁሉም ኮርሶችን ማግኘት ይችላሉ — ቪዲዮ፣ PDF፣ Offline access ሁሉ ተካቷል።
            </p>
            <button onClick={openEnroll}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-base hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-purple-900/30">
              🚀 አሁኑኑ ይመዝገቡ (Enroll Now)
            </button>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="pb-24">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '🎬', title: 'ቪዲዮ ትምህርቶች', desc: 'ሁሉም ኮርሶች HD ቪዲዮ ትምህርቶች ያካትታሉ' },
              { icon: '📄', title: 'PDF ማስታወሻዎች', desc: 'ዝርዝር ማስታወሻዎች ለ download ዝግጁ ናቸው' },
              { icon: '📱', title: 'Offline PWA', desc: 'Internet ሳይኖር ማጥናት ይችላሉ' },
            ].map(f => (
              <div key={f.title} className="bg-white/4 border border-white/8 rounded-2xl p-6 text-center hover:bg-white/6 transition-colors">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 py-8 text-center text-slate-500 text-sm">
        <p>© 2026 Alpha Freshman Tutorial · Way to Success</p>
        <p className="mt-1">
          <a href="https://t.me/alphafreshman" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
            💬 Telegram Support
          </a>
        </p>
      </footer>

      {/* ── Mobile Sticky CTA ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
        <button onClick={openEnroll}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-base shadow-2xl shadow-purple-900/50">
          🚀 አሁኑኑ ይመዝገቡ (Enroll Now)
        </button>
      </div>
    </div>
  )
}
