// ─── IndexedDB wrapper for offline data storage ───────────────────────────────
class OfflineDB {
    constructor() {
        this.dbName = 'AlphaFT';
        this.version = 1;
        this.db = null;
    }

    async open() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, this.version);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('courses'))
                    db.createObjectStore('courses', { keyPath: '_id' });
                if (!db.objectStoreNames.contains('enrollments'))
                    db.createObjectStore('enrollments', { keyPath: '_id' });
                if (!db.objectStoreNames.contains('user'))
                    db.createObjectStore('user', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('pendingActions'))
                    db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
                if (!db.objectStoreNames.contains('quizzes'))
                    db.createObjectStore('quizzes', { keyPath: '_id' });
                if (!db.objectStoreNames.contains('notes'))
                    db.createObjectStore('notes', { keyPath: '_id' });
                if (!db.objectStoreNames.contains('downloadedLessons'))
                    db.createObjectStore('downloadedLessons', { keyPath: '_id' });
                if (!db.objectStoreNames.contains('quizResults'))
                    db.createObjectStore('quizResults', { keyPath: '_id' });
            };
            req.onsuccess = e => { this.db = e.target.result; resolve(this.db); };
            req.onerror   = () => reject(req.error);
        });
    }

    async put(store, data) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            tx.objectStore(store).put(data);
            tx.oncomplete = resolve;
            tx.onerror    = () => reject(tx.error);
        });
    }

    async putAll(store, items) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, 'readwrite');
            const os = tx.objectStore(store);
            items.forEach(item => os.put(item));
            tx.oncomplete = resolve;
            tx.onerror    = () => reject(tx.error);
        });
    }

    async get(store, key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const req = db.transaction(store).objectStore(store).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => reject(req.error);
        });
    }

    async getAll(store) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const req = db.transaction(store).objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => reject(req.error);
        });
    }

    async addPendingAction(action) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('pendingActions', 'readwrite');
            tx.objectStore('pendingActions').add({ ...action, timestamp: Date.now() });
            tx.oncomplete = resolve;
            tx.onerror    = () => reject(tx.error);
        });
    }

    async getPendingActions() {
        return this.getAll('pendingActions');
    }

    async clearPendingAction(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('pendingActions', 'readwrite');
            tx.objectStore('pendingActions').delete(id);
            tx.oncomplete = resolve;
            tx.onerror    = () => reject(tx.error);
        });
    }
}

const offlineDB = new OfflineDB();

// ─── Sync pending actions when back online ────────────────────────────────────
window.addEventListener('online', async () => {
    const pending = await offlineDB.getPendingActions();
    if (pending.length === 0) return;

    console.log(`[Offline] Syncing ${pending.length} pending actions...`);
    for (const action of pending) {
        try {
            await api.request(action.endpoint, {
                method: action.method,
                body: action.body ? JSON.stringify(action.body) : undefined
            });
            await offlineDB.clearPendingAction(action.id);
            console.log(`[Offline] Synced: ${action.endpoint}`);
        } catch (e) {
            console.error(`[Offline] Sync failed for ${action.endpoint}:`, e.message);
        }
    }
    toast?.success('Offline actions synced successfully!');
});
