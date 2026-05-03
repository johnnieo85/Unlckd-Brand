import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Try to initialize Firestore with safer settings if default fails
let firestoreDb;
try {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.warn("Standard Firestore initialization failed, trying safe mode:", e);
  // Disable persistence for firestore if storage is blocked
  firestoreDb = initializeFirestore(app, {
    localCache: undefined // Disables offline persistence (IndexedDB)
  }, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;
export const auth = getAuth(app);

// Initialize persistence as early as possible and handle security errors
const tryPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e: any) {
    console.warn("Auth: Local persistence blocked, trying in-memory:", e);
    try {
      await setPersistence(auth, inMemoryPersistence);
      console.info("Auth: Using in-memory persistence (session will reset on refresh)");
    } catch (memErr) {
      console.error("Auth: All persistence types failed", memErr);
    }
  }
};

tryPersistence();
