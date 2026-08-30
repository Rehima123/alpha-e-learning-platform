import { useState, useEffect, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

const ALL_COURSES = [
  { id:"eng1",  code:"Eng 1011",  title:"Communicative English I",        icon:"book",  videos:32, pdfs:8,  cat:"semester1", isPremium:false },
  { id:"math1", code:"Math 1011", title:"Mathematics for Natural Science", icon:"math",  videos:28, pdfs:12, cat:"natural",   isPremium:true  },
  { id:"phys1", code:"Phys 1011", title:"General Physics I",              icon:"atom",  videos:30, pdfs:10, cat:"natural",   isPremium:true  },
  { id:"chem1", code:"Chem 1011", title:"General Chemistry",              icon:"flask", videos:26, pdfs:9,  cat:"natural",   isPremium:false },
  { id:"psy1",  code:"Psy 1011",  title:"General Psychology",             icon:"brain", videos:24, pdfs:7,  cat:"social",    isPremium:false },
  { id:"logic1",code:"Hsp 1011",  title:"Critical Thinking and Logic",    icon:"bulb",  videos:22, pdfs:6,  cat:"semester1", isPremium:false },
  { id:"bio1",  code:"Bio 1011",  title:"General Biology",                icon:"leaf",  videos:28, pdfs:8,  cat:"natural",   isPremium:true  },
  { id:"geo1",  code:"Geog 1011", title:"Introduction to Geography",      icon:"globe", videos:20, pdfs:6,  cat:"social",    isPremium:false },
  { id:"econ1", code:"Econ 1011", title:"Introduction to Economics",      icon:"chart", videos:18, pdfs:5,  cat:"social",    isPremium:true  },
  { id:"hist1", code:"Hist 1011", title:"History of Ethiopia and Horn",   icon:"scroll",videos:20, pdfs:7,  cat:"semester2", isPremium:false },
]

const ICON_MAP = { book:"📖", math:"📐", atom:"⚛️", flask:"🧪", brain:"🧠", bulb:"💡", leaf:"🌿", globe:"🌍", chart:"📊", scroll:"📜" }
const CATS = [
  { id:"all",       label:"ሁሉም" },
  { id:"semester1", label:"Semester 1" },
  { id:"semester2", label:"Semester 2" },
  { id:"natural",   label:"🔬 Natural" },
  { id:"social",    label:"📚 Social" },
]

function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, value || 0))
  return (
    <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-700"
        style={{ width: pct + "%" }} />
    </div>
  )
}


function CourseCard({ course, enrollment, hasAccess, onContinue }) {
  const progress   = enrollment ? Math.round(enrollment.progress || 0) : 0
  const isEnrolled = !!enrollment
  const isComplete = progress >= 100
  const locked     = course.isPremium && !hasAccess && !isEnrolled
  const emoji      = ICON_MAP[course.icon] || "📚"

  return (
    <div className={"group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1" + (locked ? " opacity-70" : "")}>
      {locked && (
        <div className="absolute inset-0 z-10 bg-black/40 rounded-2xl flex flex-col items-center justify-center text-white">
          <div className="text-3xl mb-1">🔒</div>
          <p className="text-xs font-bold">Premium</p>
          <p className="text-xs opacity-70">ምዝገባ ያስፈልጋል</p>
        </div>
      )}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-600" />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl flex-shrink-0">{emoji}</span>
          <div className="min-w-0">
            <p className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{course.code}</p>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight mt-0.5 line-clamp-2">{course.title}</h3>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-slate-400 mb-3">
          <span>▶ {course.videos} ቪዲዮ</span>
          <span>📄 {course.pdfs} PDF</span>
        </div>
        {isEnrolled && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Progress</span>
              <span className={"font-bold " + (isComplete ? "text-green-500" : "text-blue-500")}>{progress}%</span>
            </div>
            <ProgressBar value={progress} />
            <p className="text-xs text-slate-400 mt-1">{enrollment.completedLessons?.length || 0} / {enrollment.course?.totalLessons || "?"} lessons</p>
          </div>
        )}
        {!locked && (
          <button onClick={() => onContinue(course, enrollment)}
            className={"w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 " +
              (isComplete
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : isEnrolled
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-md"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600")}>
            {isComplete ? "✓ ክለሳ" : isEnrolled ? "▶ ትምህርቱን ቀጥል" : "ይመዝገቡ →"}
          </button>
        )}
      </div>
    </div>
  )
}


