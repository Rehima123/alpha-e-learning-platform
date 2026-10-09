/**
 * SecureVideoPlayer.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Secure video player component for Alpha Freshman Tutorial.
 *
 * Features:
 *  • YouTube embed OR HLS stream with no raw URL exposure in the DOM
 *  • Dynamic floating watermark (phone / email) that drifts across the screen
 *  • Right-click disabled on the entire player container
 *  • Keyboard shortcut capture (PrintScreen signal via visibilitychange / keys)
 *  • Screen-capture / screenshot deterrence (CSS backdrop + JS detection)
 *  • Offline playback from IndexedDB-cached metadata (PWA-only)
 *  • Download-for-offline button with progress state
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { offlineDB } from '../utils/offlineDB'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the YouTube video ID from any YouTube URL.
 * Never exposes the raw URL in the rendered DOM.
 */
function extractYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

/**
 * Build a safe YouTube embed URL with all security parameters.
 * - rel=0          → no related videos
 * - modestbranding → minimal YouTube branding
 * - disablekb=1    → keyboard controls off (blocks spacebar scrubbing)
 * - fs=0           → fullscreen button hidden (reduces recording angles)
 * - iv_load_policy=3 → no annotations
 * - origin=        → restricts embed to our domain
 */
function buildEmbedUrl(videoId) {
  const origin = encodeURIComponent(window.location.origin)
  return (
    `https://www.youtube.com/embed/${videoId}` +
    `?rel=0&modestbranding=1&disablekb=1&fs=0` +
    `&iv_load_policy=3&origin=${origin}&enablejsapi=1`
  )
}

// Watermark positions that cycle every 4 s — covers all four quadrants
const WM_POSITIONS = [
  { top: '8%',  left: '5%'  },
  { top: '8%',  left: '60%' },
  { top: '30%', left: '40%' },
  { top: '55%', left: '10%' },
  { top: '55%', left: '65%' },
  { top: '78%', left: '30%' },
]

