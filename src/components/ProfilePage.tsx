import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Ruler, 
  Check, 
  Dumbbell, 
  History, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  Camera, 
  Trash2, 
  TrendingUp, 
  CreditCard, 
  Flame, 
  ArrowRight, 
  Edit3, 
  CheckCircle2, 
  Calendar,
  HardDrive
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { UnitToggle } from './UnitToggle';
import { WeightProgressionChart } from './WeightProgressionChart';
import { UserProfile, Badge as UserBadge, Measurement } from '../types';
import { cn } from '../lib/utils';
import { updateUserProfile } from '../services/accessService';
import { getLevelInfo } from '../lib/levels';
import { gymService } from '../services/gymService';
import { offlineIndexedDb } from '../services/offline/indexedDb';
import { 
  parseBodyFatPercentage, 
  calculateNavyBodyFat, 
  calculateBmiBodyFat, 
  resolveAthleteBodyFat 
} from '../lib/bodyFat';

interface ProfilePageProps {
  userProfile: UserProfile | null;
  userEmail?: string;
  userName?: string;
  onProfileUpdate: () => void;
  setActiveTab: (tab: 'reports' | 'gym' | 'client-hub') => void;
  setStep: (step: any) => void;
  loadHistory: () => Promise<void>;
  hasAccess: boolean;
  isPremium: boolean;
  onOpenLevelModal?: () => void;
  onOpenSubscriptionModal?: () => void;
}

