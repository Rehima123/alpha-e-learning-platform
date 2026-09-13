/**
 * PaymentBanner.jsx — Auto-playing carousel, 3.5s interval
 * 3 slides: HD Video | Mid/Final Exam PDF | Full Access 399 ETB
 * CTA → /subscription  |  Bilingual EN + Amharic
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlayCircle, FileText, Unlock,
  ChevronLeft, ChevronRight, Zap, Download, Wifi
} from 'lucide-react'

const PRICE     = '399 ETB'
const INTERVAL  = 3500

const SLIDES = [
  {
    id: 1,
    Icon: PlayCircle,
    iconCls: 'text-blue-400',
    gradient: 'from-blue-600/25 via-blue-900/10',
    border: 'border-blue-500/25',
    badge: '🎬 Video',
    badgeCls: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    en: 'HD Video Lectures — All 12 Courses',
    am: 'ሁሉም 12 ኮርሶች HD ቪዲዮ',
    desc: 'Crystal-clear HD video for every Ethiopian Freshman subject — watch online or save offline.',
    pills: ['📐 Math & Physics', '🧪 Chemistry & Biology', '📖 English & Logic'],
  },
  {
    id: 2,
    Icon: FileText,
    iconCls: 'text-purple-400',
    gradient: 'from-purple-600/25 via-purple-900/10',
    border: 'border-purple-500/25',
    badge: '📄 PDF',
    badgeCls: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    en: 'Mid & Final Exam Questions + PDF Notes',
    am: 'ፈተና ጥያቄዎች + PDF ማስታወሻ',
    desc: 'Past mid-term & final exam questions with full PDF notes — everything to ace your exams.',
    pills: ['📝 Mid-term Qs', '📋 Final Exam Qs', '📑 PDF Notes'],
  },
  {
    id: 3,
    Icon: Unlock,
    iconCls: 'text-green-400',
    gradient: 'from-green-600/25 via-emerald-900/10',
    border: 'border-green-500/25',
    badge: '✅ Full Access',
    badgeCls: 'bg-green-500/15 text-green-300 border-green-500/25',
    en: `Unlock Everything — Only ${PRICE}`,
    am: `ሁሉም ይፈቱ — ዋጋ ${PRICE} ብቻ`,
    desc: `One payment of ${PRICE} — all 12 courses, videos, PDFs, offline download for a full year.`,
    pills: ['📱 Offline Download', `💰 ${PRICE} ብቻ`, '🎓 All 12 Courses'],
  },
]

export default function PaymentBanner() {
  const navigate = useNavigate()
  const [active,   setActive]   = useState(0)
  const [dir,      setDir]      = useState('right')
  const [visible,  setVisible]  = useState(true)
  const [paused,   setPaused]   = useState(false)

  const goTo = useCallback((idx, d = 'right') => {
    setVisible(false)
    setDir(d)
    setTimeout(() => { setActive(idx); setVisible(true) }, 220)
  }, [])

  const next = useCallback(() => goTo((active + 1) % SLIDES.length, 'right'), [active, goTo])
  const prev = useCallback(() => goTo((active - 1 + SLIDES.length) % SLIDES.length, 'left'), [active, goTo])

  useEffect(() => {
    if (paused) return
    const t = setInterval(next, INTERVAL)
    return () => clearInterval(t)
  }, [next, paused])

  const s = SLIDES[active]

  return (
    <div
      className="w-full max-w-6xl mx-auto px-4 pt-3 pb-1"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Card ── */}
      <div className={`
        relative overflow-hidden rounded-2xl border ${s.border}
        bg-gradient-to-br ${s.gradient} to-slate-900/80
        shadow-xl shadow-black/40 backdrop-blur-sm
      `}>

        {/* BG overlay */}
        <div className="absolute inset-0 bg-slate-900/55 pointer-events-none" />

        {/* ── Price chip — always visible top-right ── */}
        <div className="absolute top-3 right-3 z-20">
          <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black
            text-[11px] font-black px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
            💰 {PRICE} only
          </span>
        </div>

        {/* ── Slide body ── */}
        <div
          className="relative z-10 flex flex-col sm:flex-row items-center gap-4 px-5 pt-5 pb-3"
          style={{
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateX(0)' : dir === 'right' ? 'translateX(-14px)' : 'translateX(14px)',
            transition: 'opacity 0.22s ease, transform 0.22s ease'
          }}
        >
          {/* Icon */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
              <s.Icon className={`w-7 h-7 ${s.iconCls}`} strokeWidth={1.5} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${s.badgeCls}`}>
              {s.badge}
            </span>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-base md:text-lg font-black text-white leading-tight pr-16 sm:pr-0">
              {s.en}
            </p>
            <p className="text-purple-300/80 text-xs font-semibold mt-0.5 mb-1.5">{s.am}</p>
            <p className="text-slate-400 text-xs leading-relaxed hidden md:block mb-2">{s.desc}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
              {s.pills.map(p => (
                <span key={p} className="text-[10px] font-semibold bg-white/8 border border-white/10
                  text-slate-300 px-2 py-0.5 rounded-lg whitespace-nowrap">
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <button
              onClick={() => navigate('/subscription')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm
                bg-gradient-to-r from-blue-600 to-purple-600
                hover:from-blue-500 hover:to-purple-500
                text-white shadow-lg shadow-purple-900/30 transition-all whitespace-nowrap"
            >
              <Zap className="w-4 h-4" />
              Get Full Access
            </button>
            <span className="text-yellow-400/80 text-[11px] font-bold">{PRICE} ለሁሉም 🔓</span>
          </div>
        </div>

        {/* ── Offline download nudge bar ── */}
        <div className="relative z-10 mx-5 mb-3 flex items-center gap-2
          bg-white/5 border border-white/8 rounded-xl px-3 py-2">
          <Download className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          <Wifi className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <p className="text-[11px] text-slate-300 flex-1">
            <span className="text-green-300 font-bold">Offline Download included</span>
            {' '}— አንዴ ከፍለው ሁሉም ቪዲዮዎች offline ይሠሩሉ (internet ሳያስፈልግ)
          </p>
          <button
            onClick={() => navigate('/subscription')}
            className="flex-shrink-0 text-[10px] font-bold text-green-400
              bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg
              hover:bg-green-500/20 transition-all whitespace-nowrap"
          >
            Download Now →
          </button>
        </div>

        {/* ── Nav row ── */}
        <div className="relative z-10 flex items-center justify-between px-5 pb-3">
          <button onClick={prev} aria-label="Previous"
            className="w-7 h-7 flex items-center justify-center rounded-lg
              bg-white/6 hover:bg-white/12 border border-white/8 text-slate-400 hover:text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {SLIDES.map((sl, i) => (
              <button key={sl.id} onClick={() => goTo(i, i > active ? 'right' : 'left')}
                aria-label={`Slide ${i + 1}`} className="transition-all duration-300">
                <div className={`rounded-full transition-all duration-300 ${
                  i === active
                    ? 'w-6 h-2 bg-gradient-to-r from-blue-500 to-purple-500'
                    : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                }`} />
              </button>
            ))}
          </div>

          {/* Progress + next */}
          <div className="flex items-center gap-2">
            {!paused && (
              <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  key={active}
                  style={{ animation: `swpProg ${INTERVAL}ms linear forwards`, transformOrigin: 'left' }} />
              </div>
            )}
            <button onClick={next} aria-label="Next"
              className="w-7 h-7 flex items-center justify-center rounded-lg
                bg-white/6 hover:bg-white/12 border border-white/8 text-slate-400 hover:text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes swpProg {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}
