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
  Activity
} from 'lucide-react';
import { Card, Badge as UiBadge } from './ui/Card';
import { Button } from './ui/Button';
import { UnitToggle } from './UnitToggle';
import { UserProfile, Badge as UserBadge } from '../types';
import { cn } from '../lib/utils';
import { updateUserProfile } from '../services/accessService';

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
  isPremium
}) => {
  const isTrainer = userProfile?.membershipTier === 'trainer';

  // State for editable profile fields
  const [fullName, setFullName] = useState(userProfile?.fullName || userName || 'Marcus Vance');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');
  
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
  const [level, setLevel] = useState<number>(Math.floor((userProfile?.xp || 1250) / 500) + 1);

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

  const handleAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      setTimeout(() => setSaveSuccess(false), 2500);
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
      <Card className="p-6 bg-brand-surface border-white/10 relative overflow-hidden space-y-4">
        <div 
          onClick={() => setIsProfileHeaderOpen(!isProfileHeaderOpen)}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-brand-primary/50 bg-black/40 flex items-center justify-center text-xs font-black text-brand-primary">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                computeInitials(fullName)
              )}
            </div>
            <div>
              <h2 className="text-sm font-black text-white group-hover:text-brand-primary transition-colors flex items-center gap-2">
                Athlete Profile Header
                <UiBadge className={cn(
                  "text-[8px] font-black uppercase tracking-wider",
                  isTrainer 
                    ? "bg-amber-400/20 text-amber-400 border-amber-400/40" 
                    : "bg-brand-primary/20 text-brand-primary border-brand-primary/40"
                )}>
                  {isTrainer ? 'Pro Trainer' : 'Athlete Member'}
                </UiBadge>
              </h2>
              <p className="text-[10px] text-gray-400">Level {level} • Streak {userProfile?.streak || 14} Days • XP {userProfile?.xp || 1250}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveProfile();
              }}
              disabled={isSaving}
              size="sm"
              className={cn(
                "gap-1.5 font-black text-[10px] uppercase px-4 py-1.5 transition-all",
                saveSuccess 
                  ? "bg-emerald-500 text-brand-dark" 
                  : "bg-brand-primary text-brand-dark hover:bg-brand-primary/90"
              )}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save
                </>
              )}
            </Button>
            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-gray-400 group-hover:text-white">
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
                {/* Avatar with Drag & Drop */}
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

                {/* Core Info */}
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h1 className="text-2xl font-display font-black text-white">{fullName}</h1>
                    <UiBadge className={cn(
                      "text-[9px] font-black uppercase tracking-wider self-center sm:self-auto",
                      isTrainer 
                        ? "bg-amber-400/20 text-amber-400 border-amber-400/40" 
                        : "bg-brand-primary/20 text-brand-primary border-brand-primary/40"
                    )}>
                      {isTrainer ? 'Pro Trainer' : 'Athlete Member'}
                    </UiBadge>
                  </div>
                  <p className="text-xs text-gray-400">{userEmail || 'registered@unlckd.com'}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs">
                    <span className="text-gray-300 font-mono">
                      Level <strong className="text-brand-primary">{level}</strong>
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300 font-mono">
                      Streak <strong className="text-amber-400">{userProfile?.streak || 14} Days</strong>
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300 font-mono">
                      XP <strong className="text-emerald-400">{userProfile?.xp || 1250}</strong>
                    </span>
                  </div>
                </div>

                {/* Save Button */}
                <div className="w-full sm:w-auto">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className={cn(
                      "w-full sm:w-auto gap-2 font-black text-xs uppercase px-6 py-2.5 transition-all",
                      saveSuccess 
                        ? "bg-emerald-500 text-brand-dark" 
                        : "bg-brand-primary text-brand-dark hover:bg-brand-primary/90"
                    )}
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-4 h-4" /> Saved!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Editable Fields Grid (Collapsible) */}
      <Card className="p-6 bg-brand-surface border-white/10 space-y-4">
        <div 
          onClick={() => setIsPersonalMetricsOpen(!isPersonalMetricsOpen)}
          className="flex items-center justify-between cursor-pointer group"
        >
          <h3 className="text-xs font-black uppercase tracking-widest text-brand-primary flex items-center gap-2 group-hover:text-white transition-colors">
            <User className="w-4 h-4 text-brand-primary" /> Personal Metrics & Targets
          </h3>
          <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-gray-400 group-hover:text-white">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
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
      <Card className="p-6 bg-brand-surface border-white/10 space-y-4">
        <div 
          onClick={() => setIsBodyMeasurementsOpen(!isBodyMeasurementsOpen)}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 group-hover:text-white transition-colors">
              <Ruler className="w-4 h-4 text-emerald-400" /> Body Measurements (10 Points)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div onClick={(e) => e.stopPropagation()}>
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
            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 text-gray-400 group-hover:text-white">
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
