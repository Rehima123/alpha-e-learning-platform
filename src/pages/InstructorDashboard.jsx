import { useEffect } from 'react'
export default function InstructorDashboard() {
  useEffect(() => { window.location.href = '/instructor-dashboard.html' }, [])
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading instructor dashboard...</div>
}
