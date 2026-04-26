import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { DailyLog, Measurement } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const gymService = {
  async getDailyLog(date: string): Promise<DailyLog | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const path = `users/${user.uid}/dailyLogs/${date}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'dailyLogs', date);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as DailyLog;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async updateDailyLog(date: string, data: Partial<DailyLog>): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const path = `users/${user.uid}/dailyLogs/${date}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'dailyLogs', date);
      await setDoc(docRef, {
        ...data,
        id: date,
        date,
        lastUpdated: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getLatestMeasurements(limitCount = 5): Promise<Measurement[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const path = `users/${user.uid}/measurements`;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'measurements'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Measurement);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async addMeasurement(data: Omit<Measurement, 'id' | 'timestamp'>): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const id = Date.now().toString();
    const path = `users/${user.uid}/measurements/${id}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'measurements', id);
      await setDoc(docRef, {
        ...data,
        id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
