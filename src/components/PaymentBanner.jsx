/**
 * PaymentBanner.jsx
 *
 * Animated auto-playing carousel banner (3.5s interval) showcasing
 * platform benefits. Slides between 3 cards with smooth CSS transitions.
 * Bilingual: English + Amharic.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlayCircle,
  FileText,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react'

// ── Slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id:       1,
    icon:     PlayCircle,
    iconColor:'text-blue-400',
    bg:       'from-blue-600/20 via-blue-900/10 to-transparent',
    accent:   'border-blue-500/30',
    badge:    '🎬 Video',
    badgeCss: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    title:    'HD Video Lectures',
    titleAm:  'ሁሉም ኮርሶች ቪዲዮ',
    desc:     'Crystal-clear HD lectures for all 12 Ethiopian Freshman courses — watch anytime, anywhere.',
    descAm:   'ሁሉም 12 ኮርሶች HD ቪዲዮ ትምህርቶች — internet ሲኖርዎ ወይም offline ሲሆን ይጠቀሙ።',
    highlights: ['📐 Math & Physics', '🧪 Chemistry & Biology', '📖 English & Logic'],
  },
  {
    id:       2,
    icon:     FileText,
    iconColor:'text-purple-400',
    bg:       'from-purple-600/20 via-purple-900/10 to-transparent',
    accent:   'border-purple-500/30',
    badge:    '📄 PDF',
    badgeCss: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    title:    'Mid & Final Exam Questions + PDF Notes',
    titleAm:  'ፈተና ጥያቄዎች + PDF ማስታወሻ',
    desc:     'Past mid-term & final exam questions with detailed PDF notes — everything you need to score top marks.',
    descAm:   'ያለፉ ፈተናዎች ጥያቄዎች እና ዝርዝር PDF ማስታወሻዎች — ሁሉም ለ download ዝግጁ ናቸው።',
    highlights: ['📝 Mid-term Questions', '📋 Final Exam Questions', '📑 Detailed PDF Notes'],
  },
  {
    id:       3,
    icon:     Unlock,
    iconColor:'text-green-400',
    bg:       'from-green-600/20 via-emerald-900/10 to-transparent',
    accent:   'border-green-500/30',
    badge:    '✅ Full Access',
    badgeCss: 'bg-green-500/15 text-green-300 border-green-500/25',
    title:    'Unlock Full Access',
    titleAm:  'ሁሉም ይፈቱ',
    desc:     'One payment — unlimited access to all courses, videos, PDFs, and offline PWA for 1 full year.',
    descAm:   'አንድ ምዝገባ — ሁሉም ቪዲዮዎች፣ PDF፣ Offline access ለ1 ዓመት ይፈቱልዎ።',
    highlights: ['🚀 Instant Access', '📱 Offline PWA', '🎓 All 12 Courses'],
  },
]

const INTERVAL_MS = 3500

// ─────────────────────────────────────────────────────────────────────────────
export default function PaymentBanner() {
  const navigate   = useNavigate()
  const [active, setActive]         = useState(0)
  const [animDir, setAnimDir]       = useState('right')  // 'right' | 'left'
  const [isVisible, setIsVisible]   = useState(true)
  const [isPaused, setIsPaused]     = useState(false)

  // ── Go to slide ──────────────────────────────────────────────────────────
  const goTo = useCallback((idx, dir = 'right') => {
    setIsVisible(false)
    setAnimDir(dir)
    setTimeout(() => {
      setActive(idx)
      setIsVisible(true)
    }, 250)
  }, [])

  const next = useCallback(() => {
    goTo((active + 1) % SLIDES.length, 'right')
  }, [active, goTo])

  const prev = useCallback(() => {
    goTo((active - 1 + SLIDES.length) % SLIDES.length, 'left')
  }, [active, goTo])

  // ── Auto-play ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(next, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [next, isPaused])

  const slide = SLIDES[active]
  const Icon  = slide.icon

  return (
    <div
      className="w-full mx-auto max-w-6xl px-4 py-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Banner card ──────────────────────────────────────────────────── */}
      <div className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br ${slide.bg}
        border ${slide.accent}
        bg-slate-900/60 backdrop-blur-sm
        shadow-xl shadow-black/30
        transition-all duration-500
      `}>

        {/* Background glow */}
        <div className="absolute inset-0 bg-slate-900/50 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/3 rounded-full blur-3xl pointer-events-none" />

        {/* ── Slide content ─────────────────────────────────────────────── */}
        <div
          className={`
            relative z-10 flex flex-col md:flex-row items-center gap-5 p-5 md:p-6
            transition-all duration-250
            ${isVisible
              ? 'opacity-100 translate-x-0'
              : animDir === 'right'
                ? 'opacity-0 -translate-x-4'
                : 'opacity-0 translate-x-4'
            }
          `}
          style={{ transition: 'opacity 0.25s ease, transform 0.25s ease' }}
        >

          {/* Icon column */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className={`
              w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center
              bg-white/8 border border-white/10
            `}>
              <Icon className={`w-8 h-8 ${slide.iconColor}`} strokeWidth={1.5} />
            </div>
            {/* Badge */}
            <span className={`
              text-[10px] font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap
              ${slide.badgeCss}
            `}>
              {slide.badge}
            </span>
          </div>

          {/* Text column */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <h3 className="text-base md:text-lg font-black text-white leading-tight">
              {slide.title}
            </h3>
            <p className="text-purple-300/80 text-xs font-semibold mt-0.5 mb-2">
              {slide.titleAm}
            </p>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed hidden md:block">
              {slide.desc}
            </p>
            {/* Highlights — pill tags */}
            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-2">
              {slide.highlights.map(h => (
                <span key={h}
                  className="text-[10px] font-semibold bg-white/8 border border-white/10
                  text-slate-300 px-2 py-0.5 rounded-lg whitespace-nowrap">
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* CTA button */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <button
              onClick={() => navigate('/subscription')}
              className="
                flex items-center gap-2 px-5 py-3 rounded-xl
                bg-gradient-to-r from-blue-600 to-purple-600
                hover:from-blue-500 hover:to-purple-500
                text-white font-black text-sm
                shadow-lg shadow-purple-900/30
                transition-all duration-200
                whitespace-nowrap
              "
            >
              <Zap className="w-4 h-4" />
              Get Full Access
            </button>
            <span className="text-slate-500 text-[10px]">ሁሉም ኮርሶች 🔓</span>
          </div>

        </div>

        {/* ── Bottom nav: dots + arrows ─────────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between px-5 pb-4 -mt-1">

          {/* Prev arrow */}
          <button
            onClick={prev}
            className="w-7 h-7 flex items-center justify-center rounded-lg
              bg-white/6 hover:bg-white/12 border border-white/8
              text-slate-400 hover:text-white transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i, i > active ? 'right' : 'left')}
                aria-label={`Go to slide ${i + 1}`}
                className="transition-all duration-300"
              >
                <div className={`
                  rounded-full transition-all duration-300
                  ${i === active
                    ? 'w-6 h-2 bg-gradient-to-r from-blue-500 to-purple-500'
                    : 'w-2 h-2 bg-white/20 hover:bg-white/40'}
                `} />
              </button>
            ))}
          </div>

          {/* Progress bar + Next arrow */}
          <div className="flex items-center gap-2">
            {/* Auto-play progress bar */}
            {!isPaused && (
              <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{
                    animation: `slideProgress ${INTERVAL_MS}ms linear infinite`,
                    width: '100%',
                    transformOrigin: 'left'
                  }}
                />
              </div>
            )}
            <button
              onClick={next}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                bg-white/6 hover:bg-white/12 border border-white/8
                text-slate-400 hover:text-white transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Progress bar animation keyframe */}
      <style>{`
        @keyframes slideProgress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}
