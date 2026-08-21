import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, Timestamp, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { DailyLog, Measurement, SavedReport } from '../types';
import { getPlanDurationWeeks, cleanFirestoreData } from '../lib/utils';
import { parseBodyFatPercentage } from '../lib/bodyFat';

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
  const errMsg = error instanceof Error ? error.message : String(error);
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };

  if (isOffline || errMsg.includes('offline') || errMsg.includes('client is offline')) {
    console.info('Firestore offline operation notice:', operationType, path, errMsg);
    return; // Don't throw fatal error when operating offline
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
      await setDoc(docRef, cleanFirestoreData({
        ...data,
        id: date,
        date,
        lastUpdated: Timestamp.now()
      }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getLatestMeasurements(limitCount = 50): Promise<Measurement[]> {
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
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as Measurement;
        if (data.bodyFat !== undefined && data.bodyFat !== null) {
          const parsed = parseBodyFatPercentage(data.bodyFat);
          data.bodyFat = parsed !== null ? parsed : undefined;
        }
        return data;
      });
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
      await setDoc(docRef, cleanFirestoreData({
        ...data,
        id,
        timestamp: new Date().toISOString()
      }));
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
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as DailyLog);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getDailyLogsRange(days: number): Promise<DailyLog[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return this.getLogsInRange(startStr, endStr);
  },

  async getAllDailyLogs(): Promise<DailyLog[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const path = `users/${user.uid}/dailyLogs`;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'dailyLogs'),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as DailyLog);
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
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as Measurement;
        if (data.bodyFat !== undefined && data.bodyFat !== null) {
          const parsed = parseBodyFatPercentage(data.bodyFat);
          data.bodyFat = parsed !== null ? parsed : undefined;
        }
        return data;
      });
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

  async importAllReportsToHub(reports?: SavedReport[]): Promise<{ logsUpdated: number; measurementsAdded: number }> {
    const user = auth.currentUser;
    if (!user) return { logsUpdated: 0, measurementsAdded: 0 };

    const { checkReportOverlaps } = await import('../utils/reportOverlap');
    const { historyService } = await import('./historyService');

    let reportsToProcess = reports ? [...reports] : [];
    if (reportsToProcess.length === 0) {
      reportsToProcess = await historyService.getReports();
    } else if (reportsToProcess.length === 1) {
      // Fetch all reports to check for conflicts with existing saved reports
      const existing = await historyService.getReports();
      const existingIds = new Set(reportsToProcess.map(r => r.id));
      for (const r of existing) {
        if (!existingIds.has(r.id)) {
          reportsToProcess.push(r);
        }
      }
    }

    if (!reportsToProcess || reportsToProcess.length === 0) {
      return { logsUpdated: 0, measurementsAdded: 0 };
    }

    // Enforce no overlapping days allowed between full transformation reports
    const conflicts = checkReportOverlaps(reportsToProcess);
    if (conflicts.length > 0) {
      const conflictLines = conflicts.map(c => {
        const name1 = c.report1.userData?.name || 'Report 1';
        const name2 = c.report2.userData?.name || 'Report 2';
        return `• "${name1}" (${c.range1.startISO} to ${c.range1.endISO}) overlaps with "${name2}" (${c.range2.startISO} to ${c.range2.endISO}) by ${c.overlapDays} days.`;
      }).join('\n');

      throw new Error(`OVERLAP_CONFLICT:\nNo overlapping days allowed from full transformation reports to prevent conflicting information.\n\nOverlapping Reports Detected:\n${conflictLines}\n\nPlease delete one of the conflicting reports from your Saved Reports history before syncing.`);
    }

    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return new Date();
      const parts = dateStr.split('-');
      if (parts.length < 3) return new Date();
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };

    const getReportDateString = (report: SavedReport): string => {
      if (report.userData?.planStartDate) {
        return report.userData.planStartDate;
      }
      if (report.timestamp) {
        if (typeof report.timestamp.toDate === 'function') {
          return getLocalDateString(report.timestamp.toDate());
        }
        if (typeof report.timestamp === 'string') {
          return report.timestamp.split('T')[0];
        }
        if (typeof report.timestamp === 'number') {
          return getLocalDateString(new Date(report.timestamp));
        }
      }
      return getLocalDateString(new Date());
    };

    const parseStepGoal = (stepStr?: string): number => {
      if (!stepStr) return 10000;
      const cleaned = stepStr.replace(/[^0-9]/g, '');
      const parsed = parseInt(cleaned, 10);
      return isNaN(parsed) || parsed <= 0 ? 10000 : parsed;
    };

    const parseWaterGoal = (waterStr?: string): number => {
      if (!waterStr) return 3000;
      const num = parseFloat(waterStr.replace(/[^0-9.]/g, ''));
      if (isNaN(num) || num <= 0) return 3000;
      if (num < 20) return Math.round(num * 1000);
      return Math.round(num);
    };

    const parseSleepGoal = (sleepStr?: string): number => {
      if (!sleepStr) return 8;
      const num = parseFloat(sleepStr.replace(/[^0-9.]/g, ''));
      return isNaN(num) || num <= 0 ? 8 : num;
    };

    // Helper to parse individual exercise items from strings or objects
    const parseExerciseItem = (rawEx: any, defaultSets = '3', defaultReps = '10') => {
      if (rawEx && typeof rawEx === 'object') {
        const cleanName = String(rawEx.name || '')
          .replace(/https?:\/\/[^\s\)]+/gi, '')
          .replace(/[\[\]\(\)]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return {
          name: cleanName || rawEx.name || 'Exercise',
          sets: String(rawEx.sets || defaultSets),
          reps: String(rawEx.reps || defaultReps),
          videoUrl: rawEx.videoUrl || null,
          notes: rawEx.notes || ''
        };
      }
      const str = String(rawEx || '').trim().replace(/^[-*•]\s*/, '');
      if (!str) return null;

      const urlMatch = str.match(/https?:\/\/[^\s\)]+/i);
      const videoUrl = urlMatch ? urlMatch[0] : null;

      const textClean = str.replace(/https?:\/\/[^\s\)]+/gi, '').replace(/[\[\]\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
      const match = textClean.match(/(\d+)\s*x\s*(\d+(?:-\d+)?)/i) || textClean.match(/(\d+)\s*sets?\s*(?:of)?\s*(\d+)/i);

      let sets = defaultSets;
      let reps = defaultReps;
      let name = textClean;

      if (match) {
        sets = match[1];
        reps = match[2];
        name = textClean.replace(match[0], '').trim();
      }

      return {
        name: name || 'Exercise',
        sets,
        reps,
        videoUrl,
        notes: ''
      };
    };

    // Sort reports chronologically ascending (oldest first so newest layer on top)
    const sortedReports = [...reportsToProcess].sort((a, b) => {
      const dateA = getReportDateString(a);
      const dateB = getReportDateString(b);
      return dateA.localeCompare(dateB);
    });

    let logsUpdated = 0;
    let measurementsAdded = 0;

    // 1. Process Body Measurements & Weight Records
    for (const report of sortedReports) {
      const unit: 'kg' | 'lbs' = report.userData?.weightUnit === 'kg' ? 'kg' : 'lbs';

      // Main report weight & body fat
      const weightNum = parseFloat(report.userData?.weight || '');
      const bodyFatRaw = report.report?.healthMetrics?.estimatedBodyFat || '';
      const bodyFatNum = parseBodyFatPercentage(bodyFatRaw);
      const mainDate = getReportDateString(report);

      if (!isNaN(weightNum) && weightNum > 0 && mainDate) {
        await this.addMeasurement({
          date: mainDate,
          weight: weightNum,
          bodyFat: bodyFatNum !== null ? bodyFatNum : undefined,
          units: { weight: unit, length: 'in' }
        });
        await this.updateDailyLog(mainDate, { weight: weightNum, weightUnit: unit });
        measurementsAdded++;
      }

      // Before & After Progress Photos weights
      if (report.progressPhotos) {
        const { beforeDate, beforeWeight, afterDate, afterWeight } = report.progressPhotos;
        if (beforeDate && beforeWeight) {
          const bw = parseFloat(beforeWeight);
          if (!isNaN(bw) && bw > 0) {
            await this.addMeasurement({
              date: beforeDate,
              weight: bw,
              units: { weight: unit, length: 'in' }
            });
            await this.updateDailyLog(beforeDate, { weight: bw, weightUnit: unit });
            measurementsAdded++;
          }
        }
        if (afterDate && afterWeight) {
          const aw = parseFloat(afterWeight);
          if (!isNaN(aw) && aw > 0) {
            await this.addMeasurement({
              date: afterDate,
              weight: aw,
              units: { weight: unit, length: 'in' }
            });
            await this.updateDailyLog(afterDate, { weight: aw, weightUnit: unit });
            measurementsAdded++;
          }
        }
      }
    }

    // 2. Process Workout & Meal Plans into Daily Logs
    for (const report of sortedReports) {
      const startDateStr = getReportDateString(report);
      if (!startDateStr) continue;

      const numWeeks = getPlanDurationWeeks(report.userData?.planDuration);
      const count = numWeeks * 7;
      const baseDate = parseLocalDate(startDateStr);

      const stepGoal = parseStepGoal(report.report?.stepGoals);
      const waterGoal = parseWaterGoal(
        report.report?.hydrationTargets || 
        (report.report?.waterSchedule ? report.report.waterSchedule.join(' ') : '')
      );
      const sleepGoal = parseSleepGoal(report.report?.sleepRecommendation?.duration);

      for (let i = 0; i < count; i++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + i);
        const iso = getLocalDateString(d);

        // Retrieve existing log to preserve previously entered exercise weights/reps/setRows
        const existingLog = await this.getDailyLog(iso);
        const existingWorkoutData = existingLog?.workoutData || {};
        const newWorkoutData: Record<string, any> = { ...existingWorkoutData };

        const updates: Partial<DailyLog> = {
          stepGoal,
          waterGoal,
          sleepGoal
        };

        // Workout plan mapping
        if (report.report?.workoutPlan && report.report.workoutPlan.length > 0) {
          const weekIdx = Math.max(0, Math.min(Math.floor(i / 7), report.report.workoutPlan.length - 1));
          const weekData = report.report.workoutPlan[weekIdx] || report.report.workoutPlan[0];
          if (weekData?.days && weekData.days.length > 0) {
            const dOfPlan = i % 7;
            const workout = weekData.days[dOfPlan % weekData.days.length];
            if (workout) {
              const warmUpList: any[] = Array.isArray(workout.warmUp)
                ? workout.warmUp
                : String(workout.warmUp || '').split(/\n|,/).filter(Boolean);
              
              const mainWorkList: any[] = Array.isArray(workout.mainWork)
                ? workout.mainWork
                : String(workout.mainWork || '').split('\n').filter(Boolean);

              const warmUpStr = Array.isArray(workout.warmUp)
                ? workout.warmUp.map((ex: any) => `${ex.name} (${ex.videoUrl || ''})`).join('\n')
                : (workout.warmUp || '');
              const mainWorkStr = Array.isArray(workout.mainWork)
                ? workout.mainWork.map((ex: any) => `${ex.name} [${ex.sets || 3}x${ex.reps || 10}] (${ex.videoUrl || ''})`).join('\n')
                : (workout.mainWork || '');

              updates.manualWorkout = {
                focus: workout.focus || '',
                warmUp: warmUpStr,
                mainWork: mainWorkStr
              };
              updates.useManualWorkout = false;

              // Populate exercise structured workoutData
              warmUpList.forEach((exItem: any, idx: number) => {
                const key = `warmup-${idx}`;
                const parsed = parseExerciseItem(exItem, '2', '10');
                if (!parsed) return;
                const existingEx = existingWorkoutData[key] || {};
                const setsNum = parseInt(existingEx.sets || parsed.sets || '2') || 2;
                const defaultReps = existingEx.reps || parsed.reps || '10';
                const existingSetRows = Array.isArray(existingEx.setRows) ? existingEx.setRows : [];
                const setRows = existingSetRows.length > 0 
                  ? existingSetRows 
                  : Array.from({ length: setsNum }, () => ({ reps: defaultReps, weight: existingEx.weight || '', completed: existingEx.completed || false }));

                newWorkoutData[key] = {
                  name: parsed.name,
                  sets: String(setsNum),
                  reps: defaultReps,
                  videoUrl: parsed.videoUrl || existingEx.videoUrl || '',
                  weight: existingEx.weight || '',
                  notes: existingEx.notes || parsed.notes || '',
                  completed: existingEx.completed || (setRows.length > 0 && setRows.every((sr: any) => sr.completed)),
                  setRows,
                  ...existingEx
                };
              });

              mainWorkList.forEach((exItem: any, idx: number) => {
                const key = `main-${idx}`;
                const parsed = parseExerciseItem(exItem, '3', '10');
                if (!parsed) return;
                const existingEx = existingWorkoutData[key] || {};
                const setsNum = parseInt(existingEx.sets || parsed.sets || '3') || 3;
                const defaultReps = existingEx.reps || parsed.reps || '10-12';
                const existingSetRows = Array.isArray(existingEx.setRows) ? existingEx.setRows : [];
                const setRows = existingSetRows.length > 0 
                  ? existingSetRows 
                  : Array.from({ length: setsNum }, () => ({ reps: defaultReps, weight: existingEx.weight || '', completed: existingEx.completed || false }));

                newWorkoutData[key] = {
                  name: parsed.name,
                  sets: String(setsNum),
                  reps: defaultReps,
                  videoUrl: parsed.videoUrl || existingEx.videoUrl || '',
                  weight: existingEx.weight || '',
                  notes: existingEx.notes || parsed.notes || '',
                  completed: existingEx.completed || (setRows.length > 0 && setRows.every((sr: any) => sr.completed)),
                  setRows,
                  ...existingEx
                };
              });

              updates.workoutData = newWorkoutData;
            }
          }
        }

        // Meal plan mapping
        if (report.report?.mealPlan && report.report.mealPlan.length > 0) {
          const weekIdx = Math.max(0, Math.min(Math.floor(i / 7), report.report.mealPlan.length - 1));
          const weekData = report.report.mealPlan[weekIdx] || report.report.mealPlan[0];
          if (weekData?.days && weekData.days.length > 0) {
            const dOfPlan = i % 7;
            const meals = weekData.days[dOfPlan % weekData.days.length];
            if (meals) {
              updates.meals = [
                { name: `Breakfast: ${meals.breakfast}`, calories: meals.breakfastMacros?.calories || '0', protein: meals.breakfastMacros?.protein || '0', carbs: meals.breakfastMacros?.carbs || '0', fat: meals.breakfastMacros?.fat || '0', type: 'breakfast' as const, completed: false, url: meals.breakfastUrl },
                { name: `Lunch: ${meals.lunch}`, calories: meals.lunchMacros?.calories || '0', protein: meals.lunchMacros?.protein || '0', carbs: meals.lunchMacros?.carbs || '0', fat: meals.lunchMacros?.fat || '0', type: 'lunch' as const, completed: false, url: meals.lunchUrl },
                { name: `Dinner: ${meals.dinner}`, calories: meals.dinnerMacros?.calories || '0', protein: meals.dinnerMacros?.protein || '0', carbs: meals.dinnerMacros?.carbs || '0', fat: meals.dinnerMacros?.fat || '0', type: 'dinner' as const, completed: false, url: meals.dinnerUrl },
                { name: `Snack: ${meals.snack}`, calories: meals.snackMacros?.calories || '0', protein: meals.snackMacros?.protein || '0', carbs: meals.snackMacros?.carbs || '0', fat: meals.snackMacros?.fat || '0', type: 'snack' as const, completed: false, url: meals.snackUrl }
              ];
              updates.useManualNutrition = false;
            }
          }
        }

        await this.updateDailyLog(iso, updates);
        logsUpdated++;
      }
    }

    return { logsUpdated, measurementsAdded };
  },

  async syncPlanToHub(report: SavedReport): Promise<void> {
    await this.importAllReportsToHub([report]);
  }
};
