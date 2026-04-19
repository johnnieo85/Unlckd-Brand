import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  userId: string;
  email: string;
  hasAccess: boolean;
  createdAt: any;
}

export async function ensureUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const newProfile: UserProfile = {
      userId: user.uid,
      email: user.email || '',
      hasAccess: false, // Default to no access
      createdAt: serverTimestamp()
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }

  return userSnap.data() as UserProfile;
}

export async function checkUserAccess(userId: string): Promise<boolean> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data().hasAccess === true;
  }
  
  return false;
}
