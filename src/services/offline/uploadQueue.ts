/**
 * Offline Photo Upload Queue Service
 * Queues photos in IndexedDB when offline and processes uploads to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { storage, db, auth } from '../../lib/firebase';
import { offlineIndexedDb, QueuedUploadItem } from './indexedDb';
import { networkStatus } from './networkStatus';

type UploadQueueListener = (pendingCount: number, items: QueuedUploadItem[]) => void;

class UploadQueueService {
  private isProcessing: boolean = false;
  private listeners: Set<UploadQueueListener> = new Set();

  constructor() {
    // Listen for network changes to auto-drain queue
    networkStatus.subscribe((isOnline) => {
      if (isOnline) {
        this.processQueue();
      }
    });
  }

  /**
   * Enqueue a photo Blob for upload to Firebase Storage
   */
  public async enqueuePhoto(params: {
    imageBlob: Blob;
    fileName: string;
    photoType: QueuedUploadItem['photoType'];
    storagePath?: string;
    assessmentId?: string;
  }): Promise<QueuedUploadItem> {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'anonymous';
    const queueId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Default storage path if not specified
    const storagePath = params.storagePath || `users/${userId}/photos/${Date.now()}_${params.fileName}`;

    const queueItem: QueuedUploadItem = {
      id: queueId,
      userId,
      storagePath,
      imageBlob: params.imageBlob,
      fileName: params.fileName,
      contentType: params.imageBlob.type || 'image/jpeg',
      timestamp: Date.now(),
      assessmentId: params.assessmentId,
      photoType: params.photoType,
      status: 'waiting',
      retryCount: 0
    };

    await offlineIndexedDb.addToUploadQueue(queueItem);
    this.notifyListeners();

    // If we happen to be online right now, attempt processing immediately
    if (networkStatus.getIsOnline()) {
      this.processQueue().catch((err) => {
        console.warn('Immediate photo queue processing deferred:', err);
      });
    }

    return queueItem;
  }

  /**
   * Process all pending items in the upload queue
   */
  public async processQueue(): Promise<{ successful: number; failed: number }> {
    if (this.isProcessing) {
      return { successful: 0, failed: 0 };
    }

    if (!networkStatus.getIsOnline()) {
      console.info('UploadQueue: Skipping queue processing while offline.');
      return { successful: 0, failed: 0 };
    }

    if (!storage) {
      console.warn('UploadQueue: Firebase Storage is not initialized.');
      return { successful: 0, failed: 0 };
    }

    this.isProcessing = true;
    let successful = 0;
    let failed = 0;

    try {
      const user = auth.currentUser;
      const items = await offlineIndexedDb.getUploadQueueItems(user ? user.uid : undefined);
      const pendingItems = items.filter(
        (item) => item.status === 'waiting' || item.status === 'error'
      );

      for (const item of pendingItems) {
        if (!networkStatus.getIsOnline()) {
          console.info('UploadQueue: Network went offline during queue processing.');
          break;
        }

        try {
          await offlineIndexedDb.updateUploadQueueItem({
            id: item.id,
            status: 'uploading'
          });
          this.notifyListeners();

          // 1. Upload to Firebase Storage
          const storageRef = ref(storage, item.storagePath);
          const uploadResult = await uploadBytes(storageRef, item.imageBlob, {
            contentType: item.contentType
          });

          // 2. Obtain download URL
          const downloadUrl = await getDownloadURL(uploadResult.ref);

          // 3. Write metadata to Firestore if associated with user/assessment
          if (item.userId && item.userId !== 'anonymous') {
            try {
              const userRef = doc(db, 'users', item.userId);
              await setDoc(userRef, {
                lastPhotoUpload: {
                  url: downloadUrl,
                  storagePath: item.storagePath,
                  type: item.photoType,
                  timestamp: new Date().toISOString()
                }
              }, { merge: true });

              if (item.assessmentId) {
                const reportRef = doc(db, 'reports', item.assessmentId);
                await updateDoc(reportRef, {
                  [`photos.${item.photoType}`]: downloadUrl
                }).catch(() => {
                  // If report document is not created yet or different ID, handle gracefully
                });
              }
            } catch (firestoreMetaErr) {
              console.warn('UploadQueue: Metadata update note:', firestoreMetaErr);
            }
          }

          // 4. Delete local Blob ONLY after storage upload succeeded
          await offlineIndexedDb.removeFromUploadQueue(item.id);
          successful++;
          this.notifyListeners();
        } catch (err: any) {
          failed++;
          console.warn(`UploadQueue: Failed to upload item ${item.id}:`, err?.message || err);
          await offlineIndexedDb.updateUploadQueueItem({
            id: item.id,
            status: 'error',
            retryCount: item.retryCount + 1,
            lastError: err?.message || 'Network error during upload'
          });
          this.notifyListeners();
        }
      }
    } catch (queueErr) {
      console.error('UploadQueue: Queue processing error:', queueErr);
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }

    return { successful, failed };
  }

  /**
   * Get all items currently in queue
   */
  public async getQueueItems(): Promise<QueuedUploadItem[]> {
    const user = auth.currentUser;
    return offlineIndexedDb.getUploadQueueItems(user ? user.uid : undefined);
  }

  /**
   * Get pending count for current user
   */
  public async getPendingCount(): Promise<number> {
    const user = auth.currentUser;
    return offlineIndexedDb.getPendingUploadsCount(user ? user.uid : undefined);
  }

  /**
   * Retry a single failed item
   */
  public async retryItem(id: string): Promise<void> {
    await offlineIndexedDb.updateUploadQueueItem({
      id,
      status: 'waiting'
    });
    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Remove/cancel an item in queue
   */
  public async cancelItem(id: string): Promise<void> {
    await offlineIndexedDb.removeFromUploadQueue(id);
    this.notifyListeners();
  }

  public subscribe(listener: UploadQueueListener): () => void {
    this.listeners.add(listener);
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners() {
    try {
      const user = auth.currentUser;
      const items = await offlineIndexedDb.getUploadQueueItems(user ? user.uid : undefined);
      const pendingCount = items.filter(
        (i) => i.status === 'waiting' || i.status === 'uploading' || i.status === 'error'
      ).length;

      this.listeners.forEach((listener) => {
        try {
          listener(pendingCount, items);
        } catch (err) {
          console.error('UploadQueue listener error:', err);
        }
      });
    } catch {
      // Ignored if DB closed
    }
  }
}

export const uploadQueue = new UploadQueueService();
