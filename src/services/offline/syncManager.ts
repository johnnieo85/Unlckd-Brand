/**
 * Centralized Sync Manager
 * Coordinates offline synchronization, network state, Firestore status, and Photo Upload Queue
 */

import { networkStatus } from './networkStatus';
import { uploadQueue } from './uploadQueue';
import { auth } from '../../lib/firebase';

export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNCED' | 'SYNC_ERROR';

export interface SyncStatusInfo {
  state: SyncState;
  isOnline: boolean;
  pendingPhotosCount: number;
  lastSyncedAt: number | null;
  errorMessage: string | null;
}

type SyncStatusListener = (status: SyncStatusInfo) => void;

class SyncManager {
  private syncState: SyncState = 'ONLINE';
  private lastSyncedAt: number | null = Date.now();
  private errorMessage: string | null = null;
  private pendingPhotosCount: number = 0;
  private listeners: Set<SyncStatusListener> = new Set();
  private syncTimeoutTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Listen for network status changes
      networkStatus.subscribe((isOnline) => {
        if (!isOnline) {
          this.setSyncState('OFFLINE');
        } else {
          this.triggerSync('network_reconnected');
        }
      });

      // 2. Listen for upload queue changes
      uploadQueue.subscribe((pendingCount) => {
        this.pendingPhotosCount = pendingCount;
        this.notify();
      });

      // 3. Listen for app foreground / visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && networkStatus.getIsOnline()) {
          this.triggerSync('app_foreground');
        }
      });

      window.addEventListener('focus', () => {
        if (networkStatus.getIsOnline()) {
          this.triggerSync('window_focus');
        }
      });
    }
  }

  /**
   * Trigger full synchronization of pending queues
   */
  public async triggerSync(reason: string = 'manual'): Promise<void> {
    if (!networkStatus.getIsOnline()) {
      this.setSyncState('OFFLINE');
      return;
    }

    this.setSyncState('SYNCING');
    this.errorMessage = null;

    try {
      // Process photo upload queue
      const { failed } = await uploadQueue.processQueue();

      if (failed > 0) {
        this.errorMessage = `${failed} photo(s) pending retry`;
        this.setSyncState('SYNC_ERROR');
      } else {
        this.lastSyncedAt = Date.now();
        this.setSyncState('SYNCED');

        // After displaying ALL CHANGES SYNCED for 3.5 seconds, settle to normal ONLINE state
        if (this.syncTimeoutTimer) clearTimeout(this.syncTimeoutTimer);
        this.syncTimeoutTimer = setTimeout(() => {
          if (this.syncState === 'SYNCED') {
            this.setSyncState('ONLINE');
          }
        }, 3500);
      }
    } catch (err: any) {
      console.warn('SyncManager error:', err);
      this.errorMessage = err?.message || 'Sync issue';
      this.setSyncState('SYNC_ERROR');
    }
  }

  private setSyncState(newState: SyncState) {
    this.syncState = newState;
    this.notify();
  }

  public getStatus(): SyncStatusInfo {
    return {
      state: this.syncState,
      isOnline: networkStatus.getIsOnline(),
      pendingPhotosCount: this.pendingPhotosCount,
      lastSyncedAt: this.lastSyncedAt,
      errorMessage: this.errorMessage
    };
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('SyncManager listener error:', err);
      }
    });
  }
}

export const syncManager = new SyncManager();
