/**
 * offlineDB.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight IndexedDB wrapper for offline video storage.
 * Videos are stored as metadata only — raw URLs / file blobs are NEVER
 * written to the device gallery or file system. Everything lives inside
 * the browser's sandboxed IndexedDB, inaccessible to other apps.
 *
 * Stores:
 *  • "videos"  — offline video metadata (id, title, youtubeId, savedAt …)
 *  • "courses" — cached course objects for offline browsing
 */

const DB_NAME    = 'alpha-offline-db'
const DB_VERSION = 2

const STORES = {
  videos:  { keyPath: 'id' },
  courses: { keyPath: '_id' },
}

// ── Open / upgrade the database ───────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      Object.entries(STORES).forEach(([name, opts]) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, opts)
        }
      })
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ── CRUD helpers ──────────────────────────────────────────────────────────────

async function put(storeName, record) {
  const db    = await openDB()
  const tx    = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  store.put(record)
  return new Promise((res, rej) => {
    tx.oncomplete = () => res(true)
    tx.onerror    = () => rej(tx.error)
  })
}

async function get(storeName, key) {
  const db    = await openDB()
  const tx    = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)
  const req   = store.get(key)
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result || null)
    req.onerror   = () => rej(req.error)
  })
}

async function getAll(storeName) {
  const db    = await openDB()
  const tx    = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)
  const req   = store.getAll()
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result || [])
    req.onerror   = () => rej(req.error)
  })
}

async function remove(storeName, key) {
  const db    = await openDB()
  const tx    = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  store.delete(key)
  return new Promise((res, rej) => {
    tx.oncomplete = () => res(true)
    tx.onerror    = () => rej(tx.error)
  })
}

async function count(storeName) {
  const db    = await openDB()
  const tx    = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)
  const req   = store.count()
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}

export const offlineDB = { put, get, getAll, delete: remove, count }
