import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * AccessGuard — wraps content that requires Active account status.
 * - If not logged in: shows login prompt
 * - If status === 'pending': shows pending approval card
 * - If status === 'active': renders children
 */
export default function AccessGuard({ children, fallback }) {
  const { currentUser } = useAuth()
  const [status, setStatus] = useState('checking') // 'checking' | 'active' | 'pending' | 'unauthenticated'

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api' : '/api'

  useEffect(() => {
    const check = async () => {
      if (!currentUser) { setStatus('unauthenticated'); return }

      const token = localStorage.getItem('authToken')
      if (!token) { setStatus('unauthenticated'); return }

      try {
        // Check if they have any approved manual payment or enrollment
        const [paymentsRes, enrollmentsRes] = await Promise.all([
          fetch(`${API_BASE}/payments/manual-pending?status=approved`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json()).catch(() => ({ payments: [] })),
          fetch(`${API_BASE}/enrollments/my-enrollments`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json()).catch(() => ({ enrollments: [] })),
        ])

        const hasApprovedPayment    = paymentsRes.payments?.some(p => p.status === 'approved')
        const hasApprovedEnrollment = enrollmentsRes.enrollments?.some(e => e.status === 'approved')

        if (hasApprovedPayment || hasApprovedEnrollment) {
          setStatus('active')
        } else {
          setStatus('pending')
        }
      } catch {
        setStatus('pending')
      }
    }
    check()
  }, [currentUser, API_BASE])

  // Checking
  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-slate-400">
          <div className="text-3xl mb-3 animate-spin inline-block">⏳</div>
          <p className="text-sm">Checking access...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (status === 'unauthenticated') {
    return fallback || (
      <div className="bg-white/4 border border-white/10 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-3">🔐</div>
        <h3 className="font-bold text-white mb-2">Login Required</h3>
        <p className="text-slate-400 text-sm">ይህን ይዘት ለመጠቀም መግባት ያስፈልጋል።</p>
      </div>
    )
  }

  // Pending approval
  if (status === 'pending') {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-gradient-to-br from-yellow-900/25 to-orange-900/15 border border-yellow-500/25 rounded-3xl p-8 text-center shadow-2xl shadow-yellow-900/10">
          <div className="text-5xl mb-5">⏳</div>
          <h3 className="text-xl font-black text-white mb-4">ደረሰኝዎ በማረጋገጥ ላይ ነው</h3>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-6">
            <p className="text-yellow-300 text-sm leading-relaxed font-medium">
              የላኩት የባንክ ደረሰኝ በአድሚን እየተረጋገጠ ነው፤<br />
              እንደተረጋገጠ የቪዲዮ እና የ PDF ማስታወሻዎች ይከፈቱልዎታል።
            </p>
          </div>
          <div className="space-y-3 text-left">
            {[
              { icon: '✅', text: 'ምዝገባ ተጠናቀቀ', done: true },
              { icon: '⏳', text: 'ክፍያ ደረሰኝ ለ Admin ተልኳል', done: true },
              { icon: '🔍', text: 'Admin እያረጋገጠ ነው (24hrs ውስጥ)', done: false },
              { icon: '🔓', text: 'ሙሉ access ይከፈታሉ', done: false },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm ${step.done ? 'text-green-400' : 'text-slate-500'}`}>
                <span className="text-base">{step.icon}</span>
                <span>{step.text}</span>
                {step.done && <span className="ml-auto text-green-400 text-xs font-bold">✓</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-6">
            ጥያቄዎ ካሎ:{' '}
            <a href="https://t.me/alphafreshman" target="_blank" rel="noreferrer" className="text-blue-400 underline">
              Telegram Support
            </a>
          </p>
        </div>
      </div>
    )
  }

  // Active — render protected content
  return <>{children}</>
}
