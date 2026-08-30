import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "../context/AuthContext"

// ── IndexedDB helper ──────────────────────────────────────────────────────────
const DB_NAME    = "alpha-offline-videos"
const DB_VERSION = 1
const STORE_NAME = "videos"

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }
    req.onsuccess  = () => resolve(req.result)
    req.onerror    = () => reject(req.error)
  })
}

async function saveVideoOffline(videoMeta) {
  const db    = await openDB()
  const tx    = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)
  store.put({ ...videoMeta, savedAt: Date.now() })
  return new Promise((res, rej) => {
    tx.oncomplete = () => res(true)
    tx.onerror    = () => rej(tx.error)
  })
}

async function getAllOfflineVideos() {
  const db    = await openDB()
  const tx    = db.transaction(STORE_NAME, "readonly")
  const store = tx.objectStore(STORE_NAME)
  const req   = store.getAll()
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result || [])
    req.onerror   = () => rej(req.error)
  })
}

async function deleteOfflineVideo(id) {
  const db    = await openDB()
  const tx    = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)
  store.delete(id)
  return new Promise((res, rej) => {
    tx.oncomplete = () => res(true)
    tx.onerror    = () => rej(tx.error)
  })
}

// ── Sample downloadable videos (in real app these come from enrolled courses) ──
const SAMPLE_VIDEOS = [
  { id:"v1", title:"Communicative English I — Lesson 1", course:"Eng 1011", duration:"14:32", embedId:"dQw4w9WgXcQ", thumbnail:"📖" },
  { id:"v2", title:"General Physics I — Introduction",    course:"Phys 1011",duration:"18:45", embedId:"dQw4w9WgXcQ", thumbnail:"⚛️" },
  { id:"v3", title:"Mathematics — Calculus Basics",       course:"Math 1011",duration:"22:10", embedId:"dQw4w9WgXcQ", thumbnail:"📐" },
  { id:"v4", title:"General Psychology — Chapter 1",      course:"Psy 1011", duration:"16:08", embedId:"dQw4w9WgXcQ", thumbnail:"🧠" },
]

