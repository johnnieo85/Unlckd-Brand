import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  doc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SavedReport, Path, UserData, Photos, ProgressPhotos, AssessmentResult } from '../types';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

function handleFirestoreError(error: any, operation: FirestoreErrorInfo['operationType'], path: string | null): never {
  const authInfo = auth.currentUser ? {
    userId: auth.currentUser.uid,
    email: auth.currentUser.email || '',
    emailVerified: auth.currentUser.emailVerified,
    isAnonymous: auth.currentUser.isAnonymous,
    providerInfo: auth.currentUser.providerData.map(p => ({
      providerId: p.providerId,
      displayName: p.displayName || '',
      email: p.email || ''
    }))
  } : {
    userId: 'anonymous',
    email: '',
    emailVerified: false,
    isAnonymous: true,
    providerInfo: []
  };

  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown Firestore error',
    operationType: operation,
    path,
    authInfo
  };

  throw new Error(JSON.stringify(errorInfo));
}

export const historyService = {
  async saveReport(
    path: Path, 
    userData: UserData, 
    report: AssessmentResult, 
    photos: Photos, 
    progressPhotos?: ProgressPhotos
  ): Promise<string> {
    if (!auth.currentUser) throw new Error("User must be signed in to save reports");

    try {
      const docRef = await addDoc(collection(db, 'reports'), {
        userId: auth.currentUser.uid,
        id: crypto.randomUUID(),
        timestamp: serverTimestamp(),
        path,
        userData,
        report,
        photos,
        progressPhotos: progressPhotos || null
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, 'create', 'reports');
    }
  },

  async getReports(): Promise<SavedReport[]> {
    if (!auth.currentUser) return [];

    try {
      const q = query(
        collection(db, 'reports'), 
        where('userId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SavedReport[];
    } catch (error) {
      handleFirestoreError(error, 'list', 'reports');
    }
  },

  async deleteReport(reportId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (error) {
      handleFirestoreError(error, 'delete', `reports/${reportId}`);
    }
  },

  async importReport(data: Omit<SavedReport, 'id' | 'timestamp' | 'userId'>): Promise<string> {
    if (!auth.currentUser) throw new Error("User must be signed in to import reports");

    try {
      const docRef = await addDoc(collection(db, 'reports'), {
        ...data,
        userId: auth.currentUser.uid,
        id: crypto.randomUUID(),
        timestamp: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, 'create', 'reports');
    }
  },

  async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error: any) {
      if (error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  }
};
