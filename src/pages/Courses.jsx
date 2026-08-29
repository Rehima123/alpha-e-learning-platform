import { useEffect } from 'react'
// Redirect to the main vanilla JS courses page
export default function Courses() {
  useEffect(() => { window.location.href = '/courses.html' }, [])
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading courses...</div>
}
