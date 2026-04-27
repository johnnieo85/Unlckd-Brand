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

  async getMeasurement(date: string): Promise<Measurement | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const path = `users/${user.uid}/measurements/${date}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'measurements', date);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Measurement;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async addMeasurement(data: Omit<Measurement, 'id' | 'timestamp'>): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const id = data.date;
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
  },

  async deleteMeasurement(id: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const path = `users/${user.uid}/measurements/${id}`;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'users', user.uid, 'measurements', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getLogsInRange(startDate: string, endDate: string): Promise<DailyLog[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const path = `users/${user.uid}/dailyLogs`;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'dailyLogs'),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => doc.data() as DailyLog);
      
      // Filter logically if needed, but for now just filter current fetched set
      return logs.filter(log => log.date >= startDate && log.date <= endDate);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getMeasurementsInRange(startDate: string, endDate: string): Promise<Measurement[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const path = `users/${user.uid}/measurements`;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'measurements'),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const measurements = querySnapshot.docs.map(doc => doc.data() as Measurement);
      
      return measurements.filter(m => m.date >= startDate && m.date <= endDate);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }
};