const DEFAULT_YEAR_BADGES: UserBadge[] = [
  { id: 'b-1', name: 'Jan - New Dawn', icon: '🔥', description: 'Log 20 active days in January', unlockedAt: '' },
  { id: 'b-2', name: 'Feb - Heart & Iron', icon: '❤️', description: 'Complete 15 high-intensity sessions', unlockedAt: '' },
  { id: 'b-3', name: 'Mar - Spring Surge', icon: '🌱', description: 'Log 10,000 steps for 14 straight days', unlockedAt: '' },
  { id: 'b-4', name: 'Apr - Protein Mastery', icon: '🥩', description: 'Hit daily protein target 25 times', unlockedAt: '' },
  { id: 'b-5', name: 'May - Recomp Peak', icon: '⚡', description: 'Achieve 2% body fat reduction', unlockedAt: '' },
  { id: 'b-6', name: 'Jun - Summer Shred', icon: '☀️', description: 'Hydration goal streak for 21 days', unlockedAt: '' },
  { id: 'b-7', name: 'Jul - Iron Will', icon: '🏋️', description: '50 completed workout sessions', unlockedAt: '' },
  { id: 'b-8', name: 'Aug - Consistency Titan', icon: '👑', description: 'Active 30 consecutive days', unlockedAt: '' },
  { id: 'b-9', name: 'Sep - Autumn Strength', icon: '🍁', description: 'Increase compound lifts by 10%', unlockedAt: '' },
  { id: 'b-10', name: 'Oct - Octane Push', icon: '🎃', description: 'Burn 15,000 active calories', unlockedAt: '' },
  { id: 'b-11', name: 'Nov - Harvest Grind', icon: '🦃', description: 'Zero missed workout days in Nov', unlockedAt: '' },
  { id: 'b-12', name: 'Dec - Yearly Legend', icon: '🏆', description: 'Complete 12-month transformation cycle', unlockedAt: '' },
  { id: 'b-m1', name: 'Hydration Hero', icon: '💧', description: 'Logged over 100 gallons of water', unlockedAt: '' },
  { id: 'b-m2', name: 'Centurion', icon: '💯', description: 'Logged 100 total days in Gym Hub', unlockedAt: '' },
  { id: 'b-m3', name: 'Macro Ninja', icon: '🥗', description: 'Hit exact macros 30 days in a row', unlockedAt: '' },
  { id: 'b-m4', name: 'Trainer Certified', icon: '⭐', description: 'Unlocked UNLCKD Pro Trainer Tier', unlockedAt: '' },
];

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  userEmail,
  userName,
  onProfileUpdate,
  setActiveTab,
  setStep,
  loadHistory,
  hasAccess,
  isPremium,
  onOpenLevelModal,
  onOpenSubscriptionModal
}) => {
  const isTrainer = userProfile?.membershipTier === 'trainer' || userProfile?.plan === 'coach';

  // State for editable profile identity
  const [fullName, setFullName] = useState(userProfile?.fullName || userName || 'Marcus Vance');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');
  const [age, setAge] = useState<string | number>(userProfile?.age || '28');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingMeasurements, setIsEditingMeasurements] = useState(false);
  const [isAllBadgesExpanded, setIsAllBadgesExpanded] = useState(false);

  // State for offline storage on this device
  const [availableOffline, setAvailableOffline] = useState(true);

  useEffect(() => {
    offlineIndexedDb.getSetting('AVAILABLE_OFFLINE_ON_THIS_DEVICE', true).then((val) => {
      setAvailableOffline(val);
    });
  }, []);

  const handleToggleOfflineStorage = async () => {
    const nextVal = !availableOffline;
    setAvailableOffline(nextVal);
    await offlineIndexedDb.setSetting('AVAILABLE_OFFLINE_ON_THIS_DEVICE', nextVal);
  };

  // Sync avatar & age on external update
  useEffect(() => {
    if (userProfile?.avatarUrl !== undefined) {
      setAvatarUrl(userProfile.avatarUrl || '');
    }
    if (userProfile?.age !== undefined) {
      setAge(userProfile.age || '');
    }
    if (userProfile?.fullName) {
      setFullName(userProfile.fullName);
    }
  }, [userProfile?.avatarUrl, userProfile?.age, userProfile?.fullName]);

  // Height state
  const initialHeightInches = userProfile?.height || 70;
  const [heightUnit, setHeightUnit] = useState<'ftin' | 'cm'>(
    userProfile?.heightUnit === 'cm' ? 'cm' : 'ftin'
  );
  const [feetInput, setFeetInput] = useState<string | number>(
    userProfile?.heightUnit === 'cm' ? '' : Math.floor(initialHeightInches / 12)
  );
  const [inchesInput, setInchesInput] = useState<string | number>(
    userProfile?.heightUnit === 'cm' ? '' : Math.round(initialHeightInches % 12)
  );
  const [heightCmInput, setHeightCmInput] = useState<string | number>(
    userProfile?.heightUnit === 'cm' ? Math.round(initialHeightInches * 2.54) : ''
  );

  // Weight & Goal Weight state
  const [weight, setWeight] = useState<string | number>(userProfile?.weight ?? 185);
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>(userProfile?.weightUnit || 'lbs');
  const [goalWeight, setGoalWeight] = useState<string | number>(userProfile?.goalWeight ?? 175);
  const [bodyFatInput, setBodyFatInput] = useState<string | number>(userProfile?.bodyFat ?? '');
  const [measurementsHistory, setMeasurementsHistory] = useState<Measurement[]>([]);
  const [latestWeightLog, setLatestWeightLog] = useState<Measurement | null>(null);
  const [earliestWeightLog, setEarliestWeightLog] = useState<Measurement | null>(null);

  // Sync bodyFat if updated externally
  useEffect(() => {
    if (userProfile?.bodyFat !== undefined && userProfile?.bodyFat !== null) {
      setBodyFatInput(userProfile.bodyFat);
    }
  }, [userProfile?.bodyFat]);

  // Load measurements history for progression calculation
  useEffect(() => {
    let isMounted = true;
    async function loadWeightData() {
      try {
        const measurementsList = await gymService.getLatestMeasurements(50);
        if (!isMounted) return;
        setMeasurementsHistory(measurementsList || []);
        
        const validLogs = (measurementsList || [])
          .filter(m => typeof m.weight === 'number' && m.weight > 0)
          .sort((a, b) => b.date.localeCompare(a.date));

        if (validLogs.length > 0) {
          const latest = validLogs[0];
          const earliest = validLogs[validLogs.length - 1];
          setLatestWeightLog(latest);
          setEarliestWeightLog(earliest);

          const loggedUnit = latest.units?.weight || 'lbs';
          let weightVal = latest.weight;
          if (loggedUnit === 'kg' && weightUnit === 'lbs') {
            weightVal = Math.round(weightVal / 0.453592);
          } else if (loggedUnit === 'lbs' && weightUnit === 'kg') {
            weightVal = Math.round(weightVal * 0.453592);
          }
          setWeight(weightVal);
        } else {
          setLatestWeightLog(null);
          setEarliestWeightLog(null);
        }
      } catch (err) {
        console.error('Error fetching weight history for profile:', err);
      }
    }
    loadWeightData();
    return () => {
      isMounted = false;
    };
  }, [userProfile?.userId, weightUnit]);

  // Level & XP
  const levelInfo = getLevelInfo(userProfile?.xp || 0);
  const level = levelInfo.level;
  const xpCurrent = userProfile?.xp || 0;
  const xpProgressPct = levelInfo.progress;
  const xpRemaining = Math.max(0, levelInfo.xpToNext);

  // Membership Tier
  const membershipTier: 'standard' | 'premium' | 'coach' = (
    ((userProfile?.membershipTier as string) === 'trainer' || (userProfile?.membershipTier as string) === 'coach' || isTrainer)
      ? 'coach'
      : (userProfile?.membershipTier as string) === 'premium' || userProfile?.isPremium || isPremium || userProfile?.plan === 'pro'
      ? 'premium'
      : 'standard'
  );

  const getTierBadgeText = () => {
    if (membershipTier === 'coach') return 'COACH MEMBER';
    if (membershipTier === 'premium') return 'PRO MEMBER';
    return 'STANDARD ATHLETE';
  };

  const getTierBadgeVariant = (): 'pro' | 'active' | 'coach' | 'neutral' => {
    if (membershipTier === 'coach') return 'coach';
    if (membershipTier === 'premium') return 'pro';
    return 'neutral';
  };

  // Body measurements
  const initialMeasurements = userProfile?.bodyMeasurements || {};
  const [measurements, setMeasurements] = useState<{ [key: string]: string | number }>({
    neck: initialMeasurements.neck ?? 15.5,
    chest: initialMeasurements.chest ?? 42,
    waist: initialMeasurements.waist ?? 32,
    hips: initialMeasurements.hips ?? 38,
    leftArm: initialMeasurements.leftArm ?? 15,
    rightArm: initialMeasurements.rightArm ?? 15.2,
    leftThigh: initialMeasurements.leftThigh ?? 23,
    rightThigh: initialMeasurements.rightThigh ?? 23.2,
    leftCalf: initialMeasurements.leftCalf ?? initialMeasurements.calves ?? 14,
    rightCalf: initialMeasurements.rightCalf ?? initialMeasurements.calves ?? 14.2,
  });
  const [measurementLengthUnit, setMeasurementLengthUnit] = useState<'in' | 'cm'>(
    initialMeasurements.units?.length || 'in'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Compute initials fallback
  const computeInitials = (nameStr: string) => {
    if (!nameStr || !nameStr.trim()) return 'UN';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Member Since date calculation
  const memberSinceFormatted = (() => {
    try {
      if (userProfile?.createdAt) {
        let dateObj: Date;
        if (typeof userProfile.createdAt.toDate === 'function') {
          dateObj = userProfile.createdAt.toDate();
        } else if (userProfile.createdAt.seconds) {
          dateObj = new Date(userProfile.createdAt.seconds * 1000);
        } else {
          dateObj = new Date(userProfile.createdAt);
        }
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
        }
      }
    } catch {
      // Fallback
    }
    return 'JAN 2024';
  })();

  // Image Processing for Avatar
  const processImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(compressed);
        } else {
          setAvatarUrl(dataUrl);
        }
      };
      img.onerror = () => setAvatarUrl(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processImageFile(file);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
  };

  // Auto-save debounce
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      handleSaveProfile();
    }, 600);
    return () => clearTimeout(timer);
  }, [
    fullName,
    avatarUrl,
    age,
    feetInput,
    inchesInput,
    heightCmInput,
    heightUnit,
    weight,
    weightUnit,
    goalWeight,
    bodyFatInput,
    measurements,
    measurementLengthUnit
  ]);

  const handleSaveProfile = async () => {
    if (!userProfile?.userId) return;
    setIsSaving(true);
    try {
      const calcHeightInches = heightUnit === 'cm'
        ? (heightCmInput === '' ? 0 : Math.round(Number(heightCmInput) / 2.54))
        : ((feetInput === '' ? 0 : Number(feetInput)) * 12 + (inchesInput === '' ? 0 : Number(inchesInput)));

      const numericWeight = weight === '' ? 0 : Number(weight);
      const numericGoalWeight = goalWeight === '' ? 0 : Number(goalWeight);
      const parsedBodyFat = parseBodyFatPercentage(bodyFatInput);

      const numericMeasurements = Object.keys(measurements).reduce((acc, k) => {
        const v = measurements[k];
        acc[k] = v === '' ? 0 : Number(v);
        return acc;
      }, {} as Record<string, number>);

      const updatePayload: Partial<UserProfile> = {
        fullName: fullName || '',
        avatarUrl: avatarUrl || '',
        age: age === '' ? '' : String(age),
        height: calcHeightInches,
        heightUnit,
        weight: numericWeight,
        weightUnit,
        goalWeight: numericGoalWeight,
        bodyMeasurements: {
          ...numericMeasurements,
          units: {
            length: measurementLengthUnit,
            weight: weightUnit
          }
        }
      };

      if (parsedBodyFat !== null) {
        updatePayload.bodyFat = parsedBodyFat;
      }

      await updateUserProfile(userProfile.userId, updatePayload);
      setSaveSuccess(true);
      onProfileUpdate();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Height display formatted
  const heightDisplayFormatted = (() => {
    if (heightUnit === 'cm') {
      const cmVal = heightCmInput !== '' 
        ? Number(heightCmInput) 
        : Math.round((initialHeightInches || 70) * 2.54);
      return `${cmVal} CM`;
    }
    const f = feetInput !== '' ? Number(feetInput) : Math.floor((initialHeightInches || 70) / 12);
    const i = inchesInput !== '' ? Number(inchesInput) : Math.round((initialHeightInches || 70) % 12);
    return `${f}' ${i}"`;
  })();

  // Weight display formatted
  const currentWeightFormatted = (() => {
    const w = Number(weight) || 0;
    return `${w.toFixed(1)} ${weightUnit.toUpperCase()}`;
  })();

  const targetWeightFormatted = (() => {
    const gw = Number(goalWeight) || 0;
    return `${gw.toFixed(1)} ${weightUnit.toUpperCase()}`;
  })();

  // Body fat percentage calculation with multi-tier scientific fallback
  const athleteBodyFatInfo = React.useMemo(() => {
    const calcHeightInches = heightUnit === 'cm'
      ? (heightCmInput === '' ? (initialHeightInches || 70) : Math.round(Number(heightCmInput) / 2.54))
      : ((feetInput === '' ? 5 : Number(feetInput)) * 12 + (inchesInput === '' ? 10 : Number(inchesInput)));

    const calcHeightCm = heightUnit === 'cm'
      ? Number(heightCmInput)
      : Math.round(calcHeightInches * 2.54);

    return resolveAthleteBodyFat({
      weight,
      weightUnit,
      heightInches: calcHeightInches,
      heightCm: calcHeightCm,
      age: age || userProfile?.age,
      sex: userProfile?.sex,
      waist: measurements.waist,
      neck: measurements.neck,
      hips: measurements.hips,
      measurementUnit: measurementLengthUnit,
      manualBodyFat: bodyFatInput,
      latestLoggedBodyFat: latestWeightLog?.bodyFat
    });
  }, [
    bodyFatInput,
    latestWeightLog?.bodyFat,
    heightUnit,
    heightCmInput,
    feetInput,
    inchesInput,
    initialHeightInches,
    weight,
    weightUnit,
    age,
    userProfile?.age,
    userProfile?.sex,
    measurements.waist,
    measurements.neck,
    measurements.hips,
    measurementLengthUnit
  ]);

  const bodyFatFormatted = athleteBodyFatInfo.formatted;

  const handleAutoCalculateBodyFat = () => {
    const calcHeightInches = heightUnit === 'cm'
      ? (heightCmInput === '' ? (initialHeightInches || 70) : Math.round(Number(heightCmInput) / 2.54))
      : ((feetInput === '' ? 5 : Number(feetInput)) * 12 + (inchesInput === '' ? 10 : Number(inchesInput)));

    const calcHeightCm = heightUnit === 'cm'
      ? Number(heightCmInput)
      : Math.round(calcHeightInches * 2.54);

    const waistVal = Number(measurements.waist) || 0;
    const neckVal = Number(measurements.neck) || 0;
    const hipsVal = Number(measurements.hips) || 0;
    const waistInches = measurementLengthUnit === 'cm' ? waistVal / 2.54 : waistVal;
    const neckInches = measurementLengthUnit === 'cm' ? neckVal / 2.54 : neckVal;
    const hipsInches = measurementLengthUnit === 'cm' ? hipsVal / 2.54 : hipsVal;

    let computed: number | null = null;
    if (calcHeightInches > 0 && waistInches > 0 && neckInches > 0) {
      computed = calculateNavyBodyFat({
        sex: userProfile?.sex,
        heightInches: calcHeightInches,
        waistInches,
        neckInches,
        hipsInches: hipsInches > 0 ? hipsInches : undefined
      });
    }

    if (computed === null) {
      const rawW = Number(weight) || 0;
      const wKg = weightUnit === 'kg' ? rawW : rawW * 0.453592;
      computed = calculateBmiBodyFat({
        weightKg: wKg,
        heightCm: calcHeightCm,
        age: age || userProfile?.age,
        sex: userProfile?.sex
      });
    }

    if (computed !== null) {
      setBodyFatInput(computed);
    }
  };

  // Weight Net Progression Calculation
  const weightProgressionDelta = (() => {
    const currentW = Number(weight) || 0;
    let startW = currentW;
    if (earliestWeightLog && typeof earliestWeightLog.weight === 'number' && earliestWeightLog.weight > 0) {
      let eWeight = earliestWeightLog.weight;
      const eUnit = earliestWeightLog.units?.weight || 'lbs';
      if (eUnit !== weightUnit) {
        eWeight = weightUnit === 'kg' ? eWeight * 0.453592 : eWeight / 0.453592;
      }
      startW = eWeight;
    } else if (userProfile?.weight && typeof userProfile.weight === 'number') {
      let pWeight = userProfile.weight;
      const pUnit = userProfile.weightUnit || 'lbs';
      if (pUnit !== weightUnit) {
        pWeight = weightUnit === 'kg' ? pWeight * 0.453592 : pWeight / 0.453592;
      }
      startW = pWeight;
    }
    const delta = Number((currentW - startW).toFixed(1));
    const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
    const absVal = Math.abs(delta);
    return {
      delta,
      formatted: `${sign}${absVal} ${weightUnit.toUpperCase()} SINCE START`,
      isNegative: delta < 0,
      isPositive: delta > 0,
      isZero: delta === 0
    };
  })();

  const handleToggleWeightUnit = (unit: 'lbs' | 'kg') => {
    if (unit === weightUnit) return;
    if (unit === 'kg') {
      const numW = weight === '' ? 0 : Number(weight);
      if (numW > 0) setWeight(Math.round(numW * 0.453592 * 10) / 10);
      const numGW = goalWeight === '' ? 0 : Number(goalWeight);
      if (numGW > 0) setGoalWeight(Math.round(numGW * 0.453592 * 10) / 10);
      setWeightUnit('kg');
    } else {
      const numW = weight === '' ? 0 : Number(weight);
      if (numW > 0) setWeight(Math.round((numW / 0.453592) * 10) / 10);
      const numGW = goalWeight === '' ? 0 : Number(goalWeight);
      if (numGW > 0) setGoalWeight(Math.round((numGW / 0.453592) * 10) / 10);
      setWeightUnit('lbs');
    }
  };

  const handleToggleHeightUnit = (unit: 'ftin' | 'cm') => {
    if (unit === heightUnit) return;
    if (unit === 'cm') {
      const f = feetInput === '' ? 0 : Number(feetInput);
      const i = inchesInput === '' ? 0 : Number(inchesInput);
      const totalInches = f * 12 + i;
      setHeightCmInput(totalInches > 0 ? Math.round(totalInches * 2.54) : (initialHeightInches ? Math.round(initialHeightInches * 2.54) : 178));
      setHeightUnit('cm');
    } else {
      const cm = heightCmInput === '' ? 0 : Number(heightCmInput);
      const totalInches = cm > 0 ? Math.round(cm / 2.54) : (initialHeightInches || 70);
      setFeetInput(totalInches > 0 ? Math.floor(totalInches / 12) : 5);
      setInchesInput(totalInches > 0 ? Math.round(totalInches % 12) : 10);
      setHeightUnit('ftin');
    }
  };

  const handleToggleSystemUnits = (system: 'imperial' | 'metric') => {
    if (system === 'metric') {
      handleToggleWeightUnit('kg');
      handleToggleHeightUnit('cm');
      if (measurementLengthUnit !== 'cm') {
        setMeasurements(prev => {
          const updated: Record<string, string | number> = {};
          Object.keys(prev).forEach(k => {
            const v = prev[k];
            updated[k] = v === '' ? '' : Math.round(Number(v) * 2.54 * 10) / 10;
          });
          return updated;
        });
        setMeasurementLengthUnit('cm');
      }
    } else {
      handleToggleWeightUnit('lbs');
      handleToggleHeightUnit('ftin');
      if (measurementLengthUnit !== 'in') {
        setMeasurements(prev => {
          const updated: Record<string, string | number> = {};
          Object.keys(prev).forEach(k => {
            const v = prev[k];
            updated[k] = v === '' ? '' : Math.round((Number(v) / 2.54) * 10) / 10;
          });
          return updated;
        });
        setMeasurementLengthUnit('in');
      }
    }
  };

  // Editorial Measurements Pairing
  const armDisplay = (() => {
    const l = Number(measurements.leftArm) || 0;
    const r = Number(measurements.rightArm) || 0;
    if (l && r && l !== r) return `${l} / ${r}`;
    return l || r || '38';
  })();

  const thighDisplay = (() => {
    const l = Number(measurements.leftThigh) || 0;
    const r = Number(measurements.rightThigh) || 0;
    if (l && r && l !== r) return `${l} / ${r}`;
    return l || r || '58';
  })();

  const calfDisplay = (() => {
    const l = Number(measurements.leftCalf) || 0;
    const r = Number(measurements.rightCalf) || 0;
    if (l && r && l !== r) return `${l} / ${r}`;
    return l || r || '37';
  })();

  // Membership details
  const membershipPriceDisplay = (() => {
    if (membershipTier === 'coach') {
      return userProfile?.billingCycle === 'annual' ? '$479 / YEAR' : '$49.99 / MONTH';
    }
    if (membershipTier === 'premium') {
      return userProfile?.billingCycle === 'annual' ? '$149 / YEAR' : '$14.99 / MONTH';
    }
    return 'FREE TIER';
  })();

  const nextPaymentFormatted = (() => {
    if (userProfile?.renewalDate) {
      try {
        const d = new Date(userProfile.renewalDate + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        }
      } catch {
        // fallback
      }
      return userProfile.renewalDate.toUpperCase();
    }
    return '13 SEP 2026';
  })();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Mobile-Only Navigation Bar */}
      <div className="md:hidden bg-[#111111] p-2 rounded-[6px] border border-[#292929] flex items-center justify-between gap-2 shadow-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setActiveTab('reports');
            setStep('history');
            await loadHistory();
          }}
          className="flex-1 gap-1.5 text-xs py-2 border-[#292929] text-[#A1A1A1] hover:text-white"
        >
          <History className="w-3.5 h-3.5 text-brand-primary" />
          <span>Reports</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (hasAccess) setActiveTab('gym');
            else setStep('no-access');
          }}
          className="flex-1 gap-1.5 text-xs py-2 border-[#292929] text-[#A1A1A1] hover:text-white"
        >
          <Dumbbell className="w-3.5 h-3.5 text-[#00DFA2]" />
          <span>Gym Hub</span>
        </Button>

        {isTrainer && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('client-hub')}
            className="flex-1 gap-1.5 text-xs py-2 border-purple-500/30 text-purple-400 font-bold"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Clients</span>
          </Button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 1. OPEN PAGE HEADER (Not inside an oversized rounded card)   */}
      {/* ============================================================ */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#292929]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 min-w-0">
          {/* Athlete Avatar Frame */}
          <div className="relative group shrink-0">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleAvatarDrop}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-[6px] overflow-hidden border border-[#292929] bg-[#080808] flex items-center justify-center relative cursor-pointer group-hover:border-brand-primary transition-all shadow-inner"
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={fullName} 
                  loading="eager"
                  decoding="async"
                  onError={() => setAvatarUrl('')}
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-display font-black text-brand-primary tracking-wider">
                  {computeInitials(fullName)}
                </span>
              )}

              <label className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-mono font-bold cursor-pointer transition-opacity">
                <Camera className="w-5 h-5 mb-1 text-brand-primary" />
                <span>UPLOAD</span>
                <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
              </label>
            </div>

            {isTrainer && (
              <span className="absolute -bottom-1 -right-1 bg-purple-500 text-white p-1 rounded-[3px] shadow-lg" title="Coach Verified">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {/* Athlete Identity Details */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold tracking-widest text-[#00DFA2] uppercase">
                PROFILE
              </span>
              <span className="text-[#6C6C6C] font-mono text-[10px]">•</span>
              <span className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider">
                MEMBER SINCE {memberSinceFormatted}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-tight truncate">
                {fullName || 'MARCUS VANCE'}
              </h1>
              <Badge variant={getTierBadgeVariant()} className="text-[10px] font-mono">
                {getTierBadgeText()}
              </Badge>
            </div>

            {/* Micro stats strip under name */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-[#A1A1A1]">
              <button
                type="button"
                onClick={() => onOpenLevelModal && onOpenLevelModal()}
                className="hover:text-brand-primary transition-colors cursor-pointer flex items-center gap-1 group"
                title="View Level Details"
              >
                <span>LEVEL</span>
                <strong className="text-white group-hover:text-brand-primary">{level}</strong>
              </button>
              <span className="text-[#444444]">•</span>
              <div className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>STREAK</span>
                <strong className="text-amber-400">{userProfile?.streak ?? 0} DAYS</strong>
              </div>
              <span className="text-[#444444]">•</span>
              <div className="flex items-center gap-1">
                <span>XP</span>
                <strong className="text-[#00DFA2]">{userProfile?.xp ?? 0}</strong>
              </div>
              {userEmail && (
                <>
                  <span className="text-[#444444] hidden sm:inline">•</span>
                  <span className="text-[#6C6C6C] font-sans text-xs hidden sm:inline">{userEmail}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 bg-[#00DFA2]/10 border border-[#00DFA2]/30 text-brand-primary text-[10px] font-mono font-bold px-3 py-1.5 rounded-[4px]"
              >
                <Check className="w-3 h-3" />
                <span>SAVED</span>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            variant={isEditingProfile ? "primary" : "secondary"}
            size="sm"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="text-[11px] font-mono font-bold tracking-wider uppercase cursor-pointer"
          >
            {isEditingProfile ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                <span>DONE EDITING</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 mr-1 text-[#A1A1A1]" />
                <span>EDIT PROFILE</span>
              </>
            )}
          </Button>

          {avatarUrl && isEditingProfile && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveAvatar}
              className="text-[11px] font-mono tracking-wider uppercase cursor-pointer"
              title="Remove profile photo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* PROFILE EDIT DRAWER (When user clicks EDIT PROFILE)           */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isEditingProfile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4 sm:p-6 bg-[#111111] border border-[#292929] space-y-4">
              <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                <span className="text-[11px] font-mono font-bold tracking-widest text-[#00DFA2] uppercase">
                  EDIT ATHLETE BIOMETRICS & IDENTITY
                </span>
                <span className="text-[10px] font-mono text-[#6C6C6C]">AUTO-SAVING ON CHANGE</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase block">Athlete Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                    placeholder="Marcus Vance"
                  />
                </div>

                {/* Age */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase block">Age (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                    placeholder="28"
                  />
                </div>

                {/* Height */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase">Height</label>
                    <UnitToggle<'ftin' | 'cm'>
                      unitA="ftin"
                      unitB="cm"
                      labelA="[FT/IN]"
                      labelB="[CM]"
                      value={heightUnit}
                      onChange={(u) => {
                        if (u === 'cm' && heightUnit !== 'cm') {
                          const f = feetInput === '' ? 0 : Number(feetInput);
                          const i = inchesInput === '' ? 0 : Number(inchesInput);
                          const totalInches = f * 12 + i;
                          setHeightCmInput(totalInches > 0 ? Math.round(totalInches * 2.54) : '');
                        } else if (u === 'ftin' && heightUnit === 'cm') {
                          const cm = heightCmInput === '' ? 0 : Number(heightCmInput);
                          const totalInches = Math.round(cm / 2.54);
                          setFeetInput(totalInches > 0 ? Math.floor(totalInches / 12) : '');
                          setInchesInput(totalInches > 0 ? Math.round(totalInches % 12) : '');
                        }
                        setHeightUnit(u);
                      }}
                      size="sm"
                    />
                  </div>
                  {heightUnit === 'cm' ? (
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        value={heightCmInput}
                        onChange={(e) => setHeightCmInput(e.target.value)}
                        className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                        placeholder="178"
                      />
                      <span className="absolute right-3 text-xs text-[#6C6C6C] font-mono">cm</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="8"
                          placeholder="5"
                          value={feetInput}
                          onChange={(e) => setFeetInput(e.target.value)}
                          className="w-full bg-[#080808] border border-[#292929] rounded-[4px] pl-3 pr-7 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                        />
                        <span className="absolute right-2.5 text-xs text-[#6C6C6C] font-mono font-bold">ft</span>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="11"
                          placeholder="10"
                          value={inchesInput}
                          onChange={(e) => setInchesInput(e.target.value)}
                          className="w-full bg-[#080808] border border-[#292929] rounded-[4px] pl-3 pr-7 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                        />
                        <span className="absolute right-2.5 text-xs text-[#6C6C6C] font-mono font-bold">in</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Weight */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase">Current Weight</label>
                    <UnitToggle<'lbs' | 'kg'>
                      unitA="lbs"
                      unitB="kg"
                      labelA="[LBS]"
                      labelB="[KG]"
                      value={weightUnit}
                      onChange={(u) => {
                        if (latestWeightLog) {
                          const loggedUnit = latestWeightLog.units?.weight || 'lbs';
                          let weightVal = latestWeightLog.weight;
                          if (loggedUnit === 'kg' && u === 'lbs') weightVal = Math.round(weightVal / 0.453592);
                          else if (loggedUnit === 'lbs' && u === 'kg') weightVal = Math.round(weightVal * 0.453592);
                          setWeight(weightVal);
                        } else {
                          const numW = weight === '' ? 0 : Number(weight);
                          if (u === 'kg' && weightUnit === 'lbs') setWeight(numW > 0 ? Math.round(numW * 0.453592) : '');
                          if (u === 'lbs' && weightUnit === 'kg') setWeight(numW > 0 ? Math.round(numW / 0.453592) : '');
                        }
                        const numGW = goalWeight === '' ? 0 : Number(goalWeight);
                        if (u === 'kg' && weightUnit === 'lbs') setGoalWeight(numGW > 0 ? Math.round(numGW * 0.453592) : '');
                        if (u === 'lbs' && weightUnit === 'kg') setGoalWeight(numGW > 0 ? Math.round(numGW / 0.453592) : '');
                        setWeightUnit(u);
                      }}
                      size="sm"
                    />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                  />
                </div>

                {/* Target Weight */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase block">Target Weight ({weightUnit.toUpperCase()})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={goalWeight}
                    onChange={(e) => setGoalWeight(e.target.value)}
                    className="w-full bg-[#080808] border border-[#292929] rounded-[4px] px-3 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                  />
                </div>

                {/* Body Fat % */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase">Body Fat %</label>
                    <button
                      type="button"
                      onClick={handleAutoCalculateBodyFat}
                      className="text-[9px] font-mono text-brand-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                      title="Calculate via US Navy formula or BMI"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>AUTO CALC</span>
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="3"
                      max="70"
                      placeholder={athleteBodyFatInfo.bodyFatPercentage.toFixed(1)}
                      value={bodyFatInput}
                      onChange={(e) => setBodyFatInput(e.target.value)}
                      className="w-full bg-[#080808] border border-[#292929] rounded-[4px] pl-3 pr-7 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                    />
                    <span className="absolute right-2.5 text-xs text-[#6C6C6C] font-mono font-bold">%</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 2. ATHLETE METRICS STRIP (Horizontal high-contrast layout)   */}
      {/* ============================================================ */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase">
              ATHLETE BIOMETRIC BASELINE
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Weight Switch (LB / KG) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-[#6C6C6C] uppercase font-bold hidden xs:inline">WEIGHT</span>
              <UnitToggle<'lbs' | 'kg'>
                unitA="lbs"
                unitB="kg"
                labelA="LB"
                labelB="KG"
                value={weightUnit}
                onChange={handleToggleWeightUnit}
                size="sm"
              />
            </div>

            {/* Height Switch (CM / FT & IN) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-[#6C6C6C] uppercase font-bold hidden xs:inline">HEIGHT</span>
              <UnitToggle<'ftin' | 'cm'>
                unitA="ftin"
                unitB="cm"
                labelA="FT / IN"
                labelB="CM"
                value={heightUnit}
                onChange={handleToggleHeightUnit}
                size="sm"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 bg-[#111111] border border-[#292929] rounded-[6px] divide-y md:divide-y-0 md:divide-x divide-[#292929] overflow-hidden shadow-lg">
          {/* 1. Weight */}
          <div className="p-5 sm:p-6 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase">
                WEIGHT
              </div>
              <div className="flex items-center bg-[#080808] border border-[#292929] rounded-[4px] p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleWeightUnit('lbs')}
                  className={cn(
                    "px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer",
                    weightUnit === 'lbs'
                      ? "bg-brand-primary text-black font-extrabold"
                      : "text-[#6C6C6C] hover:text-white"
                  )}
                >
                  LB
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleWeightUnit('kg')}
                  className={cn(
                    "px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer",
                    weightUnit === 'kg'
                      ? "bg-brand-primary text-black font-extrabold"
                      : "text-[#6C6C6C] hover:text-white"
                  )}
                >
                  KG
                </button>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-mono font-black text-white tracking-tight">
                {typeof weight === 'number' ? weight.toFixed(1) : (weight || '185')}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-brand-primary uppercase">
                {weightUnit === 'lbs' ? 'LB' : 'KG'}
              </span>
            </div>
          </div>

          {/* 2. Height */}
          <div className="p-5 sm:p-6 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase">
                HEIGHT
              </div>
              <div className="flex items-center bg-[#080808] border border-[#292929] rounded-[4px] p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleHeightUnit('ftin')}
                  className={cn(
                    "px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer",
                    heightUnit === 'ftin'
                      ? "bg-brand-primary text-black font-extrabold"
                      : "text-[#6C6C6C] hover:text-white"
                  )}
                >
                  FT/IN
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleHeightUnit('cm')}
                  className={cn(
                    "px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer",
                    heightUnit === 'cm'
                      ? "bg-brand-primary text-black font-extrabold"
                      : "text-[#6C6C6C] hover:text-white"
                  )}
                >
                  CM
                </button>
              </div>
            </div>
            <div className="pt-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-mono font-black text-white tracking-tight">
                {heightDisplayFormatted}
              </span>
            </div>
          </div>

          {/* 3. Body Fat */}
          <div className="p-5 sm:p-6 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase">
                BODY FAT
              </div>
              <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-[3px] bg-[#080808] text-brand-primary border border-[#292929] uppercase">
                {athleteBodyFatInfo.source === 'manual' ? 'CUSTOM' : athleteBodyFatInfo.source === 'navy_method' ? 'US NAVY' : athleteBodyFatInfo.source === 'logged' ? 'LOGGED' : 'EST.'}
              </span>
            </div>
            <div className="pt-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-mono font-black text-white tracking-tight">
                {bodyFatFormatted}
              </span>
            </div>
          </div>

          {/* 4. Target Weight */}
          <div className="p-5 sm:p-6 space-y-1">
            <div className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase">
              TARGET
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-mono font-black text-white tracking-tight">
                {typeof goalWeight === 'number' ? goalWeight.toFixed(1) : (goalWeight || '175')}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#00DFA2] uppercase">
                {weightUnit === 'lbs' ? 'LB' : 'KG'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. MAIN DASHBOARD GRID: LEFT (PROGRESS & DATA) + RIGHT (MEMBERSHIP & ACCOMPLISHMENTS) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* LEFT COLUMN: Progress & Body Measurements (7 cols) */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          
          {/* 1. PROGRESS: WEIGHT PROGRESSION HERO & INTEGRATED CHART */}
          <div className="space-y-4">
            {/* Dominant Current Weight Hero */}
            <div className="bg-[#111111] border border-[#292929] rounded-[6px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                    WEIGHT PROGRESSION
                  </span>
                  <div className="flex items-center bg-[#080808] border border-[#292929] rounded-[4px] p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleWeightUnit('lbs')}
                      className={cn(
                        "px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer",
                        weightUnit === 'lbs'
                          ? "bg-brand-primary text-black font-extrabold"
                          : "text-[#6C6C6C] hover:text-white"
                      )}
                    >
                      LB
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleWeightUnit('kg')}
                      className={cn(
                        "px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer",
                        weightUnit === 'kg'
                          ? "bg-brand-primary text-black font-extrabold"
                          : "text-[#6C6C6C] hover:text-white"
                      )}
                    >
                      KG
                    </button>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
                    {typeof weight === 'number' ? weight.toFixed(1) : (weight || '185')}
                  </span>
                  <span className="text-base font-mono font-bold text-brand-primary uppercase">
                    {weightUnit === 'lbs' ? 'LB' : 'KG'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <span className={cn(
                  "text-xs sm:text-sm font-mono font-extrabold uppercase px-3 py-1.5 rounded-[4px] border inline-flex items-center justify-center",
                  weightProgressionDelta.isNegative
                    ? "bg-[#00DFA2]/10 text-brand-primary border-[#00DFA2]/30"
                    : weightProgressionDelta.isPositive
                    ? "bg-amber-400/10 text-amber-400 border-amber-400/30"
                    : "bg-[#171717] text-[#A1A1A1] border-[#292929]"
                )}>
                  {weightProgressionDelta.formatted}
                </span>
                <span className="text-[10px] font-mono text-[#6C6C6C]">
                  TARGET: {typeof goalWeight === 'number' ? goalWeight.toFixed(1) : goalWeight} {weightUnit === 'lbs' ? 'LB' : 'KG'}
                </span>
              </div>
            </div>

            {/* Progression Chart */}
            <WeightProgressionChart defaultCollapsed={false} initialMeasurements={measurementsHistory} weightUnit={weightUnit} />
          </div>

          {/* 2. BODY MEASUREMENTS: Editorial Data Grid */}
          <Card className="p-5 sm:p-6 bg-[#111111] border border-[#292929] rounded-[6px] space-y-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#292929] pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-brand-primary" />
                  <h2 className="text-sm font-display font-bold uppercase tracking-wider text-white">
                    BODY MEASUREMENTS
                  </h2>
                </div>
                <p className="text-[11px] text-[#A1A1A1] font-mono">10-Point Anthropometric Tracking</p>
              </div>

              <div className="flex items-center gap-3">
                <UnitToggle<'in' | 'cm'>
                  unitA="in"
                  unitB="cm"
                  labelA="[IN]"
                  labelB="[CM]"
                  value={measurementLengthUnit}
                  onChange={(u) => {
                    if (u === 'cm' && measurementLengthUnit === 'in') {
                      setMeasurements(prev => {
                        const updated: Record<string, string | number> = {};
                        Object.keys(prev).forEach(k => {
                          const v = prev[k];
                          updated[k] = v === '' ? '' : Math.round(Number(v) * 2.54 * 10) / 10;
                        });
                        return updated;
                      });
                    } else if (u === 'in' && measurementLengthUnit === 'cm') {
                      setMeasurements(prev => {
                        const updated: Record<string, string | number> = {};
                        Object.keys(prev).forEach(k => {
                          const v = prev[k];
                          updated[k] = v === '' ? '' : Math.round((Number(v) / 2.54) * 10) / 10;
                        });
                        return updated;
                      });
                    }
                    setMeasurementLengthUnit(u);
                  }}
                  size="sm"
                />

                <Button
                  variant={isEditingMeasurements ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setIsEditingMeasurements(!isEditingMeasurements)}
                  className="text-[10px] font-mono font-bold tracking-wider uppercase h-8 px-3 min-h-[36px]"
                >
                  {isEditingMeasurements ? 'DONE' : 'EDIT'}
                </Button>
              </div>
            </div>

            {/* Performance Editorial Data Grid */}
            {!isEditingMeasurements ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-5 pt-1">
                {/* CHEST */}
                <div className="border-b border-[#292929]/70 pb-3">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                    CHEST
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
                      {measurements.chest || '42'}
                    </span>
                    <span className="text-[10px] font-mono text-[#6C6C6C] uppercase font-bold">
                      {measurementLengthUnit}
                    </span>
                  </div>
                </div>

                {/* WAIST */}
                <div className="border-b border-[#292929]/70 pb-3">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                    WAIST
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
                      {measurements.waist || '32'}
                    </span>
                    <span className="text-[10px] font-mono text-[#6C6C6C] uppercase font-bold">
                      {measurementLengthUnit}
                    </span>
                  </div>
                </div>

                {/* HIPS */}
                <div className="border-b border-[#292929]/70 pb-3">
                  <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                    HIPS
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
                      {measurements.hips || '38'}
                    </span>
                    <span className="text-[10px] font-mono text-[#6C6C6C] uppercase font-bold">
                      {measurementLengthUnit}
                    </span>
                  </div>
                </div>

                {/* THIGH */}
                <div className="border-b border-[#292929]/70 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                      THIGH
                    </span>
                    <span className="text-[9px] font-mono text-[#6C6C6C]">L / R</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
                      {thighDisplay}
                    </span>
                    <span className="text-[10px] font-mono text-[#6C6C6C] uppercase font-bold">
                      {measurementLengthUnit}
                    </span>
                  </div>
                </div>

                {/* ARM */}
                <div className="border-b border-[#292929]/70 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                      ARM
                    </span>
                    <span className="text-[9px] font-mono text-[#6C6C6C]">L / R</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
                      {armDisplay}
                    </span>
                    <span className="text-[10px] font-mono text-[#6C6C6C] uppercase font-bold">
                      {measurementLengthUnit}
                    </span>
                  </div>
                </div>

                {/* CALF */}
                <div className="border-b border-[#292929]/70 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase block">
                      CALF
                    </span>
                    <span className="text-[9px] font-mono text-[#6C6C6C]">L / R</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight">
                      {calfDisplay}
                    </span>
                    <span className="text-[10px] font-mono text-[#6C6C6C] uppercase font-bold">
                      {measurementLengthUnit}
                    </span>
                  </div>
                </div>

                {/* NECK */}
                <div className="col-span-2 pt-1 flex items-center justify-between text-xs font-mono text-[#A1A1A1]">
                  <span className="tracking-wider uppercase">NECK CIRCUMFERENCE:</span>
                  <span className="text-white font-bold">{measurements.neck || '15.5'} {measurementLengthUnit}</span>
                </div>
              </div>
            ) : (
              /* Editable inputs view */
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 pt-1">
                {[
                  { key: 'chest', label: 'Chest' },
                  { key: 'waist', label: 'Waist' },
                  { key: 'hips', label: 'Hips' },
                  { key: 'neck', label: 'Neck' },
                  { key: 'leftArm', label: 'Left Arm' },
                  { key: 'rightArm', label: 'Right Arm' },
                  { key: 'leftThigh', label: 'Left Thigh' },
                  { key: 'rightThigh', label: 'Right Thigh' },
                  { key: 'leftCalf', label: 'Left Calf' },
                  { key: 'rightCalf', label: 'Right Calf' },
                ].map(({ key, label }) => (
                  <div key={key} className="p-3 bg-[#080808] border border-[#292929] rounded-[4px] space-y-1">
                    <label className="text-[10px] font-mono font-bold text-[#A1A1A1] uppercase block">{label}</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={measurements[key as keyof typeof measurements] ?? ''}
                        onChange={(e) => {
                          setMeasurements(prev => ({ ...prev, [key]: e.target.value }));
                        }}
                        className="w-full bg-[#111111] border border-[#292929] rounded-[3px] px-2.5 py-1.5 text-xs text-white font-mono focus:border-brand-primary outline-none min-h-[38px]"
                      />
                      <span className="text-[10px] text-[#6C6C6C] font-mono uppercase">{measurementLengthUnit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Membership & Accomplishments (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* MEMBERSHIP SUMMARY: Clean, restrained, editorial */}
          <Card className="p-5 sm:p-6 bg-[#111111] border border-[#292929] rounded-[6px] space-y-5">
            <div className="flex items-center justify-between border-b border-[#292929] pb-3">
              <span className="text-[11px] font-mono font-bold tracking-widest text-[#00DFA2] uppercase">
                MEMBERSHIP
              </span>
              <Badge variant={getTierBadgeVariant()} className="text-[9px]">
                {userProfile?.status || 'ACTIVE'}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                  {userProfile?.plan ? userProfile.plan.toUpperCase() : (membershipTier === 'coach' ? 'COACH PRO' : 'PRO')}
                </h3>
                <p className="text-xs font-mono font-bold text-[#A1A1A1] mt-0.5">
                  {membershipPriceDisplay}
                </p>
              </div>

              <div className="pt-2 border-t border-[#292929]/70 space-y-1">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#6C6C6C] uppercase block">
                  NEXT PAYMENT
                </span>
                <p className="text-xs font-mono font-bold text-white">
                  {nextPaymentFormatted}
                </p>
              </div>

              {onOpenSubscriptionModal && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenSubscriptionModal}
                    className="group inline-flex items-center gap-1.5 text-xs font-mono font-bold text-brand-primary hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <span>MANAGE PLAN</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* ACCOMPLISHMENTS: Streamlined & Meaningful */}
          <Card className="p-5 sm:p-6 bg-[#111111] border border-[#292929] rounded-[6px] space-y-5">
            <div className="flex items-center justify-between border-b border-[#292929] pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white">
                  ACCOMPLISHMENTS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenLevelModal && onOpenLevelModal()}
                className="text-[10px] font-mono font-bold text-brand-primary hover:underline cursor-pointer uppercase"
              >
                LVL {level} PROGRESS
              </button>
            </div>

            {/* Level XP Progress Meter */}
            <div className="p-3.5 bg-[#080808] border border-[#292929] rounded-[4px] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-white">Level {level} • {levelInfo.title}</span>
                <span className="text-[#A1A1A1] font-bold">{xpCurrent.toLocaleString()} XP ({xpRemaining > 0 ? `${xpRemaining.toLocaleString()} to next` : 'MAX'})</span>
              </div>
              <div className="h-1.5 bg-[#171717] rounded-full overflow-hidden border border-[#292929]">
                <motion.div 
                  className="h-full bg-brand-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#6C6C6C]">
                <span>{xpProgressPct}% completed</span>
                <span>Next reward: Level {level + 1}</span>
              </div>
            </div>

            {/* Curated Milestone Badges */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-mono font-bold tracking-widest text-[#A1A1A1] uppercase">
                ACTIVE MILESTONES
              </div>

              <div className="grid grid-cols-1 gap-2">
                {DEFAULT_YEAR_BADGES.slice(0, isAllBadgesExpanded ? DEFAULT_YEAR_BADGES.length : 4).map((badge) => {
                  const userBadge = userProfile?.badges?.find(
                    (b) => b.id === badge.id || b.name.toLowerCase() === badge.name.toLowerCase()
                  );
                  let isUnlocked = Boolean(userBadge?.unlockedAt);
                  let unlockedAtDate = userBadge?.unlockedAt || '';

                  if (!isUnlocked) {
                    if (badge.id === 'b-m4' && userProfile?.membershipTier === 'trainer') {
                      isUnlocked = true;
                      unlockedAtDate = 'Trainer Verified';
                    } else if (badge.id === 'b-8' && (userProfile?.streak || 0) >= 30) {
                      isUnlocked = true;
                      unlockedAtDate = '30-Day Streak';
                    } else if (badge.id === 'b-7' && (userProfile?.streak || 0) >= 7) {
                      isUnlocked = true;
                      unlockedAtDate = '7-Day Streak';
                    }
                  }

                  return (
                    <div
                      key={badge.id}
                      className={cn(
                        "p-3 rounded-[4px] border flex items-center justify-between gap-3 transition-colors",
                        isUnlocked
                          ? "bg-[#171717] border-[#00DFA2]/30 text-white"
                          : "bg-[#080808]/60 border-[#292929] text-[#6C6C6C] opacity-75"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{badge.icon}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-mono font-bold text-white truncate">{badge.name}</h4>
                          <p className="text-[10px] text-[#A1A1A1] line-clamp-1">{badge.description}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isUnlocked ? (
                          <Badge variant="pro" className="text-[8px] font-mono">
                            {unlockedAtDate || 'EARNED'}
                          </Badge>
                        ) : (
                          <span className="text-[9px] font-mono text-[#6C6C6C]">LOCKED</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAllBadgesExpanded(!isAllBadgesExpanded)}
                className="w-full text-xs font-mono text-[#A1A1A1] hover:text-white justify-center py-2"
              >
                {isAllBadgesExpanded ? 'SHOW LESS MILESTONES' : `VIEW ALL ${DEFAULT_YEAR_BADGES.length} ACHIEVEMENTS`}
              </Button>
            </div>
          </Card>

          {/* DEVICE STORAGE & OFFLINE PERSISTENCE */}
          <Card className="p-5 sm:p-6 bg-[#111111] border border-[#292929] rounded-[6px] space-y-4">
            <div className="flex items-center justify-between border-b border-[#292929] pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-brand-primary" />
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white">
                  DEVICE SETTINGS
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-3.5 bg-[#080808] border border-[#292929] rounded-[4px]">
              <div className="space-y-1 pr-2">
                <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  AVAILABLE OFFLINE ON THIS DEVICE
                </div>
                <p className="text-xs text-[#A1A1A1] leading-relaxed">
                  Keep workouts, tracking data and recently viewed plans available when you're offline.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleOfflineStorage}
                role="switch"
                aria-checked={availableOffline}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  availableOffline ? "bg-brand-primary" : "bg-[#292929]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out",
                    availableOffline ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};
