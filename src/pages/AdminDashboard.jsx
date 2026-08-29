import { useEffect } from 'react'
export default function AdminDashboard() {
  useEffect(() => { window.location.href = '/admin-dashboard.html' }, [])
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading admin dashboard...</div>
}
