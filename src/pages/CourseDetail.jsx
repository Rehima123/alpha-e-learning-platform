import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
export default function CourseDetail() {
  const { id } = useParams()
  useEffect(() => { window.location.href = `/course-detail.html?id=${id || ''}` }, [id])
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading course...</div>
}