// ── Watermarked Video Player ──────────────────────────────────────────────────
function WatermarkedPlayer({ video, user, onClose }) {
  const watermarkText = user
    ? (user.fullName || user.email || "Student") + " | " + (user.phoneNumber || user.email || "")
    : "Alpha Freshman Tutorial"

  // Floating watermark positions that cycle around the video
  const [wmPos, setWmPos] = useState({ top: "15%", left: "10%" })

  useEffect(() => {
    const positions = [
      { top:"10%",  left:"5%"  }, { top:"20%",  left:"60%" },
      { top:"50%",  left:"20%" }, { top:"70%",  left:"55%" },
      { top:"80%",  left:"10%" }, { top:"35%",  left:"70%" },
    ]
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % positions.length
      setWmPos(positions[i])
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10">
        <div>
          <h3 className="font-bold text-white text-sm">{video.title}</h3>
          <p className="text-slate-400 text-xs">{video.course}</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
          ✕
        </button>
      </div>

      {/* Video + Watermark */}
      <div className="relative flex-1 bg-black overflow-hidden">
        <iframe
          src={"https://www.youtube.com/embed/" + video.embedId + "?autoplay=1&rel=0&modestbranding=1"}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title={video.title}
        />

        {/* Floating Watermark */}
        <div
          className="absolute pointer-events-none select-none transition-all duration-1000 ease-in-out"
          style={{ top: wmPos.top, left: wmPos.left }}
        >
          <span className="text-white/25 text-xs font-mono font-bold tracking-wide whitespace-nowrap"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
            {watermarkText}
          </span>
        </div>

        {/* Corner watermarks (always visible) */}
        <div className="absolute top-2 right-2 pointer-events-none select-none">
          <span className="text-white/15 text-[10px] font-mono">{watermarkText}</span>
        </div>
        <div className="absolute bottom-2 left-2 pointer-events-none select-none">
          <span className="text-white/15 text-[10px] font-mono">{watermarkText}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main OfflineVideos Page ───────────────────────────────────────────────────
export default function OfflineVideos() {
  const { currentUser } = useAuth()
  const [savedVideos,  setSavedVideos]  = useState([])
  const [downloading,  setDownloading]  = useState({})
  const [playingVideo, setPlayingVideo] = useState(null)
  const [activeTab,    setActiveTab]    = useState("available")
  const [toast,        setToast]        = useState(null)

  const showToast = (msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadSaved = useCallback(async () => {
    try {
      const videos = await getAllOfflineVideos()
      setSavedVideos(videos)
    } catch {}
  }, [])

  useEffect(() => { loadSaved() }, [loadSaved])

  const downloadForOffline = async (video) => {
    setDownloading(prev => ({ ...prev, [video.id]: true }))
    try {
      // In a real app, you would cache the actual video blob via Service Worker
      // Here we save the video metadata to IndexedDB for offline access
      await saveVideoOffline({
        id:        video.id,
        title:     video.title,
        course:    video.course,
        duration:  video.duration,
        embedId:   video.embedId,
        thumbnail: video.thumbnail,
      })
      await loadSaved()
      showToast("✅ \"" + video.title + "\" ለ offline ተቀምጧል!")
    } catch (err) {
      showToast("❌ Download failed: " + err.message, "error")
    } finally {
      setDownloading(prev => ({ ...prev, [video.id]: false }))
    }
  }

  const removeOffline = async (id, title) => {
    if (!confirm("\"" + title + "\" ን ከ offline ይሰርዝ?")) return
    try {
      await deleteOfflineVideo(id)
      await loadSaved()
      showToast("🗑️ ተሰርዟል")
    } catch {}
  }

  const savedIds = new Set(savedVideos.map(v => v.id))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white pb-10">

      {/* Toast */}
      {toast && (
        <div className={"fixed top-20 right-4 z-50 px-5 py-3 rounded-2xl font-semibold text-sm shadow-2xl text-white transition-all " +
          (toast.type === "error" ? "bg-red-600" : "bg-green-600")}>
          {toast.msg}
        </div>
      )}

      {/* Watermarked Player */}
      {playingVideo && (
        <WatermarkedPlayer
          video={playingVideo}
          user={currentUser}
          onClose={() => setPlayingVideo(null)}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">📥 Offline Videos</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            ቪዲዮዎችን ለ offline አዘምኑ — Internet ሳይኖር ያድምጡ። ቪዲዮዎቹ watermark ይኖራቸዋል።
          </p>
        </div>

        {/* Offline notice */}
        {!navigator.onLine && (
          <div className="bg-orange-500/10 border border-orange-500/25 rounded-2xl px-4 py-3 mb-6 text-orange-600 dark:text-orange-400 text-sm font-semibold">
            📡 Offline mode — Showing saved videos only
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[{id:"available",label:"🎬 Available (" + SAMPLE_VIDEOS.length + ")"}, {id:"saved",label:"💾 Saved Offline (" + savedVideos.length + ")"}].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={"px-4 py-2 rounded-xl text-sm font-semibold transition-all border " +
                (activeTab === t.id
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow"
                  : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-white/10")}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Available Videos Tab */}
        {activeTab === "available" && (
          <div className="space-y-3">
            {SAMPLE_VIDEOS.map(video => {
              const isSaved    = savedIds.has(video.id)
              const isDownload = downloading[video.id]
              return (
                <div key={video.id}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/8 rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-3xl flex-shrink-0">{video.thumbnail}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{video.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{video.course} · {video.duration}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setPlayingVideo(video)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all">
                      ▶ Play
                    </button>
                    {isSaved ? (
                      <span className="px-3 py-1.5 rounded-xl bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-bold border border-green-500/20">
                        ✓ Saved
                      </span>
                    ) : (
                      <button onClick={() => downloadForOffline(video)} disabled={isDownload}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all disabled:opacity-50">
                        {isDownload ? "⏳" : "�� Save"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Saved Offline Tab */}
        {activeTab === "saved" && (
          <div className="space-y-3">
            {savedVideos.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-slate-500">
                <div className="text-4xl mb-3">📭</div>
                <p>ምንም ቪዲዮ ለ offline አልተቀመጠም።</p>
                <button onClick={() => setActiveTab("available")}
                  className="mt-4 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-all">
                  ቪዲዮ ለ Download ሂድ →
                </button>
              </div>
            ) : savedVideos.map(video => (
              <div key={video.id}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/8 rounded-2xl p-4 flex items-center gap-4">
                <div className="text-3xl flex-shrink-0">{video.thumbnail}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{video.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {video.course} · {video.duration}
                    {video.savedAt && <span> · Saved {new Date(video.savedAt).toLocaleDateString()}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setPlayingVideo(video)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all">
                    ▶ Watch
                  </button>
                  <button onClick={() => removeOffline(video.id, video.title)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/15 text-red-500 text-xs font-bold hover:bg-red-500/25 transition-all">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="mt-8 bg-blue-500/8 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
          <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2 text-sm">💡 Offline Video Info</h3>
          <ul className="text-xs text-gray-600 dark:text-slate-400 space-y-1.5">
            <li>• ቪዲዮዎቹ metadata ን browser IndexedDB ውስጥ ይቀምጣሉ</li>
            <li>• ሙሉ offline playback ለ PWA Service Worker caching ያስፈልጋል</li>
            <li>• ሁሉም ቪዲዮዎች floating watermark ያካትታሉ (ስምዎ/ኢሜይልዎ)</li>
            <li>• Screen recording ን ለመቀነስ watermark ቦታው ይቀያየራል</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
