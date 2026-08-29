import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending_verification: { label: '⏳ Pending', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
    approved:             { label: '✅ Approved', cls: 'bg-green-500/15 text-green-400 border-green-500/25' },
    rejected:             { label: '❌ Rejected', cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
  }
  const s = map[status] || { label: status, cls: 'bg-white/10 text-slate-300 border-white/15' }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ── Receipt Lightbox ──────────────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all text-lg">✕</button>
      <img src={src} alt="Receipt" className="max-w-2xl max-h-[85vh] w-full object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
    </div>
  )
}

// ── Main AdminApproval Component ──────────────────────────────────────────────
export default function AdminApproval() {
  const { currentUser } = useAuth()
  const [payments, setPayments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('pending_verification')
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [toast, setToast]           = useState(null)
  const [rejectId, setRejectId]     = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api' : '/api'

  const getToken = () => localStorage.getItem('authToken')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/payments/manual-pending?status=${filter}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (data.success) setPayments(data.payments || [])
    } catch (err) {
      console.error('Failed to load payments:', err)
    } finally {
      setLoading(false)
    }
  }, [API_BASE, filter])

  useEffect(() => { loadPayments() }, [loadPayments])

  const approvePayment = async (id, studentName) => {
    setActionLoading(prev => ({ ...prev, [id]: 'approving' }))
    try {
      const res = await fetch(`${API_BASE}/payments/manual-receipt/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (data.success) {
        showToast(`✅ ${studentName} — Approved & access granted!`)
        loadPayments()
      } else {
        showToast(data.message || 'Failed to approve', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }))
    }
  }

  const rejectPayment = async () => {
    if (!rejectReason.trim()) return
    setActionLoading(prev => ({ ...prev, [rejectId]: 'rejecting' }))
    try {
      const res = await fetch(`${API_BASE}/payments/manual-receipt/${rejectId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ reason: rejectReason })
      })
      const data = await res.json()
      if (data.success) {
        showToast('❌ Payment rejected & student notified')
        setRejectId(null); setRejectReason('')
        loadPayments()
      } else {
        showToast(data.message || 'Failed to reject', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [rejectId]: null }))
    }
  }

  const pendingCount = payments.filter(p => p.status === 'pending_verification').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[99998] px-5 py-3 rounded-2xl font-semibold text-sm shadow-2xl transition-all
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-red-400">❌ Payment Reject</h3>
            <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Rejection Reason *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="e.g., Receipt is unclear, wrong amount..."
              className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/70 transition-all resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectId(null); setRejectReason('') }}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:bg-white/8 transition-all font-semibold">
                Cancel
              </button>
              <button onClick={rejectPayment} disabled={!rejectReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all disabled:opacity-40">
                Reject & Notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">💰 Manual Payment Approvals</h1>
            <p className="text-slate-400 text-sm mt-1">Admin: {currentUser?.fullName}</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-yellow-500/15 border border-yellow-500/25 text-yellow-400 font-bold px-4 py-2 rounded-xl text-sm">
              ⏳ {pendingCount} Pending
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['pending_verification', 'approved', 'rejected', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border
                ${filter === f ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg shadow-purple-900/30'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/8'}`}>
              {f === 'pending_verification' ? '⏳ Pending' : f === 'approved' ? '✅ Approved' : f === 'rejected' ? '❌ Rejected' : '🔍 All'}
            </button>
          ))}
          <button onClick={loadPayments} className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white/6 border border-white/10 text-slate-300 hover:bg-white/12 transition-all">
            🔄 Refresh
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3 animate-spin">⏳</div>
            <p>Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-white/3 rounded-3xl border border-white/8">
            <div className="text-4xl mb-3">📭</div>
            <p>No {filter === 'all' ? '' : filter.replace('_', ' ')} payments found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto bg-white/3 border border-white/8 rounded-3xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Student', 'Phone', 'Stream / Plan', 'Amount', 'Date', 'Receipt', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p._id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-sm">{p.student?.fullName || '—'}</div>
                        <div className="text-xs text-slate-500">{p.student?.email}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sm text-slate-300">{p.student?.phoneNumber || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-300 max-w-[160px]">
                        <span className="truncate block">{p.course?.title || p.plan || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-green-400 text-sm">{p.amount?.toLocaleString() || 0} ETB</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">{new Date(p.submittedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5">
                        {p.receiptImage ? (
                          <button onClick={() => setLightboxSrc(p.receiptImage)}
                            className="group relative">
                            <img src={p.receiptImage} alt="Receipt"
                              className="w-12 h-10 object-cover rounded-lg border border-white/10 group-hover:border-blue-500/50 transition-all cursor-pointer" />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg text-xs text-white transition-all">🔍</span>
                          </button>
                        ) : <span className="text-slate-600 text-xs">No image</span>}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3.5">
                        {p.status === 'pending_verification' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => approvePayment(p._id, p.student?.fullName)}
                              disabled={!!actionLoading[p._id]}
                              className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 border border-green-500/25 hover:bg-green-600/30 transition-all text-xs font-bold disabled:opacity-40">
                              {actionLoading[p._id] === 'approving' ? '⏳' : '✅ Approve'}
                            </button>
                            <button
                              onClick={() => { setRejectId(p._id); setRejectReason('') }}
                              className="px-3 py-1.5 rounded-lg bg-red-600/15 text-red-400 border border-red-500/20 hover:bg-red-600/25 transition-all text-xs font-bold">
                              ❌ Reject
                            </button>
                          </div>
                        )}
                        {p.status !== 'pending_verification' && (
                          <span className="text-xs text-slate-600">
                            {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString() : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {payments.map(p => (
                <div key={p._id} className="bg-white/4 border border-white/8 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold">{p.student?.fullName || '—'}</div>
                      <div className="text-xs text-slate-400">{p.student?.email}</div>
                      <div className="text-xs font-mono text-slate-300 mt-1">{p.student?.phoneNumber}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-xs text-slate-400 mb-2 truncate">{p.course?.title || p.plan || '—'}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-green-400">{p.amount?.toLocaleString() || 0} ETB</span>
                    <div className="flex items-center gap-2">
                      {p.receiptImage && (
                        <button onClick={() => setLightboxSrc(p.receiptImage)}
                          className="text-blue-400 text-xs underline">View Receipt</button>
                      )}
                      {p.status === 'pending_verification' && (
                        <>
                          <button onClick={() => approvePayment(p._id, p.student?.fullName)} disabled={!!actionLoading[p._id]}
                            className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 border border-green-500/25 text-xs font-bold disabled:opacity-40">
                            {actionLoading[p._id] === 'approving' ? '⏳' : '✅ Approve'}
                          </button>
                          <button onClick={() => { setRejectId(p._id); setRejectReason('') }}
                            className="px-3 py-1.5 rounded-lg bg-red-600/15 text-red-400 border border-red-500/20 text-xs font-bold">
                            ❌
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Summary */}
        {payments.length > 0 && (
          <div className="mt-6 text-center text-xs text-slate-500">
            Showing {payments.length} record{payments.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
