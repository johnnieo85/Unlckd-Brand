import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, inMemoryPersistence, browserPopupRedirectResolver, getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  persistentSingleTabManager, 
  memoryLocalCache 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Check if storage and IndexedDB are fully accessible without throwing security errors
export const isStorageAvailable = () => {
  try {
    if (typeof window === 'undefined') return false;
    const storage = window.localStorage;
    if (!storage) return false;
    
    const testKey = '__auth_test_key__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    
    if ('indexedDB' in window) {
      const idb = window.indexedDB;
      if (!idb) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

// Initialize Canonical Firestore instance with modern persistent local cache (multi-tab enabled)
let firestoreDb;
try {
  if (isStorageAvailable()) {
    try {
      firestoreDb = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, firebaseConfig.firestoreDatabaseId);
      console.info("Firestore: Initialized with persistent multi-tab local cache.");
    } catch (multiTabErr) {
      console.warn("Firestore: Multi-tab persistence failed, attempting single-tab persistent cache:", multiTabErr);
      try {
        firestoreDb = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentSingleTabManager({})
          })
        }, firebaseConfig.firestoreDatabaseId);
        console.info("Firestore: Initialized with persistent single-tab local cache.");
      } catch (singleTabErr) {
        console.warn("Firestore: Persistent cache fallback to memory cache:", singleTabErr);
        firestoreDb = initializeFirestore(app, {
          localCache: memoryLocalCache()
        }, firebaseConfig.firestoreDatabaseId);
      }
    }
  } else {
    console.warn("Firestore: Storage/IndexedDB unavailable, initializing with memory local cache.");
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache()
    }, firebaseConfig.firestoreDatabaseId);
  }
} catch (initErr) {
  console.warn("Firestore: initializeFirestore fallback to memory cache:", initErr);
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache()
  }, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;

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

// Initialize Firebase Storage
let safeStorage;
try {
  safeStorage = getStorage(app);
} catch (e) {
  console.warn("Firebase Storage init error:", e);
}

export const storage = safeStorage;
export { app };
