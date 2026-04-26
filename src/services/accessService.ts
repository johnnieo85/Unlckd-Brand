import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

import { UserProfile, Badge } from '../types';

export async function ensureUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const newProfile: UserProfile = {
      userId: user.uid,
      email: user.email || '',
      hasAccess: false, // Default to no access
      isPremium: false,
      createdAt: serverTimestamp(),
      badges: [],
      monthlyGoal: {
        title: "The Stepper Elite",
        description: "Achieve 10,000 steps daily for at least 75% of the month to unlock the elite status.",
        deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
        completed: false,
        badgeId: "stepper"
      }
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

export async function unlockPremium(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { isPremium: true }, { merge: true });
}
