import { useNavigate, useLocation } from 'react-router-dom'

const NO_BACK_PATHS = ['/', '/login', '/register']

export default function BackButton({ label = 'ተመለስ', className = '' }) {
  const navigate = useNavigate()
  const location = useLocation()

  if (NO_BACK_PATHS.includes(location.pathname)) return null

  return (
    <button
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400
        hover:text-slate-800 dark:hover:text-white transition-colors group ${className}`}
      aria-label="Go back"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round"
        className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      ← {label}
    </button>
  )
}
