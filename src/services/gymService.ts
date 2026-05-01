import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { DailyLog, Measurement, SavedReport } from '../types';

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

  async getLatestMeasurements(limitCount = 1000): Promise<Measurement[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const path = `users/${user.uid}/measurements`;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'measurements'),
        orderBy('date', 'desc'),
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
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const measurements = querySnapshot.docs.map(doc => doc.data() as Measurement);
      
      return measurements.filter(m => m.date >= startDate && m.date <= endDate);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async clearLogsFromDate(startDate?: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const { deleteDoc } = await import('firebase/firestore');
      const q = query(
        collection(db, 'users', user.uid, 'dailyLogs'),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs
        .filter(doc => !startDate || doc.id >= startDate)
        .map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/dailyLogs`);
    }
  },

  async syncPlanToHub(report: SavedReport): Promise<void> {
    const user = auth.currentUser;
    if (!user || !report.userData?.planStartDate) return;

    // 1. Fresh hub: Clear ALL existing logs to start fresh
    await this.clearLogsFromDate();

    const startDate = report.userData.planStartDate;

    // 2. Populate data for 12 weeks (84 days)
    // We define helpers locally or pass them if needed. 
    // Here we need getLocalDateString and parseLocalDate equivalents or similar.
    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const parseLocalDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    const getWorkoutForDateIdx = (dateIso: string) => {
      if (!report.report.workoutPlan) return null;
      
      const baseStartDate = parseLocalDate(startDate);
      const startD = new Date(baseStartDate);
      startD.setHours(0, 0, 0, 0);

      const targetDate = parseLocalDate(dateIso);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - startD.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const weekIdx = Math.max(0, Math.min(Math.floor(diffDays / 7), 11));
      
      // Calculate day of plan (0-6) relative to start date
      const dOfPlan = diffDays % 7;

      const weekData = report.report.workoutPlan[weekIdx] || report.report.workoutPlan[0];
      if (!weekData?.days) return null;
      
      const planDays = weekData.days;
      
      // Try mapping dOfPlan to names if they follow Mon-Sun logic, 
      // but the user wants it to start exactly on startDate. 
      // So if startDate is Friday, then Day 0 of plan is Friday.
      
      // If the plan has exact day names, we might still want to respect them?
      // "populating workouts from the start date"
      
      // If I just use adjustedIndex = dOfPlan, then Day 1 of plan (index 0) 
      // always happens on the startDate.
      return planDays[dOfPlan % planDays.length];
    };

    const getMealsForDateIdx = (dateIso: string) => {
      if (!report.report.mealPlan) return null;
      
      const baseStartDate = parseLocalDate(startDate);
      const startD = new Date(baseStartDate);
      startD.setHours(0, 0, 0, 0);

      const targetDate = parseLocalDate(dateIso);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - startD.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const weekIdx = Math.max(0, Math.min(Math.floor(diffDays / 7), 11));
      const dOfPlan = diffDays % 7;

      const weekData = report.report.mealPlan[weekIdx] || report.report.mealPlan[0];
      if (!weekData?.days) return null;
      
      const planDays = weekData.days;
      return planDays[dOfPlan % planDays.length];
    };

    const count = 84; // 12 weeks
    const baseDate = parseLocalDate(startDate);
    
    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const iso = getLocalDateString(d);
      
      const workout = getWorkoutForDateIdx(iso);
      const meals = getMealsForDateIdx(iso);
      
      const updates: Partial<DailyLog> = {
        useManualWorkout: true
      };

      if (workout) {
        updates.manualWorkout = {
          focus: workout.focus || '',
          warmUp: workout.warmUp || '',
          mainWork: workout.mainWork || ''
        };
      }

      if (meals) {
        updates.meals = [
          { name: `Breakfast: ${meals.breakfast}`, calories: '0', protein: '0', carbs: '0', fat: '0', type: 'breakfast' as const, completed: false },
          { name: `Lunch: ${meals.lunch}`, calories: '0', protein: '0', carbs: '0', fat: '0', type: 'lunch' as const, completed: false },
          { name: `Dinner: ${meals.dinner}`, calories: '0', protein: '0', carbs: '0', fat: '0', type: 'dinner' as const, completed: false },
          { name: `Snack: ${meals.snack}`, calories: '0', protein: '0', carbs: '0', fat: '0', type: 'snack' as const, completed: false }
        ];
      }

      await this.updateDailyLog(iso, updates);
    }
  }
};
