import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, inMemoryPersistence, browserPopupRedirectResolver, getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config';

const app = initializeApp(firebaseConfig);

// Try to initialize Firestore with safer settings if storage is blocked
let firestoreDb;

// Universal recommendation for AI Studio apps to avoid code=unavailable in nested iframes or proxies
console.info("Firestore: Using Long Polling mode for maximum reliability in iFrame/AI Studio.");
firestoreDb = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache(), // safer default for sandboxed preview
}, firebaseConfig.firestoreDatabaseId);

export const db = firestoreDb;

// Check if storage and IndexedDB are fully accessible without throwing security errors
const isStorageAvailable = () => {
  try {
    // Check if we can reference window.localStorage without throwing
    const storage = window.localStorage;
    if (!storage) return false;
    
    // Check if we can perform a basic write/read/delete
    const testKey = '__auth_test_key__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    
    // Check window.indexedDB safely. In Safari, referencing window.indexedDB in a restricted context throws
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      const idb = window.indexedDB;
      if (!idb) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

// Initialize Firebase Auth safely
let safeAuth;
try {
  if (isStorageAvailable()) {
    try {
      safeAuth = initializeAuth(app, {
        persistence: [browserLocalPersistence, inMemoryPersistence],
        popupRedirectResolver: browserPopupRedirectResolver
      });
      console.info("Auth: Safely initialized with local/memory persistence.");
    } catch (e) {
      console.warn("Auth: Failed initializeAuth with local persistence, falling back to memory:", e);
      safeAuth = initializeAuth(app, {
        persistence: inMemoryPersistence,
        popupRedirectResolver: browserPopupRedirectResolver
      });
    }
  } else {
    console.warn("Auth: Storage/IndexedDB blocked or insecure. Initializing with memory persistence.");
    safeAuth = initializeAuth(app, {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver
    });
  }
} catch (e) {
  console.warn("Auth: initializeAuth error, falling back to getAuth(app):", e);
  safeAuth = getAuth(app);
}

export const auth = safeAuth;


