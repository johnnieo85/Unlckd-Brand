import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

import { UserProfile, SubscriptionPlanType, BillingCycleType, SubscriptionStatusType, ClientCountBand } from '../types';

export async function ensureUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  const defaultRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const userEmail = user.email || '';
  const emailIdentifier = userEmail || user.displayName || user.uid;
  const sanitizedEmailTag = (userEmail || user.uid).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 24);

  if (!userSnap.exists()) {
    const newProfile: UserProfile = {
      userId: user.uid,
      email: userEmail,
      fullName: emailIdentifier,
      displayName: emailIdentifier,
      hasAccess: true, // Standard user access granted
      isPremium: false,
      createdAt: serverTimestamp(),
      badges: [],
      plan: 'free',
      billingCycle: 'monthly',
      renewalDate: defaultRenewalDate,
      status: 'active',
      clientBand: '1-5',
      cancelAtPeriodEnd: false,
      subscriptionId: `sub_free_${sanitizedEmailTag}`,
      monthlyGoal: {
        title: "The Stepper May Mission",
        description: "Average 10,000 steps daily throughout May to unlock the elite status.",
        deadline: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
        completed: false,
        badgeId: "stepper"
      }
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }

  const existingData = userSnap.data() as UserProfile;
  
  // Update identification if fullName/displayName/email is missing or uses placeholder name
  const isPlaceholderName = !existingData.fullName || 
                           existingData.fullName === 'User' || 
                           existingData.fullName === 'Marcus Vance' ||
                           existingData.fullName === 'User Profile';

  const needsIdentityUpdate = isPlaceholderName || 
                             (!existingData.email && userEmail) ||
                             !existingData.displayName;

  // Backfill subscription state if missing in existing profile
  const needsBackfill = !existingData.plan || !existingData.status || !existingData.renewalDate;

  if (needsBackfill || needsIdentityUpdate) {
    const defaultPlan: SubscriptionPlanType = existingData.isPremium ? 'pro' : 'free';
    const resolvedFullName = !isPlaceholderName && existingData.fullName 
      ? existingData.fullName 
      : (userEmail || existingData.fullName || user.displayName || 'User');

    const updatedState: Partial<UserProfile> = {
      email: userEmail || existingData.email || '',
      fullName: resolvedFullName,
      displayName: userEmail || existingData.displayName || resolvedFullName,
      plan: existingData.plan || defaultPlan,
      billingCycle: existingData.billingCycle || 'monthly',
      renewalDate: existingData.renewalDate || defaultRenewalDate,
      status: existingData.status || 'active',
      clientBand: existingData.clientBand || '1-5',
      cancelAtPeriodEnd: existingData.cancelAtPeriodEnd ?? false,
      subscriptionId: existingData.subscriptionId || `sub_${defaultPlan}_${sanitizedEmailTag}`
    };
    await setDoc(userRef, updatedState, { merge: true });
    return { ...existingData, ...updatedState };
  }

  return existingData;
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, data, { merge: true });
}

export async function updateSubscriptionPlan(
  userId: string,
  params: {
    plan: SubscriptionPlanType;
    billingCycle: BillingCycleType;
    clientBand?: ClientCountBand;
    status?: SubscriptionStatusType;
    renewalDate?: string;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<UserProfile> {
  const userRef = doc(db, 'users', userId);
  const now = new Date();
  const nextRenewal = params.renewalDate || new Date(now.setDate(now.getDate() + (params.billingCycle === 'annual' ? 365 : 30))).toISOString().split('T')[0];
  const newStatus = params.status || 'active';

  const isPaid = params.plan === 'pro' || params.plan === 'coach';
  const isTrainer = params.plan === 'coach';

  const updateData: Partial<UserProfile> = {
    plan: params.plan,
    billingCycle: params.billingCycle,
    clientBand: params.clientBand || '1-5',
    status: newStatus,
    renewalDate: nextRenewal,
    cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
    subscriptionId: `sub_${params.plan}_${userId.slice(0, 8)}_${Date.now().toString().slice(-4)}`,
    hasAccess: true,
    isPremium: isPaid,
    membershipTier: isTrainer ? 'trainer' : 'standard'
  };

  await setDoc(userRef, updateData, { merge: true });
  
  const updatedSnap = await getDoc(userRef);
  return updatedSnap.data() as UserProfile;
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
  await setDoc(userRef, { isPremium: true, plan: 'pro', status: 'active' }, { merge: true });
}

export async function updateGymPin(userId: string, pin: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { gymPin: pin }, { merge: true });
}
