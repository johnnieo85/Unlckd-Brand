import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Ruler, 
  Save, 
  Check, 
  Dumbbell, 
  History, 
  Users, 
  ShieldCheck, 
  Sparkles,
  Camera,
  Trash2,
  Activity
} from 'lucide-react';
import { Card, Badge as UiBadge } from './ui/Card';
import { Button } from './ui/Button';
import { UnitToggle } from './UnitToggle';
import { WeightProgressionChart } from './WeightProgressionChart';
import { UserProfile, Badge as UserBadge } from '../types';
import { cn } from '../lib/utils';
import { updateUserProfile } from '../services/accessService';
import { getLevelInfo } from '../lib/levels';

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
  onOpenLevelModal
}) => {
  const isTrainer = userProfile?.membershipTier === 'trainer';

  // State for editable profile fields
  const [fullName, setFullName] = useState(userProfile?.fullName || userName || 'Marcus Vance');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');
  const [age, setAge] = useState<string | number>(userProfile?.age || '');

  // Keep avatar and age synced if userProfile updates
  React.useEffect(() => {
    if (userProfile?.avatarUrl !== undefined) {
      setAvatarUrl(userProfile.avatarUrl || '');
    }
    if (userProfile?.age !== undefined) {
      setAge(userProfile.age || '');
    }
  }, [userProfile?.avatarUrl, userProfile?.age]);
  
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
  
  // Dynamically calculate level using getLevelInfo to ensure exact match with Header and Level Progression modal
  const level = getLevelInfo(userProfile?.xp || 0).level;

  // Membership / Account Status (Automatically associated with user database)
  const membershipTier: 'standard' | 'premium' | 'coach' = (
    ((userProfile?.membershipTier as string) === 'trainer' || (userProfile?.membershipTier as string) === 'coach' || isTrainer)
      ? 'coach'
      : (userProfile?.membershipTier as string) === 'premium' || userProfile?.isPremium || isPremium
      ? 'premium'
      : 'standard'
  );

  const getAccountStatusLabel = (tier: string) => {
    if (tier === 'coach' || tier === 'trainer') return 'Coach';
    if (tier === 'premium') return 'Premium';
    return 'Standard';
  };
  const accountStatusLabel = getAccountStatusLabel(membershipTier);

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

  const [isProfileHeaderOpen, setIsProfileHeaderOpen] = useState(true);
  const [isPersonalMetricsOpen, setIsPersonalMetricsOpen] = useState(true);
  const [isBodyMeasurementsOpen, setIsBodyMeasurementsOpen] = useState(true);
  const [isBadgesOpen, setIsBadgesOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Compute initials fallback from Full Name
  const computeInitials = (nameStr: string) => {
    if (!nameStr || !nameStr.trim()) return 'U';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

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
      img.onerror = () => {
        setAvatarUrl(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // reset input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
  };

  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
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

      const numericMeasurements = Object.keys(measurements).reduce((acc, k) => {
        const v = measurements[k];
        acc[k] = v === '' ? 0 : Number(v);
        return acc;
      }, {} as Record<string, number>);

      await updateUserProfile(userProfile.userId, {
        fullName,
        avatarUrl,
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
      });
      setSaveSuccess(true);
      onProfileUpdate();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Mobile-Only Main Nav Bar Row */}
      <div className="md:hidden bg-brand-surface p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-2 shadow-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setActiveTab('reports');
            setStep('history');
            await loadHistory();
          }}
          className="flex-1 gap-1.5 text-xs py-2 bg-white/5 border-white/10 text-gray-200"
        >
          <History className="w-3.5 h-3.5 text-brand-primary" />
          <span>My Reports</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (hasAccess) setActiveTab('gym');
            else setStep('no-access');
          }}
          className="flex-1 gap-1.5 text-xs py-2 bg-white/5 border-white/10 text-gray-200"
        >
          <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
          <span>Gym Hub</span>
        </Button>

        {isTrainer && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('client-hub')}
            className="flex-1 gap-1.5 text-xs py-2 bg-amber-400/10 border-amber-400/30 text-amber-400 font-bold"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Client Hub</span>
          </Button>
        )}
      </div>

      {/* Profile Header Banner */}
      <Card className="p-4 sm:p-6 bg-brand-surface border-white/10 relative overflow-hidden space-y-4">
        <div 
          onClick={() => setIsProfileHeaderOpen(!isProfileHeaderOpen)}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-brand-primary/50 bg-black/40 flex items-center justify-center text-xs font-black text-brand-primary shrink-0 shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                computeInitials(fullName)
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <h2 className="text-base sm:text-lg font-black text-white group-hover:text-brand-primary transition-colors tracking-tight">
                  Profile
                </h2>
                <UiBadge className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border shrink-0",
                  membershipTier === 'coach'
                    ? "bg-amber-400/20 text-amber-400 border-amber-400/40" 
                    : membershipTier === 'premium'
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                    : "bg-brand-primary/20 text-brand-primary border-brand-primary/40"
                )}>
                  {accountStatusLabel}
                </UiBadge>
              </div>
              <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenLevelModal) onOpenLevelModal();
                  }}
                  className="hover:text-brand-primary transition-colors cursor-pointer font-bold underline decoration-brand-primary/40 underline-offset-2"
                  title="Click to view Level Progression & XP"
                >
                  Level {level}
                </button>
                <span>•</span>
                <span>Streak {userProfile?.streak ?? 0} Days</span>
                <span>•</span>
                <span>XP {userProfile?.xp ?? 0}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
            <AnimatePresence>
              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Auto-saved</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-400 group-hover:text-white transition-colors shadow-sm ml-2">
              {isProfileHeaderOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isProfileHeaderOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-4 border-t border-white/5"
            >
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar with Drag & Drop and Action Buttons */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative group">
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleAvatarDrop}
                      className="w-24 h-24 rounded-full overflow-hidden border-2 border-brand-primary/50 bg-black/40 flex items-center justify-center relative cursor-pointer shadow-xl transition-all group-hover:border-brand-primary"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-display font-black text-brand-primary tracking-wider">
                          {computeInitials(fullName)}
                        </span>
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-bold cursor-pointer transition-opacity">
                        <Camera className="w-5 h-5 mb-1 text-brand-primary" />
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                      </label>
                    </div>
                    {isTrainer && (
                      <span className="absolute -bottom-1 -right-1 bg-amber-400 text-brand-dark p-1 rounded-full text-[10px] shadow-lg" title="Trainer Tier Account">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <label className="text-[10px] font-bold text-brand-primary hover:text-white cursor-pointer bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 px-2 py-1 rounded transition-colors flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>{avatarUrl ? 'Change' : 'Upload'}</span>
                      <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                    </label>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Core Info */}
                <div className="space-y-2.5 text-center sm:text-left flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                    <h1 className="text-2xl font-display font-black text-white">{fullName}</h1>
                    <UiBadge className={cn(
                      "text-[9px] font-black uppercase tracking-wider self-center sm:self-auto px-2.5 py-0.5 rounded-md border",
                      membershipTier === 'coach'
                        ? "bg-amber-400/20 text-amber-400 border-amber-400/40" 
                        : membershipTier === 'premium'
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        : "bg-brand-primary/20 text-brand-primary border-brand-primary/40"
                    )}>
                      {accountStatusLabel}
                    </UiBadge>
                  </div>
                  <p className="text-xs text-gray-400 font-medium">{userEmail || 'registered@unlckd.com'}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenLevelModal) onOpenLevelModal();
                      }}
                      className="text-gray-300 font-mono hover:text-brand-primary transition-colors cursor-pointer group flex items-center gap-1"
                      title="Click to view Level Progression & XP"
                    >
                      <span>Level</span>
                      <strong className="text-brand-primary group-hover:underline">{level}</strong>
                    </button>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300 font-mono">
                      Streak <strong className="text-amber-400">{userProfile?.streak ?? 0} Days</strong>
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300 font-mono">
                      XP <strong className="text-emerald-400">{userProfile?.xp || 1250}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Editable Fields Grid (Collapsible) */}
      <Card className="p-4 sm:p-6 bg-brand-surface border-white/10 space-y-4">
        <div 
          onClick={() => setIsPersonalMetricsOpen(!isPersonalMetricsOpen)}
          className="flex items-center justify-between cursor-pointer group"
        >
          <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-2 group-hover:text-white transition-colors">
            <User className="w-4 h-4 text-brand-primary shrink-0" /> Personal Metrics & Targets
          </h3>
          <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-gray-400 group-hover:text-white shrink-0">
            {isPersonalMetricsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        <AnimatePresence>
          {isPersonalMetricsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2 border-t border-white/5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium focus:border-brand-primary outline-none"
                  />
                </div>

                {/* Age */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                  />
                </div>

                {/* Height */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Height</label>
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
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                      />
                      <span className="absolute right-3 text-xs text-gray-400 font-mono">cm</span>
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
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                        />
                        <span className="absolute right-3 text-xs text-gray-400 font-mono font-bold">ft</span>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="11"
                          placeholder="10"
                          value={inchesInput}
                          onChange={(e) => setInchesInput(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                        />
                        <span className="absolute right-3 text-xs text-gray-400 font-mono font-bold">in</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Weight */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-400 uppercase">Current Weight</label>
                    <UnitToggle<'lbs' | 'kg'>
                      unitA="lbs"
                      unitB="kg"
                      labelA="[LBS]"
                      labelB="[KG]"
                      value={weightUnit}
                      onChange={(u) => {
                        const numW = weight === '' ? 0 : Number(weight);
                        const numGW = goalWeight === '' ? 0 : Number(goalWeight);
                        if (u === 'kg' && weightUnit === 'lbs') {
                          setWeight(numW > 0 ? Math.round(numW * 0.453592) : '');
                          setGoalWeight(numGW > 0 ? Math.round(numGW * 0.453592) : '');
                        }
                        if (u === 'lbs' && weightUnit === 'kg') {
                          setWeight(numW > 0 ? Math.round(numW / 0.453592) : '');
                          setGoalWeight(numGW > 0 ? Math.round(numGW / 0.453592) : '');
                        }
                        setWeightUnit(u);
                      }}
                      size="sm"
                    />
                  </div>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                  />
                </div>

                {/* Goal Weight */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Goal Weight ({weightUnit})</label>
                  <input
                    type="number"
                    value={goalWeight}
                    onChange={(e) => setGoalWeight(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-brand-primary outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Body Measurements Section (Collapsible) */}
      <Card className="p-4 sm:p-6 bg-brand-surface border-white/10 space-y-4 overflow-hidden">
        <div 
          onClick={() => setIsBodyMeasurementsOpen(!isBodyMeasurementsOpen)}
          className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 cursor-pointer group min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0 shrink">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 group-hover:text-white transition-colors truncate">
              <Ruler className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Body Measurements (10 Points)</span>
            </h3>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto">
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
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
            </div>
            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-gray-400 group-hover:text-white shrink-0">
              {isBodyMeasurementsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isBodyMeasurementsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2 border-t border-white/5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                {[
                  { key: 'neck', label: 'Neck' },
                  { key: 'chest', label: 'Chest' },
                  { key: 'waist', label: 'Waist' },
                  { key: 'hips', label: 'Hips' },
                  { key: 'leftArm', label: 'Left Arm' },
                  { key: 'rightArm', label: 'Right Arm' },
                  { key: 'leftThigh', label: 'Left Thigh' },
                  { key: 'rightThigh', label: 'Right Thigh' },
                  { key: 'leftCalf', label: 'Left Calf' },
                  { key: 'rightCalf', label: 'Right Calf' },
                ].map(({ key, label }) => (
                  <div key={key} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">{label}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={measurements[key as keyof typeof measurements] ?? ''}
                        onChange={(e) => {
                          setMeasurements(prev => ({ ...prev, [key]: e.target.value }));
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:border-brand-primary outline-none"
                      />
                      <span className="text-[10px] text-gray-500 font-mono uppercase">{measurementLengthUnit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Weight Progression Chart (Moved to Profile) */}
      <WeightProgressionChart defaultCollapsed={false} />

      {/* Badges Section (Collapsible, Full Year Grid) */}
      <Card className="p-6 bg-brand-surface border-white/10 space-y-4">
        <div 
          onClick={() => setIsBadgesOpen(!isBadgesOpen)}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                Accomplishment Badges & Milestones
              </h3>
              <p className="text-[10px] text-gray-400">12 Monthly Badges + Milestone Achievements</p>
            </div>
          </div>

          <div className="p-2 bg-white/5 rounded-lg border border-white/10 text-gray-400 group-hover:text-white">
            {isBadgesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        <AnimatePresence>
          {isBadgesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2 border-t border-white/5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
                {DEFAULT_YEAR_BADGES.map((badge) => {
                  const userBadge = userProfile?.badges?.find(
                    (b) => b.id === badge.id || b.name.toLowerCase() === badge.name.toLowerCase()
                  );
                  let isUnlocked = Boolean(userBadge?.unlockedAt);
                  let unlockedAtDate = userBadge?.unlockedAt || '';

                  // Dynamic check based on actual recorded user profile data
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
                        "p-3 rounded-xl border flex flex-col justify-between space-y-2 transition-all",
                        isUnlocked
                          ? "bg-amber-400/5 border-amber-400/30 text-white"
                          : "bg-white/[0.01] border-white/5 text-gray-500 opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{badge.icon}</span>
                        {isUnlocked ? (
                          <UiBadge className="bg-amber-400/20 text-amber-400 border-amber-400/40 text-[8px] font-mono">
                            Unlocked
                          </UiBadge>
                        ) : (
                          <span className="text-[9px] font-mono text-gray-600">Locked</span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{badge.name}</h4>
                        <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight mt-0.5">{badge.description}</p>
                      </div>

                      {isUnlocked && unlockedAtDate && (
                        <p className="text-[8px] font-mono text-amber-400/70 pt-1 border-t border-amber-400/10">
                          Earned {unlockedAtDate}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};
