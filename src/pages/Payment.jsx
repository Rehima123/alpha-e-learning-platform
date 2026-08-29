import { useEffect } from 'react'
export default function Payment() {
  useEffect(() => { window.location.href = '/payment.html' }, [])
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>
}
