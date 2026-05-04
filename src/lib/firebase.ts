import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { doc, getDocFromServer, initializeFirestore, memoryLocalCache, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Try to initialize Firestore with safer settings if storage is blocked
let firestoreDb;
const isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);

try {
  // Test if we can access the storage system at all
  localStorage.getItem('test'); 
  
  if (isApple) {
    // Proactively use long polling for Apple devices to avoid Websocket/gRPC issues in iframes
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
  } else {
    firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
} catch (e) {
  console.warn("Storage blocked or Standard Firestore initialization failed, using safe memory mode:", e);
  // Force memory-only cache and long polling if storage/IndexedDB is blocked
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
}

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
  } catch (e: any) {
    console.warn("Auth: Local persistence blocked, trying in-memory:", e);
    try {
      // Small Delay before fallback
      await new Promise(r => setTimeout(r, 100));
      await setPersistence(auth, inMemoryPersistence);
      console.info("Auth: Using in-memory persistence (session will reset on refresh)");
    } catch (memErr) {
      console.error("Auth: All persistence types failed", memErr);
    }
  }
};

tryPersistence();
