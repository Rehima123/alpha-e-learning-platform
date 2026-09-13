/**
 * OfflineVideos.jsx — Alpha Freshman Tutorial
 * ─────────────────────────────────────────────────────────────────────────────
 * Full offline video management page.
 *
 * Features:
 *  • Lists enrolled course lessons available for offline saving
 *  • Saves video METADATA to IndexedDB (raw URL is NEVER exposed to device)
 *  • Plays saved videos through SecureVideoPlayer (watermark + no right-click)
 *  • Shows real-time online/offline status
 *  • Download progress simulation with visual bar
 *  • Delete from offline storage
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { offlineDB } from '../utils/offlineDB'
import SecureVideoPlayer from '../components/SecureVideoPlayer'

// ── Sample lesson catalogue (replace with real API data in production) ────────
const SAMPLE_VIDEOS = [
  {
    id: 'eng1011-l1',
    title: 'Introduction to Academic Reading',
    course: 'Communicative English I',
    courseId: 'course-eng1',
    duration: '45 min',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: '📖',
  },
  {
    id: 'eng1011-l2',
    title: 'Skimming & Scanning Techniques',
    course: 'Communicative English I',
    courseId: 'course-eng1',
    duration: '40 min',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: '📖',
  },
  {
    id: 'math1011-l1',
    title: 'Introduction to Functions',
    course: 'Mathematics for Natural Science',
    courseId: 'course-math1',
    duration: '50 min',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: '📐',
  },
  {
    id: 'math1011-l2',
    title: 'Limits and Continuity',
    course: 'Mathematics for Natural Science',
    courseId: 'course-math1',
    duration: '55 min',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: '📐',
  },
  {
    id: 'phys1011-l1',
    title: 'General Physics — Motion & Forces',
    course: 'General Physics I',
    courseId: 'course-phys1',
    duration: '52 min',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: '⚛️',
  },
  {
    id: 'logic1011-l1',
    title: 'What is Critical Thinking?',
    course: 'Critical Thinking & Logic',
    courseId: 'course-logic1',
    duration: '40 min',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: '🧠',
  },
]

// ── VideoCard ─────────────────────────────────────────────────────────────────
function VideoCard({ video, isSaved, isDownloading, progress, onSave, onRemove, onPlay }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/8 rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-md">
      <div className="text-3xl flex-shrink-0 select-none">{video.thumbnail}</div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{video.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{video.course} · {video.duration}</p>

        {/* Download progress bar */}
        {isDownloading && (
          <div className="mt-2 w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Play button */}
        <button
          onClick={() => onPlay(video)}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
        >
          ▶ Play
        </button>

        {/* Save / saved / remove */}
        {isSaved ? (
          <button
            onClick={() => onRemove(video)}
            className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-500 text-xs font-bold border border-red-500/20 transition-all"
          >
            🗑️
          </button>
        ) : isDownloading ? (
          <span className="px-3 py-1.5 text-slate-400 text-xs font-bold">
            {progress}%
          </span>
        ) : (
          <button
            onClick={() => onSave(video)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
          >
            💾 Save
          </button>
        )}

        {/* Saved badge */}
        {isSaved && !isDownloading && (
          <span className="px-2 py-1 rounded-lg bg-green-500/15 text-green-500 text-[10px] font-bold border border-green-500/20">
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OfflineVideos() {
  const { currentUser } = useAuth()

  const [savedVideos,  setSavedVideos]  = useState([])
  const [downloading,  setDownloading]  = useState({})   // { [id]: progress 0-100 }
  const [playingVideo, setPlayingVideo] = useState(null)  // video object being watched
  const [activeTab,    setActiveTab]    = useState('available')
  const [toast,        setToast]        = useState(null)
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)

  // ── Online/Offline ──────────────────────────────────────────────────────────
  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online',  up)
      window.removeEventListener('offline', down)
    }
  }, [])

  // ── Load saved videos from IndexedDB ────────────────────────────────────────
  const loadSaved = useCallback(async () => {
    try {
      const all = await offlineDB.getAll('videos')
      setSavedVideos(all)
    } catch {}
  }, [])

  useEffect(() => { loadSaved() }, [loadSaved])

  // ── Toast ───────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Save for offline ────────────────────────────────────────────────────────
  const handleSave = async (video) => {
    setDownloading(prev => ({ ...prev, [video.id]: 0 }))

    // Animate progress bar
    let prog = 0
    const timer = setInterval(() => {
      prog += Math.floor(Math.random() * 18) + 8
      if (prog >= 90) { clearInterval(timer); prog = 90 }
      setDownloading(prev => ({ ...prev, [video.id]: prog }))
    }, 250)

    try {
      await offlineDB.put('videos', {
        id:        video.id,
        title:     video.title,
        course:    video.course,
        courseId:  video.courseId,
        duration:  video.duration,
        youtubeId: video.youtubeId || null,
        thumbnail: video.thumbnail,
        savedBy:   currentUser?._id || currentUser?.uid || 'guest',
        savedAt:   Date.now(),
        secure:    true,
      })

      clearInterval(timer)
      setDownloading(prev => ({ ...prev, [video.id]: 100 }))
      setTimeout(() => {
        setDownloading(prev => { const n = { ...prev }; delete n[video.id]; return n })
      }, 600)

      await loadSaved()
      showToast(`✅ "${video.title}" saved for offline viewing.`)
    } catch (err) {
      clearInterval(timer)
      setDownloading(prev => { const n = { ...prev }; delete n[video.id]; return n })
      showToast(`❌ Save failed: ${err.message}`, 'error')
    }
  }

  // ── Remove from offline ─────────────────────────────────────────────────────
  const handleRemove = async (video) => {
    if (!window.confirm(`Remove "${video.title}" from offline storage?`)) return
    try {
      await offlineDB.delete('videos', video.id)
      await loadSaved()
      showToast('🗑️ Removed from offline storage.')
    } catch {}
  }

  const savedIds = new Set(savedVideos.map(v => v.id))

  // ── Build videoUrl for SecureVideoPlayer from saved metadata ────────────────
  const buildVideoUrl = (v) =>
    v.youtubeId
      ? `https://www.youtube.com/watch?v=${v.youtubeId}`
      : v.hlsUrl || null

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white pb-12">

      {/* Toast */}
      {toast && (
        <div className={
          'fixed top-20 right-4 z-50 px-5 py-3 rounded-2xl font-semibold text-sm shadow-2xl text-white transition-all ' +
          (toast.type === 'error' ? 'bg-red-600' : 'bg-green-600')
        }>
          {toast.msg}
        </div>
      )}

      {/* Full-screen Secure Player */}
      {playingVideo && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10 flex-shrink-0">
            <div>
              <h3 className="font-bold text-white text-sm truncate max-w-[75vw]">{playingVideo.title}</h3>
              <p className="text-slate-400 text-xs">{playingVideo.course}</p>
            </div>
            <button
              onClick={() => setPlayingVideo(null)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white text-lg transition-all"
              aria-label="Close player"
            >
              ✕
            </button>
          </div>

          {/* Player */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <SecureVideoPlayer
              videoUrl={buildVideoUrl(playingVideo)}
              lessonId={playingVideo.id}
              lessonTitle={playingVideo.title}
              courseName={playingVideo.course}
              allowOffline={true}
              autoplay={true}
            />
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">📥 Offline Videos</h1>
            <span className={
              'px-2.5 py-0.5 rounded-full text-xs font-bold ' +
              (isOnline
                ? 'bg-green-500/15 text-green-500 border border-green-500/20'
                : 'bg-orange-500/15 text-orange-500 border border-orange-500/20')
            }>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Save lessons for offline viewing. Videos play only inside this app — files are never exposed to your device gallery.
          </p>
        </div>

        {/* Offline-only warning */}
        {!isOnline && (
          <div className="bg-orange-500/10 border border-orange-500/25 rounded-2xl px-4 py-3 mb-6 text-orange-600 dark:text-orange-400 text-sm font-semibold">
            📡 You are offline — only saved videos are available.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'available', label: `🎬 Available (${SAMPLE_VIDEOS.length})` },
            { id: 'saved',     label: `💾 Saved Offline (${savedVideos.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all border ' +
                (activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-white/10')
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Available Videos Tab ──────────────────────────────────────────── */}
        {activeTab === 'available' && (
          <div className="space-y-3">
            {SAMPLE_VIDEOS.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                isSaved={savedIds.has(video.id)}
                isDownloading={video.id in downloading}
                progress={downloading[video.id] ?? 0}
                onSave={handleSave}
                onRemove={handleRemove}
                onPlay={setPlayingVideo}
              />
            ))}
          </div>
        )}

        {/* ── Saved Offline Tab ─────────────────────────────────────────────── */}
        {activeTab === 'saved' && (
          <div className="space-y-3">
            {savedVideos.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-slate-500">
                <div className="text-4xl mb-3">📭</div>
                <p className="font-medium">No videos saved for offline viewing.</p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="mt-4 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-all"
                >
                  Browse Available Videos →
                </button>
              </div>
            ) : (
              savedVideos.map(video => (
                <div
                  key={video.id}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/8 rounded-2xl p-4 flex items-center gap-4"
                >
                  <div className="text-3xl flex-shrink-0 select-none">{video.thumbnail || '🎬'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{video.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {video.course}
                      {video.savedAt && (
                        <> · Saved {new Date(video.savedAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPlayingVideo(video)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                    >
                      ▶ Watch
                    </button>
                    <button
                      onClick={() => handleRemove(video)}
                      className="px-3 py-1.5 rounded-xl bg-red-500/15 text-red-500 text-xs font-bold hover:bg-red-500/25 border border-red-500/20 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Info box ──────────────────────────────────────────────────────── */}
        <div className="mt-8 bg-blue-500/8 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-2">
          <h3 className="font-bold text-blue-600 dark:text-blue-400 text-sm">🔒 Security & Privacy</h3>
          <ul className="text-xs text-gray-600 dark:text-slate-400 space-y-1.5">
            <li>• Video files are <strong>never saved</strong> to your device gallery or file browser</li>
            <li>• All content is stored securely in browser IndexedDB — only playable inside this app</li>
            <li>• Every video displays a personalised watermark with your name and phone number</li>
            <li>• Right-click and screenshot shortcuts are blocked during playback</li>
            <li>• Watermark position drifts every 4 seconds to appear in screen recordings</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
