import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Try to initialize Firestore with safer settings if default fails or if storage is blocked
let firestoreDb;
try {
  // Test if we can access the storage system at all
  localStorage.getItem('test'); 
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.warn("Storage blocked or Standard Firestore initialization failed, using memory mode:", e);
  // Force memory-only cache if storage/IndexedDB is blocked
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache()
  }, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;
export const auth = getAuth(app);

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