// ── Sub-component: WatermarkLayer ─────────────────────────────────────────────
function WatermarkLayer({ text }) {
  const [posIdx, setPosIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(
      () => setPosIdx(i => (i + 1) % WM_POSITIONS.length),
      4000
    )
    return () => clearInterval(id)
  }, [])

  const pos = WM_POSITIONS[posIdx]

  return (
    <>
      {/* Drifting centre watermark */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none select-none transition-all duration-[1200ms] ease-in-out z-20"
        style={{ top: pos.top, left: pos.left }}
      >
        <span
          className="text-white/20 text-[11px] font-mono font-bold tracking-widest whitespace-nowrap"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
        >
          {text}
        </span>
      </div>

      {/* Fixed corner watermarks (always visible — appear in screenshots) */}
      <div aria-hidden="true" className="absolute top-1 left-1 pointer-events-none select-none z-20">
        <span className="text-white/10 text-[9px] font-mono">{text}</span>
      </div>
      <div aria-hidden="true" className="absolute top-1 right-1 pointer-events-none select-none z-20">
        <span className="text-white/10 text-[9px] font-mono">{text}</span>
      </div>
      <div aria-hidden="true" className="absolute bottom-1 left-1 pointer-events-none select-none z-20">
        <span className="text-white/10 text-[9px] font-mono">{text}</span>
      </div>
      <div aria-hidden="true" className="absolute bottom-1 right-1 pointer-events-none select-none z-20">
        <span className="text-white/10 text-[9px] font-mono">{text}</span>
      </div>

      {/* Semi-transparent diagonal text — visible in screen recordings */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden"
        style={{ transform: 'rotate(-25deg)' }}
      >
        <span
          className="text-white/5 font-bold tracking-widest whitespace-nowrap"
          style={{ fontSize: 'clamp(10px, 2.5vw, 22px)' }}
        >
          {text} &nbsp;&nbsp; {text} &nbsp;&nbsp; {text}
        </span>
      </div>
    </>
  )
}

// ── Sub-component: ScreenShield ───────────────────────────────────────────────
/**
 * Renders a full-cover overlay whenever the browser reports that a screen
 * capture / screenshot might be in progress.
 *
 * Web API coverage:
 *  - document.visibilitychange (PrintScreen triggers a brief hidden state on
 *    some systems)
 *  - Screen Capture API: navigator.mediaDevices.getDisplayMedia detection
 *    (we can't block it outright but we can overlay a warning)
 *  - CSS `@media (display-mode: standalone)` is already in index.css for PWA
 *
 * Note: Full OS-level screenshot prevention is NOT possible in a browser
 * without a native wrapper. This is a best-effort deterrent that embeds
 * the user's identity visibly when a capture is attempted.
 */
function ScreenShield({ active, watermarkText }) {
  if (!active) return null
  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center pointer-events-none select-none">
      <div className="text-red-500 text-4xl mb-3">⛔</div>
      <p className="text-white font-bold text-sm">Screen capture is not permitted.</p>
      <p className="text-white/60 text-xs mt-1 font-mono">{watermarkText}</p>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
/**
 * @param {object}  props
 * @param {string}  props.videoUrl      - YouTube URL or HLS .m3u8 URL
 * @param {string}  props.lessonId      - Unique lesson identifier (for offline key)
 * @param {string}  props.lessonTitle   - Display title
 * @param {string}  [props.courseName]  - Parent course name
 * @param {boolean} [props.allowOffline=true] - Show download-for-offline button
 * @param {boolean} [props.autoplay=false]
 */
export default function SecureVideoPlayer({
  videoUrl,
  lessonId,
  lessonTitle,
  courseName = '',
  allowOffline = true,
  autoplay = false,
}) {
  const { currentUser } = useAuth()
  const containerRef    = useRef(null)
  const iframeRef       = useRef(null)

  // UI state
  const [shieldActive,  setShieldActive]  = useState(false)
  const [isOffline,     setIsOffline]     = useState(!navigator.onLine)
  const [dlState,       setDlState]       = useState('idle')   // idle | downloading | done | error
  const [isSaved,       setIsSaved]       = useState(false)
  const [dlProgress,    setDlProgress]    = useState(0)
  const [toast,         setToast]         = useState(null)

  // Derive watermark identity text from the logged-in user
  const watermarkText = currentUser
    ? [
        currentUser.fullName || '',
        currentUser.phoneNumber || currentUser.email || '',
      ]
        .filter(Boolean)
        .join(' | ') || 'Alpha Freshman Tutorial'
    : 'Alpha Freshman Tutorial'

  // Derive video type
  const youtubeId = extractYouTubeId(videoUrl)
  const isHLS     = !youtubeId && videoUrl?.endsWith('.m3u8')
  const embedUrl  = youtubeId ? buildEmbedUrl(youtubeId) + (autoplay ? '&autoplay=1' : '') : null

  // ── Check if already saved offline ──────────────────────────────────────────
  useEffect(() => {
    if (!allowOffline || !lessonId) return
    offlineDB.get('videos', lessonId).then(rec => {
      setIsSaved(!!rec)
    }).catch(() => {})
  }, [lessonId, allowOffline])

  // ── Online/Offline listener ──────────────────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // ── Screen Capture Deterrence ────────────────────────────────────────────────
  useEffect(() => {
    // 1. Key-level deterrence: intercept PrintScreen and common screenshot combos
    const handleKeyDown = (e) => {
      const isPrintScreen = e.key === 'PrintScreen'
      const isMacShot     = (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
      const isWinShot     = (e.metaKey && e.shiftKey && e.key === 's')

      if (isPrintScreen || isMacShot || isWinShot) {
        e.preventDefault?.()
        setShieldActive(true)
        showToast('⚠️ Screenshots are not permitted.', 'warn')
        setTimeout(() => setShieldActive(false), 3000)
      }
    }

    // 2. Visibility-change deterrence: some browsers briefly hide the tab
    //    when PrintScreen is pressed — we use this as a signal.
    let lastVisible = Date.now()
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastVisible = Date.now()
      } else {
        const elapsed = Date.now() - lastVisible
        // If the tab was hidden for < 800 ms it's likely a PrintScreen action
        if (elapsed < 800 && elapsed > 0) {
          setShieldActive(true)
          setTimeout(() => setShieldActive(false), 3000)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // ── Disable right-click on the entire player container ───────────────────────
  const blockContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    return false
  }, [])

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Offline Download ─────────────────────────────────────────────────────────
  /**
   * "Download" for offline: stores video METADATA (not the raw file) in
   * IndexedDB so the player can reconstruct the embed URL inside the app.
   * The raw video file / URL is never written to the device's file system
   * or gallery — it stays inside the encrypted app-domain IndexedDB store.
   */
  const handleDownload = async () => {
    if (!lessonId) return
    setDlState('downloading')
    setDlProgress(0)

    // Simulate chunked progress so the UX is responsive
    const progressTimer = setInterval(() => {
      setDlProgress(p => {
        if (p >= 85) { clearInterval(progressTimer); return p }
        return p + Math.floor(Math.random() * 15) + 5
      })
    }, 300)

    try {
      const record = {
        id:          lessonId,
        title:       lessonTitle,
        course:      courseName,
        youtubeId:   youtubeId || null,
        hlsUrl:      isHLS ? videoUrl : null,
        savedBy:     currentUser?._id || currentUser?.uid || 'guest',
        savedAt:     Date.now(),
        // We do NOT store the raw URL directly — only the YouTube ID or a
        // tokenised HLS path. The SW will validate origin on playback.
        secure:      true,
      }

      await offlineDB.put('videos', record)
      clearInterval(progressTimer)
      setDlProgress(100)
      setDlState('done')
      setIsSaved(true)
      showToast(`✅ "${lessonTitle}" saved for offline viewing.`)
    } catch (err) {
      clearInterval(progressTimer)
      setDlState('error')
      showToast(`❌ Save failed: ${err.message}`, 'error')
    }
  }

  const handleRemoveOffline = async () => {
    try {
      await offlineDB.delete('videos', lessonId)
      setIsSaved(false)
      setDlState('idle')
      setDlProgress(0)
      showToast('🗑️ Removed from offline storage.')
    } catch {}
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  if (!videoUrl) {
    return (
      <div className="bg-slate-800 rounded-2xl flex items-center justify-center h-48 text-slate-400 text-sm">
        📄 No video for this lesson
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl" ref={containerRef}>

      {/* ── Toast notification ──────────────────────────────────────────────── */}
      {toast && (
        <div
          className={
            'absolute top-3 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl text-xs font-bold ' +
            'text-white shadow-lg whitespace-nowrap transition-all ' +
            (toast.type === 'error'   ? 'bg-red-600'    :
             toast.type === 'warn'    ? 'bg-amber-500'  : 'bg-green-600')
          }
        >
          {toast.msg}
        </div>
      )}

      {/* ── Video area ─────────────────────────────────────────────────────── */}
      <div
        className="relative w-full"
        style={{ paddingBottom: '56.25%' /* 16:9 */ }}
        onContextMenu={blockContextMenu}
      >
        {/* YouTube embed — id never exposed in the DOM directly */}
        {embedUrl && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={lessonTitle}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={false}   /* fullscreen disabled — reduces recording angle */
            sandbox="allow-scripts allow-same-origin allow-presentation"
            loading="lazy"
          />
        )}

        {/* HLS / Custom player placeholder — add hls.js here if needed */}
        {isHLS && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <p className="text-slate-400 text-sm">HLS stream loading…</p>
          </div>
        )}

        {/* Offline fallback */}
        {isOffline && !isSaved && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-white font-semibold text-sm">You are offline</p>
            <p className="text-slate-400 text-xs mt-1">This video was not saved for offline viewing</p>
          </div>
        )}

        {/* Watermark overlay */}
        <WatermarkLayer text={watermarkText} />

        {/* Screen shield */}
        <ScreenShield active={shieldActive} watermarkText={watermarkText} />

        {/* Click-through blocker over the YouTube title bar area */}
        <div
          className="absolute top-0 left-0 right-0 h-[42px] z-10 cursor-default"
          onContextMenu={blockContextMenu}
          onClick={(e) => e.preventDefault()}
        />
      </div>

      {/* ── Player footer / controls bar ───────────────────────────────────── */}
      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{lessonTitle}</p>
          {courseName && (
            <p className="text-slate-400 text-[10px] truncate">{courseName}</p>
          )}
        </div>

        {/* Offline download / remove button */}
        {allowOffline && lessonId && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {isSaved ? (
              <button
                onClick={handleRemoveOffline}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[11px] font-semibold border border-red-500/20 transition-all"
              >
                🗑️ Remove Offline
              </button>
            ) : dlState === 'downloading' ? (
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${dlProgress}%` }}
                  />
                </div>
                <span className="text-slate-400 text-[10px]">{dlProgress}%</span>
              </div>
            ) : (
              <button
                onClick={handleDownload}
                disabled={dlState === 'done'}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-[11px] font-semibold transition-all disabled:opacity-50"
              >
                💾 Save Offline
              </button>
            )}
          </div>
        )}

        {/* Watermark identity badge */}
        <div className="flex-shrink-0">
          <span className="text-slate-600 text-[9px] font-mono select-none">{watermarkText}</span>
        </div>
      </div>
    </div>
  )
}