export default function Dashboard() {
  const { currentUser, logout } = useAuth()
  const { theme, toggleTheme }  = useTheme()
  const navigate = useNavigate()

  const [activeTab,    setActiveTab]    = useState("home")
  const [searchQuery,  setSearchQuery]  = useState("")
  const [activeCategory, setActiveCat] = useState("all")
  const [enrollments,  setEnrollments]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [hasAccess,    setHasAccess]    = useState(false)

  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/api" : "/api"

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("authToken")
    if (!token) return
    try {
      const [enrRes, payRes] = await Promise.all([
        fetch(API_BASE + "/enrollments/my-enrollments", { headers: { Authorization: "Bearer " + token } }).then(r => r.json()).catch(() => ({ enrollments: [] })),
        fetch(API_BASE + "/payments/manual-pending?status=approved", { headers: { Authorization: "Bearer " + token } }).then(r => r.json()).catch(() => ({ payments: [] })),
      ])
      const approvedEnr = (enrRes.enrollments || []).filter(e => e.status === "approved")
      setEnrollments(approvedEnr)
      setHasAccess(approvedEnr.length > 0 || (payRes.payments || []).length > 0)
    } catch {}
    setLoading(false)
  }, [API_BASE])

  useEffect(() => { loadData() }, [loadData])

  const getEnrollment = (courseId) =>
    enrollments.find(e => (e.course?._id || e.course) === courseId || (e.course?.title || "").toLowerCase().includes(courseId))

  const filteredCourses = ALL_COURSES.filter(c => {
    const matchSearch = !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat = activeCategory === "all" || c.cat === activeCategory
    return matchSearch && matchCat
  })

  const totalProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (e.progress || 0), 0) / enrollments.length) : 0
  const completed = enrollments.filter(e => (e.progress || 0) >= 100).length
  const pending   = [] // pending enrollments if any

  const initials  = (currentUser?.fullName || "S").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
  const firstName = currentUser?.fullName?.split(" ")[0] || "ተማሪ"
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? "እንኳን ደህና ነጋህ/ሽ" : hour < 17 ? "እንኳን ደህና አደርህ/ሽ" : "እንኳን ደህና መጣህ/ሽ"
  const month     = new Date().getMonth() + 1
  const term      = (month >= 9 || month <= 1) ? "የመጀመሪያ ሴሚስተር" : "ሁለተኛ ሴሚስተር"

  const handleContinue = (course, enrollment) => {
    if (enrollment?.course?._id) navigate("/course/" + enrollment.course._id)
    else navigate("/courses")
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white pb-20 md:pb-6">

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-white/8 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 h-16">
            <Link to="/" className="font-black text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:block whitespace-nowrap">
              Alpha Freshman
            </Link>
            <div className="flex-1 relative max-w-sm mx-auto">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" placeholder="ትምህርት ፈልግ..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all" />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={toggleTheme}
                className="p-2 rounded-xl bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors text-gray-600 dark:text-gray-300">
                {theme === "dark"
                  ? <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                  : <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                }
              </button>
              <div className="relative">
                <button onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-white/8 hover:bg-gray-200 dark:hover:bg-white/15 transition-colors relative">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                  {pending.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-4 text-sm z-50">
                    <p className="font-bold mb-2">🔔 ማሳወቂያዎች</p>
                    <p className="text-gray-400 text-xs text-center py-3">አዲስ ማሳወቂያ የለም</p>
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white shadow hover:scale-105 transition-transform">
                  {initials}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden text-sm z-50">
                    <div className="p-4 border-b border-gray-100 dark:border-white/8">
                      <p className="font-bold">{currentUser?.fullName}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{currentUser?.email}</p>
                    </div>
                    <button onClick={() => { logout(); navigate("/login") }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <span>��</span> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* Back Button */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white mb-5 group transition-colors">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="15 18 9 12 15 6"/></svg>
          ← ወደ ኋላ
        </button>

        {/* ── Welcome Banner ── */}
        <div className="relative bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-6 md:p-8 mb-7 overflow-hidden shadow-xl text-white">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/8 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p className="text-blue-100 text-sm mb-1">{greeting},</p>
              <h1 className="text-2xl md:text-3xl font-black mb-3">{firstName}! 👋</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={"text-xs font-bold px-3 py-1.5 rounded-xl " + (hasAccess ? "bg-green-500/20 border border-green-400/30 text-green-200" : "bg-yellow-500/20 border border-yellow-400/30 text-yellow-200")}>
                  {hasAccess ? "✅ Active — Full Access" : "⏳ Pending Verification"}
                </span>
                <span className="bg-white/15 text-xs font-bold px-3 py-1.5 rounded-xl border border-white/20">📅 {term} · {new Date().getFullYear()}</span>
              </div>
              <p className="text-blue-100 text-sm">{ALL_COURSES.length} ኮርሶች ዝግጁ · <span className="text-white font-bold">{enrollments.length}</span> ምዝገባ</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8"/>
                  <circle cx="48" cy="48" r="38" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 38}
                    strokeDashoffset={2 * Math.PI * 38 * (1 - totalProgress / 100)}
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-black">{totalProgress}%</span>
                </div>
              </div>
              <span className="text-xs text-blue-200 text-center">Overall<br/>Progress</span>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/15">
            {[{label:"ምዝገቦች", value:enrollments.length, icon:"📚"}, {label:"ተጠናቅቃለሁ", value:completed, icon:"✅"}, {label:"በሂደት", value:enrollments.length - completed, icon:"⏳"}].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-base mb-0.5">{s.icon}</div>
                <div className="text-xl font-black">{s.value}</div>
                <div className="text-xs text-blue-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Category Filters ── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {CATS.map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className={"px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border " +
                (activeCategory === c.id
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500")}>
              {c.label}
            </button>
          ))}
        </div>

        {/* ── Courses Grid ── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {searchQuery ? "ፍለጋ: \"" + searchQuery + "\"" : "📚 Freshman Courses"}
            </h2>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">× አጥፋ</button>
            )}
          </div>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-52 rounded-2xl bg-gray-200 dark:bg-white/5 animate-pulse" />)}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🔍</div>
              <p>"{searchQuery}" ለሚለው ፍለጋ ምንም ኮርስ አልተገኘም።</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCourses.map(course => (
                <CourseCard key={course.id} course={course}
                  enrollment={getEnrollment(course.id)}
                  hasAccess={hasAccess}
                  onContinue={handleContinue} />
              ))}
            </div>
          )}
        </section>

        {/* ── Quick Access ── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">⚡ ፈጣን መዳረሻ</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon:"📥", label:"Downloaded Videos & PDFs", sub:"Offline ሆነው ያሉ ሃብቶች", onClick:() => navigate("/offline"), bg:"from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/30" },
              { icon:"💳", label:"Payment Receipt", sub:"Account Settings", onClick:() => navigate("/payment"), bg:"from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700/30" },
              { icon:"💬", label:"Support / Telegram", sub:"ጥያቄዎ ካሎ ያግኙን", onClick:() => window.open("https://t.me/alphafreshman","_blank"), bg:"from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200 dark:border-teal-700/30" },
            ].map(a => (
              <button key={a.label} onClick={a.onClick}
                className={"flex items-center gap-3 p-4 rounded-2xl border text-left bg-gradient-to-br hover:scale-105 hover:shadow-md transition-all duration-200 " + a.bg}>
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-gray-800 dark:text-white">{a.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{a.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 shadow-lg">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {[
            { id:"home",    label:"ዳሽቦርድ",  emoji:"🏠", action:() => setActiveTab("home") },
            { id:"courses", label:"ትምህርቶቼ", emoji:"📚", action:() => { setActiveTab("courses"); navigate("/courses") } },
            { id:"offline", label:"Downloads", emoji:"📥", action:() => { setActiveTab("offline"); navigate("/offline") } },
            { id:"profile", label:"መገለጫ",   emoji:"👤", action:() => setActiveTab("profile") },
          ].map(tab => (
            <button key={tab.id} onClick={tab.action}
              className={"flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 " +
                (activeTab === tab.id ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15" : "text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300")}>
              <span className="text-xl">{tab.emoji}</span>
              <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Close dropdowns on outside click */}
      {(notifOpen || profileOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setNotifOpen(false); setProfileOpen(false) }} />
      )}
    </div>
  )
}

