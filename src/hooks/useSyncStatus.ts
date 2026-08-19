import { useState, useEffect } from 'react';
import { syncManager, SyncStatusInfo, SyncState } from '../services/offline/syncManager';
import { uploadQueue } from '../services/offline/uploadQueue';
import { QueuedUploadItem } from '../services/offline/indexedDb';

export interface UseSyncStatusReturn extends SyncStatusInfo {
  triggerSync: () => Promise<void>;
  queuedPhotos: QueuedUploadItem[];
  retryUpload: (id: string) => Promise<void>;
  cancelUpload: (id: string) => Promise<void>;
}

export function useSyncStatus(): UseSyncStatusReturn {
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>(syncManager.getStatus());
  const [queuedPhotos, setQueuedPhotos] = useState<QueuedUploadItem[]>([]);

  useEffect(() => {
    const unsubSync = syncManager.subscribe((info) => {
      setSyncInfo(info);
    });

    const unsubQueue = uploadQueue.subscribe((_, items) => {
      setQueuedPhotos(items);
    });

    return () => {
      unsubSync();
      unsubQueue();
    };
  }, []);

  return {
    ...syncInfo,
    triggerSync: () => syncManager.triggerSync('manual_user_action'),
    queuedPhotos,
    retryUpload: (id: string) => uploadQueue.retryItem(id),
    cancelUpload: (id: string) => uploadQueue.cancelItem(id)
  };
}
