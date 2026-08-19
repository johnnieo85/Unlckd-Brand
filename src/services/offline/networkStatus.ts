/**
 * Centralized Network Status Service
 * Listens for browser online/offline events and tests connectivity
 */

export type NetworkConnectionState = 'online' | 'offline' | 'checking';

type NetworkListener = (isOnline: boolean, state: NetworkConnectionState) => void;

class NetworkStatusService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private state: NetworkConnectionState = typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'online';
  private listeners: Set<NetworkListener> = new Set();
  private checkInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);

      // Periodic subtle connectivity check when online
      this.checkInterval = setInterval(() => {
        if (navigator.onLine) {
          this.verifyConnectivity();
        }
      }, 30000);
    }
  }

  private handleOnline = async () => {
    this.state = 'checking';
    this.notify();
    const verified = await this.verifyConnectivity();
    this.isOnline = verified;
    this.state = verified ? 'online' : 'offline';
    this.notify();
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.state = 'offline';
    this.notify();
  };

  /**
   * Verify real internet reachability with a fast lightweight check
   */
  public async verifyConnectivity(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOnline = false;
      this.state = 'offline';
      this.notify();
      return false;
    }

    try {
      // Use favicon or lightweight endpoint with cache-busting
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      
      const response = await fetch(`/index.html?_ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const reachable = response.ok || response.status === 304 || response.status === 200;
      if (this.isOnline !== reachable) {
        this.isOnline = reachable;
        this.state = reachable ? 'online' : 'offline';
        this.notify();
      }
      return reachable;
    } catch {
      // If HEAD request fails, we might still be offline
      const reachable = navigator.onLine; // fallback
      this.isOnline = reachable;
      this.state = reachable ? 'online' : 'offline';
      this.notify();
      return reachable;
    }
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public getState(): NetworkConnectionState {
    return this.state;
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.isOnline, this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isOnline, this.state);
      } catch (err) {
        console.error('NetworkStatus listener error:', err);
      }
    });
  }

  public cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
    }
    this.listeners.clear();
  }
}

export const networkStatus = new NetworkStatusService();
