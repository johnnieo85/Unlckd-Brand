/**
 * Centralized IndexedDB Abstraction
 * Manages offline photo upload queue and device offline settings
 */

const DB_NAME = 'unlckd_pro_offline_db';
const DB_VERSION = 1;

export interface QueuedUploadItem {
  id: string; // queue ID
  userId: string; // authenticated user ID
  storagePath: string; // intended Firebase Storage path
  imageBlob: Blob; // local Blob
  fileName: string; // original file name
  contentType: string; // mime type
  timestamp: number; // created timestamp ms
  assessmentId?: string; // associated assessment/report/checkin ID
  photoType: 'physique_front' | 'physique_side' | 'physique_back' | 'progress_before' | 'progress_after' | 'other';
  status: 'waiting' | 'uploading' | 'error' | 'synced';
  retryCount: number;
  lastError?: string;
}

export interface OfflineDeviceSettings {
  availableOfflineOnThisDevice: boolean;
  lastSyncTimestamp?: number;
}

class OfflineIndexedDb {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Object store for upload queue
          if (!db.objectStoreNames.contains('uploadQueue')) {
            const queueStore = db.createObjectStore('uploadQueue', { keyPath: 'id' });
            queueStore.createIndex('userId', 'userId', { unique: false });
            queueStore.createIndex('status', 'status', { unique: false });
            queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // Object store for offline settings and metadata
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error || new Error('Failed to open IndexedDB'));
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  // ==========================================
  // Upload Queue Operations
  // ==========================================

  public async addToUploadQueue(item: QueuedUploadItem): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('uploadQueue', 'readwrite');
      const store = tx.objectStore('uploadQueue');
      const req = store.put(item);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getUploadQueueItems(userId?: string): Promise<QueuedUploadItem[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('uploadQueue', 'readonly');
      const store = tx.objectStore('uploadQueue');

      if (userId) {
        const index = store.index('userId');
        const req = index.getAll(userId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      }
    });
  }

  public async getPendingUploadsCount(userId?: string): Promise<number> {
    try {
      const items = await this.getUploadQueueItems(userId);
      return items.filter(i => i.status === 'waiting' || i.status === 'error' || i.status === 'uploading').length;
    } catch {
      return 0;
    }
  }

  public async updateUploadQueueItem(item: Partial<QueuedUploadItem> & { id: string }): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('uploadQueue', 'readwrite');
      const store = tx.objectStore('uploadQueue');
      const getReq = store.get(item.id);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          return resolve();
        }
        const updated = { ...existing, ...item };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  public async removeFromUploadQueue(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('uploadQueue', 'readwrite');
      const store = tx.objectStore('uploadQueue');
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async clearUserUploadQueue(userId: string): Promise<void> {
    const items = await this.getUploadQueueItems(userId);
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('uploadQueue', 'readwrite');
      const store = tx.objectStore('uploadQueue');

      items.forEach((item) => {
        store.delete(item.id);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==========================================
  // Settings & Preferences Operations
  // ==========================================

  public async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get(key);

        req.onsuccess = () => {
          if (req.result && 'value' in req.result) {
            resolve(req.result.value as T);
          } else {
            resolve(defaultValue);
          }
        };

        req.onerror = () => resolve(defaultValue);
      });
    } catch {
      return defaultValue;
    }
  }

  public async setSetting<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        const req = store.put({ key, value, updatedAt: Date.now() });

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to set setting in IndexedDB:', e);
    }
  }
}

export const offlineIndexedDb = new OfflineIndexedDb();
