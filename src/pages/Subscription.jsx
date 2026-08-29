import { useEffect } from 'react'
export default function Subscription() {
  useEffect(() => { window.location.href = '/subscription.html' }, [])
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>
}
