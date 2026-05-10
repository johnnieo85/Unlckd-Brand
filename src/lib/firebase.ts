import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { doc, getDocFromServer, initializeFirestore, memoryLocalCache, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { safeStorage } from './utils';

const app = initializeApp(firebaseConfig);

// Try to initialize Firestore with safer settings if storage is blocked
let firestoreDb;
const isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const isIframe = (function() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

// Universal recommendation for AI Studio apps to avoid code=unavailable in nested iframes or proxies
console.info("Firestore: Using Long Polling mode for maximum reliability in iFrame/AI Studio.");
firestoreDb = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache(), // safer default for sandboxed preview
}, firebaseConfig.firestoreDatabaseId);

export const db = firestoreDb;
export const auth = getAuth(app);

// Connectivity Test & Fallback (Proactive)
async function validateFirestoreConnection() {
  try {
    // Attempt a simple read from a dummy path to verify connectivity
    await getDocFromServer(doc(db, '_connection_test', 'status'));
    console.info("Firestore: Connection reached the backend.");
  } catch (error: any) {
    // If the error is permission-denied, it means the connection is actually working!
    if (error.code === 'permission-denied' || error.message?.includes('permission-denied')) {
      console.info("Firestore: Connection verified (received permission-denied as expected).");
      return;
    }

    console.warn("Firestore: Initial connection failed or unreachable:", error);
    
    // If it's a connectivity/availability error, log it as a network issue
    if (error.code === 'unavailable' || error.message?.includes('network')) {
      console.error("Firestore: Backend is currently unavailable or network is blocked.");
    }
  }
}

validateFirestoreConnection();

// Initialize persistence as early as possible and handle security errors
const tryPersistence = async () => {
  try {
    // Try local persistence first
    await setPersistence(auth, browserLocalPersistence);
    console.info("Auth: Local persistence initialized successfully.");
  } catch (e: any) {
    console.warn("Auth: Local persistence blocked or failed, trying in-memory:", e);
    try {
      // Small Delay before fallback
      await new Promise(r => setTimeout(r, 100));
      await setPersistence(auth, inMemoryPersistence);
      console.warn("Auth: Using in-memory persistence. Sign-in will NOT survive page reloads (Redirect will fail).");
    } catch (memErr) {
      console.error("Auth: All persistence types failed", memErr);
    }
  }
};

tryPersistence();
