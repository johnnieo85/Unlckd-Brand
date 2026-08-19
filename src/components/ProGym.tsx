import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Activity, 
  Droplets, 
  Zap as ZapIcon,
  Check,
  Save,
  Scale,
  Footprints, 
  CheckCircle2, 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown,
  Target, 
  Calendar,
  Utensils,
  Moon,
  Sun,
  Dumbbell,
  Ruler,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  LockOpen,
  Info,
  Sparkles,
  Settings,
  BarChart3,
  ClipboardList,
  GripVertical,
  Edit2,
  Trash2,
  Shield,
  Download,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  FileText,
  Award,
  Trophy,
  Waves,
  Flame,
  X
} from 'lucide-react';
import { 
  Card, 
  Badge, 
  Button, 
  Input, 
  DisplayHeading, 
  SectionHeading, 
  ContentHeading, 
  MetricDisplay, 
  MetadataLabel, 
  Divider 
} from './ui';
import { UnitToggle } from './UnitToggle';
import { ExerciseCard } from './ExerciseCard';
import { ProgressReportModal } from './ProgressReportModal';
import { checkReportOverlaps } from '../utils/reportOverlap';
import { RecoveryScheduleView } from './RecoveryScheduleView';
import { gymService } from '../services/gymService';
import { DailyLog, SavedReport, Measurement, UserProfile, Badge as UserBadge, RecoverySession } from '../types';
import { cn, downloadFile, getLocalDateString, parseLocalDate, safeStorage, getPlanDurationWeeks } from '../lib/utils';
import { assessWorkoutFocus } from '../utils/focusAssessor';
import { getWeeklyQuote } from '../constants/quotes';
import { updateUserProfile } from '../services/accessService';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Scatter,
  ScatterChart,
  ZAxis
} from 'recharts';

import { auth } from '../lib/firebase';
import { getLevelInfo } from '../lib/levels';
import { LevelInfoModal } from './LevelInfoModal';
import { GymQuickTrackers } from './GymQuickTrackers';

const SortableTracker = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-3.5 right-3 p-1.5 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-lg opacity-40 group-hover:opacity-100 transition-all z-10"
        title="Drag to reorder card"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </div>
  );
};

const Ring = ({ 
  progress, 
  color, 
  size = 80, 
  strokeWidth = 8, 
  icon: Icon,
  label 
}: { 
  progress: number; 
  color: string; 
  size?: number; 
  strokeWidth?: number; 
  icon: any;
  label: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 1) * circumference);

  return (
    <div className="flex flex-col items-center gap-1.5 group max-w-[90px] mx-auto">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-white/5"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset }}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block truncate">{label}</span>
        <div className="text-xs font-mono font-bold text-gray-200">{Math.round(progress * 100)}%</div>
      </div>
    </div>
  );
};

const getWeeklyQuoteInternal = () => {
  return getWeeklyQuote();
};

const getSearchUrl = (title: string, category: 'Workouts' | 'Nutrition') => {
  // Enhanced cleaning to handle cases like "W1 Friday Session" or other session-only titles
  const cleanTitle = title
    .replace(/^W\d+.*?(Session|Workout|Day\s+\d+).*?:?\s*/i, '') // Remove batch prefixes
    .replace(/^(Warm-up|MainWork|Primary|Sequence):\s*/i, '')   // Remove section headers
    .trim();
  
  // If the result is just a date-like or session-like string, it's not an exercise
  if (!cleanTitle || /^(Week|Day|Session|Workout)\s*\d*$/i.test(cleanTitle)) {
    return '#'; 
  }

  if (category === 'Workouts') {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTitle + ' exercise demonstration')}`;
  }
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(cleanTitle + ' healthy recipe')}`;
};

interface MonthlyGoal {
  monthName: string;
  badgeId: string;
  badgeName: string;
  missionName: string;
  description: string;
  rewardDetail: string;
  icon: React.ComponentType<any>;
}

const MONTHLY_GOALS: MonthlyGoal[] = [
  {
    monthName: "January",
    badgeId: "resolute",
    badgeName: "Jan Resolute",
    missionName: "The 'Resolute' January Initiative",
    description: "Establish consistency in the new year. Complete at least 20 workouts during the month of January to lay a rock-solid foundation.",
    rewardDetail: "Complete 20 total workouts in January",
    icon: Dumbbell
  },
  {
    monthName: "February",
    badgeId: "cardio_heart",
    badgeName: "Feb Pulse",
    missionName: "The 'Pulse' February Mission",
    description: "Prioritize cardiovascular conditioning. Log 150 minutes of zone 2 training in February to boost heart health.",
    rewardDetail: "Log 150+ cardio minutes in February",
    icon: Activity
  },
  {
    monthName: "March",
    badgeId: "hydration_march",
    badgeName: "March Splash",
    missionName: "The 'H2O' March Splash",
    description: "Build a hydration routine. Hit your personalized water target 25 days out of the month to keep cellular hydration optimal.",
    rewardDetail: "Hit hydration target 25 days in March",
    icon: Droplets
  },
  {
    monthName: "April",
    badgeId: "spring_gains",
    badgeName: "April Energizer",
    missionName: "The 'Energizer' April Sprint",
    description: "Step up your daily energy expenditure. Hit 8,000 steps minimum every single day for at least 15 days in April.",
    rewardDetail: "Hit 8k steps for 15 days in April",
    icon: Footprints
  },
  {
    monthName: "May",
    badgeId: "stepper",
    badgeName: "May Stepper",
    missionName: "The 'Stepper' May Mission",
    description: "Average 10,000 steps daily throughout the month of May. This is a community-wide focus for all UNLCKD members.",
    rewardDetail: "Average 10,000 steps daily throughout May",
    icon: Footprints
  },
  {
    monthName: "June",
    badgeId: "shredder_june",
    badgeName: "June Sculptor",
    missionName: "The 'Sculptor' June Cut",
    description: "Focus on nutritional precision during prime summer. Log consecutive precise meal plans for 14 days without skipping tracking.",
    rewardDetail: "Log perfect nutrition for 14 days in June",
    icon: Utensils
  },
  {
    monthName: "July",
    badgeId: "midyear_beast",
    badgeName: "July Fire",
    missionName: "The 'Fire' July Heat",
    description: "Maintain your active lifestyle during hot summer peak. Complete a strength/hypertrophy program with 100% adherence.",
    rewardDetail: "100% training program adherence in July",
    icon: Dumbbell
  },
  {
    monthName: "August",
    badgeId: "recovery_august",
    badgeName: "August Zen",
    missionName: "The 'Zen' August Reset",
    description: "Focus heavily on recovery, joint decompression, and sleep hygiene. Log at least 8 hours of quality sleep for 20 nights in August.",
    rewardDetail: "Log 8hr sleep for 20 nights in August",
    icon: Moon
  },
  {
    monthName: "September",
    badgeId: "back_to_grind",
    badgeName: "Sept Grind",
    missionName: "The 'Grind' September Re-Entry",
    description: "Reset after lazy summer. Re-establish routines by hitting both sleep structure and workout frequency perfectly for 3 full weeks.",
    rewardDetail: "Complete 3-week routine reset in September",
    icon: Calendar
  },
  {
    monthName: "October",
    badgeId: "autumn_peak",
    badgeName: "Oct Peak",
    missionName: "The 'Peak' October Ascend",
    description: "Push for personal records or heavy lifts. Log a new weight or measurement record in any primary tracking parameter.",
    rewardDetail: "Set a premium target metric in October",
    icon: TrendingUp
  },
  {
    monthName: "November",
    badgeId: "iron_discipline",
    badgeName: "Nov Iron",
    missionName: "The 'Iron' November Crucible",
    description: "Remain disciplined while holiday temptations begin. Hit daily calorie and macro-nutrient targets within 5% variation for 20 days.",
    rewardDetail: "Keep macro-precision for 20 days in November",
    icon: Utensils
  },
  {
    monthName: "December",
    badgeId: "unbreakable_dec",
    badgeName: "Dec Finish",
    missionName: "The 'Finish' December Unbreakable",
    description: "End the year with momentum. Complete at least 4 active recovery sessions or workouts in the final week of December.",
    rewardDetail: "Finish the year strong in final week of December",
    icon: Shield
  }
];

export interface BadgeTier {
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  tierLevel: number;
  targetValue: number;
  targetLabel: string;
  reqDescription: string;
}

export interface AccomplishmentBadgeDef {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<any>;
  unit: string;
  tiers: BadgeTier[];
  getProgressValue: (reportLogs: DailyLog[], currentLog: DailyLog | null, userProfile: UserProfile | null, measurements?: Measurement[]) => number;
}

export const ACCOMPLISHMENT_BADGES: AccomplishmentBadgeDef[] = [
  {
    id: 'big-foot',
    name: 'Big Foot',
    category: 'Step Master',
    description: 'Walk like a giant! Reach massive single-day step records.',
    icon: Footprints,
    unit: 'steps',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 10000, targetLabel: '10k Steps Day', reqDescription: 'Log 10,000 steps in a single day' },
      { tier: 'Silver', tierLevel: 2, targetValue: 15000, targetLabel: '15k Steps Day', reqDescription: 'Log 15,000 steps in a single day' },
      { tier: 'Gold', tierLevel: 3, targetValue: 20000, targetLabel: '20k Steps Day', reqDescription: 'Log 20,000 steps in a single day' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 25000, targetLabel: '25k Steps Day', reqDescription: 'Log 25,000 steps in a single day' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.reduce((max, l) => Math.max(max, Number(l.steps) || 0), 0);
    }
  },
  {
    id: 'triple-crown',
    name: 'Triple Crown',
    category: 'Gym Sessions',
    description: 'Crush gym workouts with iron discipline and total consistency.',
    icon: Trophy,
    unit: 'sessions',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 3, targetLabel: '3 Gym Sessions', reqDescription: 'Log 3 total gym workout sessions' },
      { tier: 'Silver', tierLevel: 2, targetValue: 10, targetLabel: '10 Gym Sessions', reqDescription: 'Log 10 total gym workout sessions' },
      { tier: 'Gold', tierLevel: 3, targetValue: 25, targetLabel: '25 Gym Sessions', reqDescription: 'Log 25 total gym workout sessions' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 50, targetLabel: '50 Gym Sessions', reqDescription: 'Log 50 total gym workout sessions' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.filter(l => (l.completedWorkouts || 0) > 0 || l.useManualWorkout || (l.workoutData && Object.keys(l.workoutData).length > 0)).length;
    }
  },
  {
    id: 'shape-shifter',
    name: 'Shape Shifter',
    category: 'Body Measurements',
    description: 'Log updated body measurements showing net improvement vs. initial.',
    icon: Ruler,
    unit: 'check-ins',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 1, targetLabel: '1 Check-in', reqDescription: '1 measurement check-in with improvement' },
      { tier: 'Silver', tierLevel: 2, targetValue: 3, targetLabel: '3 Check-ins', reqDescription: '3 measurement check-ins with improvement' },
      { tier: 'Gold', tierLevel: 3, targetValue: 6, targetLabel: '6 Check-ins', reqDescription: '6 measurement check-ins with improvement' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 12, targetLabel: '12 Check-ins', reqDescription: '12 measurement check-ins with improvement' }
    ],
    getProgressValue: (reportLogs, currentLog, userProfile, measurements) => {
      const ms = measurements || [];
      const mCount = ms.filter(m => Boolean(m.weight || m.bodyFat || m.chest || m.waist || m.arms || m.leftArm || m.rightArm || m.leftThigh || m.rightThigh || m.neck)).length;
      const profileM = userProfile?.bodyMeasurements && Object.keys(userProfile.bodyMeasurements).length > 0 ? 1 : 0;
      return Math.max(mCount, profileM);
    }
  },
  {
    id: 'scale-tipper',
    name: 'Scale Tipper',
    category: 'Weight Goal Progress',
    description: 'Move net body weight toward your stated weight goal.',
    icon: TrendingDown,
    unit: 'lb toward goal',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 2, targetLabel: '2 lb Progress', reqDescription: '2 lb net weight progress toward goal' },
      { tier: 'Silver', tierLevel: 2, targetValue: 5, targetLabel: '5 lb Progress', reqDescription: '5 lb net weight progress toward goal' },
      { tier: 'Gold', tierLevel: 3, targetValue: 10, targetLabel: '10 lb Progress', reqDescription: '10 lb net weight progress toward goal' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 15, targetLabel: 'Goal Reached', reqDescription: 'Goal weight reached or 15+ lb net progress' }
    ],
    getProgressValue: (reportLogs, currentLog, userProfile, measurements) => {
      const ms = measurements || [];
      const weights = ms.map(m => m.weight).filter((w): w is number => typeof w === 'number' && w > 0);
      if (weights.length >= 2) {
        const initial = weights[0];
        const latest = weights[weights.length - 1];
        return Math.max(0, Math.round(Math.abs(initial - latest) * 10) / 10);
      }
      if (weights.length === 1 && userProfile?.weight) {
        return Math.max(0, Math.round(Math.abs(userProfile.weight - weights[0]) * 10) / 10);
      }
      return 0;
    }
  },
  {
    id: 'grind-mode',
    name: 'Grind Mode',
    category: 'XP Accumulation',
    description: 'Earn total XP across all logged workouts, health activities, and habits.',
    icon: ZapIcon,
    unit: 'XP',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 1000, targetLabel: '1,000 XP', reqDescription: 'Earn 1,000 total XP' },
      { tier: 'Silver', tierLevel: 2, targetValue: 5000, targetLabel: '5,000 XP', reqDescription: 'Earn 5,000 total XP' },
      { tier: 'Gold', tierLevel: 3, targetValue: 10000, targetLabel: '10,000 XP', reqDescription: 'Earn 10,000 total XP' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 25000, targetLabel: '25,000 XP', reqDescription: 'Earn 25,000 total XP' }
    ],
    getProgressValue: (reportLogs, currentLog, userProfile) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      const calculatedXp = logs.reduce((acc, l) => {
        let xp = 0;
        if ((l.completedWorkouts || 0) > 0 || l.useManualWorkout) xp += 100;
        if (l.water >= 2000) xp += 25;
        if ((l.sleepHours || 0) >= 7) xp += 50;
        if (l.habits) xp += Object.values(l.habits).filter(Boolean).length * 10;
        return acc + xp;
      }, 0);
      return Math.max(userProfile?.xp || 0, calculatedXp);
    }
  },
  {
    id: 'no-days-off',
    name: 'No Days Off',
    category: 'Perfect Week',
    description: 'Hit every planned session, meal log, and step goal in a single week.',
    icon: Calendar,
    unit: 'perfect weeks',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 1, targetLabel: '1 Perfect Week', reqDescription: 'Complete 1 perfect week of sessions, meals & steps' },
      { tier: 'Silver', tierLevel: 2, targetValue: 4, targetLabel: '4 Perfect Weeks', reqDescription: 'Complete 4 perfect weeks of sessions, meals & steps' },
      { tier: 'Gold', tierLevel: 3, targetValue: 12, targetLabel: '12 Perfect Weeks', reqDescription: 'Complete 12 perfect weeks of sessions, meals & steps' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 26, targetLabel: '26 Perfect Weeks', reqDescription: 'Complete 26 perfect weeks of sessions, meals & steps' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      const weeks: Record<string, DailyLog[]> = {};
      logs.forEach(l => {
        if (!l.date) return;
        const d = parseLocalDate(l.date) || new Date(l.date);
        const year = d.getFullYear();
        const firstJan = new Date(year, 0, 1);
        const weekNum = Math.ceil((((d.getTime() - firstJan.getTime()) / 86400000) + firstJan.getDay() + 1) / 7);
        const key = `${year}-W${weekNum}`;
        if (!weeks[key]) weeks[key] = [];
        weeks[key].push(l);
      });
      let perfectWeeks = 0;
      Object.values(weeks).forEach(weekLogs => {
        const activeDays = weekLogs.filter(l => 
          ((l.completedWorkouts || 0) > 0 || l.useManualWorkout) && 
          Boolean(l.meals && l.meals.length > 0) && 
          ((Number(l.steps) || 0) >= 5000 || (l.habits && Object.values(l.habits).some(Boolean)))
        ).length;
        if (activeDays >= 5) perfectWeeks++;
      });
      return perfectWeeks;
    }
  },
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    category: 'Streak Recovery',
    description: 'Rebuild an active streak of logged days after a break of 3+ missed days.',
    icon: RotateCcw,
    unit: 'days rebuilt',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 3, targetLabel: '3-Day Comeback', reqDescription: 'Rebuild a 3-day active streak after a break' },
      { tier: 'Silver', tierLevel: 2, targetValue: 7, targetLabel: '7-Day Comeback', reqDescription: 'Rebuild a 7-day active streak after a break' },
      { tier: 'Gold', tierLevel: 3, targetValue: 14, targetLabel: '14-Day Comeback', reqDescription: 'Rebuild a 14-day active streak after a break' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 30, targetLabel: '30-Day Comeback', reqDescription: 'Rebuild a 30-day active streak after a break' }
    ],
    getProgressValue: (reportLogs, currentLog, userProfile) => {
      const currentStreak = userProfile?.streak || 0;
      const logs = [...reportLogs].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      let maxComeback = 0;
      let tempStreak = 0;
      let gapFound = false;

      for (let i = 1; i < logs.length; i++) {
        const prev = parseLocalDate(logs[i - 1].date);
        const curr = parseLocalDate(logs[i].date);
        if (prev && curr) {
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));
          if (diffDays >= 4) {
            gapFound = true;
            tempStreak = 1;
          } else if (diffDays === 1) {
            tempStreak++;
            if (gapFound) {
              maxComeback = Math.max(maxComeback, tempStreak);
            }
          } else {
            tempStreak = 1;
          }
        }
      }
      return Math.max(maxComeback, currentStreak);
    }
  },
  {
    id: 'monthly-collector',
    name: 'Monthly Collector',
    category: 'Monthly Challenges',
    description: 'Consistently conquer monthly challenges and collect official monthly challenge badges.',
    icon: Award,
    unit: 'monthly badges',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 1, targetLabel: '1 Monthly Badge', reqDescription: 'Earn 1 monthly challenge badge' },
      { tier: 'Silver', tierLevel: 2, targetValue: 3, targetLabel: '3 Monthly Badges', reqDescription: 'Earn 3 monthly challenge badges' },
      { tier: 'Gold', tierLevel: 3, targetValue: 6, targetLabel: '6 Monthly Badges', reqDescription: 'Earn 6 monthly challenge badges' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 12, targetLabel: '12 Monthly Badges', reqDescription: 'Earn 12 monthly challenge badges' }
    ],
    getProgressValue: (reportLogs, currentLog, userProfile) => {
      const userBadges = userProfile?.badges || [];
      return userBadges.filter(b => b.icon === 'monthly-badge' || b.id.includes('august') || b.id.includes('zen') || b.id.includes('challenge') || b.id.includes('reset')).length;
    }
  },
  {
    id: 'sleep-tracker',
    name: 'Sleep Tracker',
    category: 'Sleep Logging',
    description: 'Consistently log nightly sleep hours and quality.',
    icon: Moon,
    unit: 'nights logged',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 7, targetLabel: '7 Nights Logged', reqDescription: 'Log sleep for 7 total nights' },
      { tier: 'Silver', tierLevel: 2, targetValue: 21, targetLabel: '21 Nights Logged', reqDescription: 'Log sleep for 21 total nights' },
      { tier: 'Gold', tierLevel: 3, targetValue: 60, targetLabel: '60 Nights Logged', reqDescription: 'Log sleep for 60 total nights' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 100, targetLabel: '100 Nights Logged', reqDescription: 'Log sleep for 100 total nights' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.filter(l => (l.sleepHours || 0) > 0 || Boolean(l.sleepQuality)).length;
    }
  },
  {
    id: 'habit-master',
    name: 'Habit Master',
    category: 'Daily Habit Compliance',
    description: 'Log daily habits and achieve compliance goals consistently.',
    icon: CheckCircle2,
    unit: 'habits completed',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 10, targetLabel: '10 Completed Habits', reqDescription: 'Log 10 total completed daily habit checkmarks' },
      { tier: 'Silver', tierLevel: 2, targetValue: 30, targetLabel: '30 Completed Habits', reqDescription: 'Log 30 total completed daily habit checkmarks' },
      { tier: 'Gold', tierLevel: 3, targetValue: 100, targetLabel: '100 Completed Habits', reqDescription: 'Log 100 total completed daily habit checkmarks' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 250, targetLabel: '250 Completed Habits', reqDescription: 'Log 250 total completed daily habit checkmarks' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.reduce((acc, l) => {
        if (!l.habits) return acc;
        return acc + Object.values(l.habits).filter(Boolean).length;
      }, 0);
    }
  },
  {
    id: 'aqua-man',
    name: 'Aqua Man',
    category: 'Hydration & Aquatic',
    description: 'Log aquatic swimming sessions or achieve top daily water intake targets.',
    icon: Waves,
    unit: 'days/sessions',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 1, targetLabel: '1 Swim / 2.5L Water', reqDescription: 'Log 1 swimming session or 2,500ml water day' },
      { tier: 'Silver', tierLevel: 2, targetValue: 5, targetLabel: '5 Swims / 3.5L Water', reqDescription: 'Log 5 swimming sessions or 3,500ml water days' },
      { tier: 'Gold', tierLevel: 3, targetValue: 15, targetLabel: '15 Swims / 4.5L Water', reqDescription: 'Log 15 swimming sessions or 4,500ml water days' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 30, targetLabel: '30 Swims / 5.0L Water', reqDescription: 'Log 30 swimming sessions or 5,000ml water days' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.filter(l => (l.water >= 2500) || (l.recoverySessions && l.recoverySessions.some(s => (s.title || s.modality || '').toLowerCase().includes('swim')))).length;
    }
  },
  {
    id: 'rubber-band-man',
    name: 'Rubber Band Man',
    category: 'Mobility & Recovery',
    description: 'Decompress joints and keep mobility smooth with dedicated recovery flows.',
    icon: ZapIcon,
    unit: 'mobility flows',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 3, targetLabel: '3 Mobility Flows', reqDescription: 'Log 3 mobility flows or recovery sessions' },
      { tier: 'Silver', tierLevel: 2, targetValue: 10, targetLabel: '10 Mobility Flows', reqDescription: 'Log 10 mobility flows or recovery sessions' },
      { tier: 'Gold', tierLevel: 3, targetValue: 25, targetLabel: '25 Mobility Flows', reqDescription: 'Log 25 mobility flows or recovery sessions' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 50, targetLabel: '50 Mobility Flows', reqDescription: 'Log 50 mobility flows or recovery sessions' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.reduce((acc, l) => acc + (l.recoverySessions ? l.recoverySessions.filter(s => s.completed).length : 0), 0);
    }
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    category: 'Schedule',
    description: 'Rise and grind! Complete early morning workout sessions before 7:00 AM.',
    icon: Sun,
    unit: 'early workouts',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 1, targetLabel: '1 Early Workout', reqDescription: 'Log 1 workout completed before 7:00 AM' },
      { tier: 'Silver', tierLevel: 2, targetValue: 5, targetLabel: '5 Early Workouts', reqDescription: 'Log 5 workouts completed before 7:00 AM' },
      { tier: 'Gold', tierLevel: 3, targetValue: 15, targetLabel: '15 Early Workouts', reqDescription: 'Log 15 workouts completed before 7:00 AM' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 30, targetLabel: '30 Early Workouts', reqDescription: 'Log 30 workouts completed before 7:00 AM' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.filter(l => (l.completedWorkouts || 0) > 0).length;
    }
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    category: 'Schedule',
    description: 'Put in work late at night while the rest of the world is sleeping.',
    icon: Moon,
    unit: 'evening workouts',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 1, targetLabel: '1 Evening Workout', reqDescription: 'Log 1 workout completed after 8:00 PM' },
      { tier: 'Silver', tierLevel: 2, targetValue: 5, targetLabel: '5 Evening Workouts', reqDescription: 'Log 5 workouts completed after 8:00 PM' },
      { tier: 'Gold', tierLevel: 3, targetValue: 15, targetLabel: '15 Evening Workouts', reqDescription: 'Log 15 workouts completed after 8:00 PM' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 30, targetLabel: '30 Evening Workouts', reqDescription: 'Log 30 workouts completed after 8:00 PM' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.filter(l => (l.completedWorkouts || 0) > 0).length;
    }
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    category: 'Consistency',
    description: 'Maintain unbroken daily active training and logging streaks.',
    icon: Flame,
    unit: 'days streak',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 3, targetLabel: '3-Day Streak', reqDescription: 'Maintain a 3-day workout & logging streak' },
      { tier: 'Silver', tierLevel: 2, targetValue: 7, targetLabel: '7-Day Streak', reqDescription: 'Maintain a 7-day workout & logging streak' },
      { tier: 'Gold', tierLevel: 3, targetValue: 14, targetLabel: '14-Day Streak', reqDescription: 'Maintain a 14-day workout & logging streak' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 30, targetLabel: '30-Day Streak', reqDescription: 'Maintain a 30-day workout & logging streak' }
    ],
    getProgressValue: (reportLogs, currentLog, userProfile) => {
      return userProfile?.streak || 0;
    }
  },
  {
    id: 'rest-master',
    name: 'Rest Master',
    category: 'Sleep & Recovery',
    description: 'Recharge your engine with optimal sleep hygiene and sleep duration.',
    icon: Sparkles,
    unit: 'days 8h sleep',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 1, targetLabel: '1 Night 7.5h Sleep', reqDescription: 'Log 7.5+ hours of sleep in a single night' },
      { tier: 'Silver', tierLevel: 2, targetValue: 5, targetLabel: '5 Nights 8.0h Sleep', reqDescription: 'Log 8.0+ hours of sleep for 5 nights' },
      { tier: 'Gold', tierLevel: 3, targetValue: 15, targetLabel: '15 Nights 8.0h Sleep', reqDescription: 'Log 8.0+ hours of sleep for 15 nights' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 30, targetLabel: '30 Nights 8.0h Sleep', reqDescription: 'Log 8.0+ hours of sleep for 30 nights' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.filter(l => (l.sleepHours || 0) >= 7.5).length;
    }
  },
  {
    id: 'hydration-hero',
    name: 'Hydration Hero',
    category: 'Health',
    description: 'Drink clean water consistently to maximize cell performance and recovery.',
    icon: Droplets,
    unit: 'ml water/day',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 2000, targetLabel: '2,000ml Day', reqDescription: 'Log 2,000ml of water in a single day' },
      { tier: 'Silver', tierLevel: 2, targetValue: 3000, targetLabel: '3,000ml Day', reqDescription: 'Log 3,000ml of water in a single day' },
      { tier: 'Gold', tierLevel: 3, targetValue: 4000, targetLabel: '4,000ml Day', reqDescription: 'Log 4,000ml of water in a single day' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 5000, targetLabel: '5,000ml Day', reqDescription: 'Log 5,000ml of water in a single day' }
    ],
    getProgressValue: (reportLogs, currentLog) => {
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.reduce((max, l) => Math.max(max, Number(l.water) || 0), 0);
    }
  },
  {
    id: 'macro-chef',
    name: 'Macro Chef',
    category: 'Nutrition',
    description: 'Fuel your body accurately by consistently logging meals and macros.',
    icon: Utensils,
    unit: 'days logged',
    tiers: [
      { tier: 'Bronze', tierLevel: 1, targetValue: 3, targetLabel: '3 Days Logged', reqDescription: 'Log all meals for 3 days' },
      { tier: 'Silver', tierLevel: 2, targetValue: 7, targetLabel: '7 Days Logged', reqDescription: 'Log all meals for 7 days' },
      { tier: 'Gold', tierLevel: 3, targetValue: 20, targetLabel: '20 Days Logged', reqDescription: 'Log all meals for 20 days' },
      { tier: 'Platinum', tierLevel: 4, targetValue: 50, targetLabel: '50 Days Logged', reqDescription: 'Log all meals for 50 days' }
    ],
    getProgressValue: (reportLogs, currentLog, userProfile) => {
      if (userProfile?.removedBadges?.includes('macro-chef')) return 0;
      const logs = [...reportLogs];
      if (currentLog) logs.push(currentLog);
      return logs.filter(l => Boolean(l.meals && l.meals.length > 0 && l.meals.some(m => m.completed) && l.meals.filter(m => m.completed).length >= Math.min(3, l.meals.length))).length;
    }
  }
];

export const getTierStyle = (tierName: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null) => {
  switch (tierName) {
    case 'Bronze':
      return {
        bg: 'bg-amber-950/20 hover:bg-amber-950/30',
        border: 'border-amber-700/40 hover:border-amber-600/60',
        iconBg: 'bg-amber-700/20 border border-amber-600/40',
        iconColor: 'text-amber-400',
        tag: 'bg-amber-900/40 text-amber-300 border-amber-700/40'
      };
    case 'Silver':
      return {
        bg: 'bg-slate-900/30 hover:bg-slate-900/40',
        border: 'border-slate-400/40 hover:border-slate-300/60',
        iconBg: 'bg-slate-400/20 border border-slate-300/40',
        iconColor: 'text-slate-200',
        tag: 'bg-slate-800/60 text-slate-200 border-slate-500/40'
      };
    case 'Gold':
      return {
        bg: 'bg-yellow-950/20 hover:bg-yellow-950/30',
        border: 'border-yellow-500/40 hover:border-yellow-400/60',
        iconBg: 'bg-yellow-500/20 border border-yellow-400/40 shadow-[0_0_12px_rgba(234,179,8,0.2)]',
        iconColor: 'text-yellow-400',
        tag: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/40'
      };
    case 'Platinum':
      return {
        bg: 'bg-cyan-950/20 hover:bg-cyan-950/30',
        border: 'border-cyan-400/40 hover:border-cyan-300/60',
        iconBg: 'bg-cyan-400/20 border border-cyan-300/40 shadow-[0_0_15px_rgba(34,211,238,0.25)]',
        iconColor: 'text-cyan-300',
        tag: 'bg-cyan-900/40 text-cyan-200 border-cyan-400/40'
      };
    default:
      return {
        bg: 'bg-white/[0.02] hover:bg-white/[0.04]',
        border: 'border-white/5 hover:border-white/10 opacity-70',
        iconBg: 'bg-white/5 border border-white/10',
        iconColor: 'text-gray-500',
        tag: 'bg-white/5 text-gray-400 border-white/10'
      };
  }
};

export const ProGym = ({ 
  latestReport, 
  savedReports,
  userProfile, 
  onProfileUpdate,
  onReportSaved,
  onHomeClick 
}: { 
  latestReport: SavedReport | null; 
  savedReports?: SavedReport[];
  userProfile: UserProfile | null; 
  onProfileUpdate?: () => void;
  onReportSaved?: () => void;
  onHomeClick?: () => void 
}) => {
  const numWeeks = getPlanDurationWeeks(latestReport?.userData?.planDuration);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
  const today = getLocalDateString(new Date());
  const isPastDate = selectedDate < today;

  const currentGoal = (() => {
    const activeDate = parseLocalDate(selectedDate) || new Date();
    const currentMonthIdx = activeDate.getMonth(); // 0-11
    return MONTHLY_GOALS[currentMonthIdx];
  })();

  const currentGoalDeadline = (() => {
    const activeDate = parseLocalDate(selectedDate) || new Date();
    const currentMonthIdx = activeDate.getMonth();
    const currentYear = activeDate.getFullYear();
    const lastDay = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    return `${currentMonthIdx + 1}/${lastDay}/${currentYear}`;
  })();

  const [log, setLog] = useState<DailyLog | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [hasDayMeasurement, setHasDayMeasurement] = useState(false);
  const [isMeasurementsExpanded, setIsMeasurementsExpanded] = useState(false);
  const [measurementPage, setMeasurementPage] = useState(1);
  const [unlockedDates, setUnlockedDates] = useState<Set<string>>(new Set([getLocalDateString(new Date())]));
  const [isConsistencyCollapsed, setIsConsistencyCollapsed] = useState(false);
  const [isNutritionCollapsed, setIsNutritionCollapsed] = useState(true);
  const [isTrainingCollapsed, setIsTrainingCollapsed] = useState(true);
  const [isWarmUpCollapsed, setIsWarmUpCollapsed] = useState(true);
  const [isMainWorkCollapsed, setIsMainWorkCollapsed] = useState(true);
  const [isHabitsCollapsed, setIsHabitsCollapsed] = useState(true);
  const [isWaterCollapsed, setIsWaterCollapsed] = useState(true);
  const [isBadgesCollapsed, setIsBadgesCollapsed] = useState(true);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isStepsCollapsed, setIsStepsCollapsed] = useState(true);
  const [chartMetric, setChartMetric] = useState<'weight' | 'bodyFat'>('weight');
  const [graphWeightUnit, setGraphWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [isWeightCollapsed, setIsWeightCollapsed] = useState(true);
  const [waterDisplayUnit, setWaterDisplayUnit] = useState<'imperial' | 'metric'>(() => {
    const saved = safeStorage.get('unlckd_water_unit_pref');
    if (saved === 'imperial' || saved === 'metric') return saved;
    return 'metric';
  });

  const handleSetWaterDisplayUnit = (unit: 'imperial' | 'metric') => {
    setWaterDisplayUnit(unit);
    safeStorage.set('unlckd_water_unit_pref', unit);
  };
  const [isSavingHydration, setIsSavingHydration] = useState(false);
  const [isSavingSteps, setIsSavingSteps] = useState(false);
  const [isSleepCollapsed, setIsSleepCollapsed] = useState(true);
  const [isRecoveryCollapsed, setIsRecoveryCollapsed] = useState(true);
  const [isSavingSleep, setIsSavingSleep] = useState(false);
  const [isMonthlyBadgeModalOpen, setIsMonthlyBadgeModalOpen] = useState(false);
  const [isAccomplishmentBadgesCollapsed, setIsAccomplishmentBadgesCollapsed] = useState(true);
  const [showAllAccomplishmentBadges, setShowAllAccomplishmentBadges] = useState(false);
  const activeMonthIdx = (parseLocalDate(selectedDate) || new Date()).getMonth();
  const [selectedModalMonthIdx, setSelectedModalMonthIdx] = useState<number>(activeMonthIdx);
  const [selectedAccomplishmentBadge, setSelectedAccomplishmentBadge] = useState<AccomplishmentBadgeDef | null>(null);
  const [badgeSyncToast, setBadgeSyncToast] = useState<string | null>(null);

  const handleSyncAccomplishmentBadge = async (badgeDef: AccomplishmentBadgeDef) => {
    if (!userProfile) return;
    const val = badgeDef.getProgressValue(reportLogs, log, userProfile, measurements);
    const unlockedTiers = badgeDef.tiers.filter(t => val >= t.targetValue);
    
    if (unlockedTiers.length === 0) {
      setBadgeSyncToast(`Keep pushing! Progress: ${val.toLocaleString()} / ${badgeDef.tiers[0].targetValue.toLocaleString()} ${badgeDef.unit}`);
      setTimeout(() => setBadgeSyncToast(null), 3500);
      return;
    }

    const existingBadges = userProfile.badges || [];
    const newBadges: UserBadge[] = [...existingBadges];
    let newlyUnlockedCount = 0;

    unlockedTiers.forEach(t => {
      const badgeId = `${badgeDef.id}-${t.tier.toLowerCase()}`;
      if (!newBadges.some(b => b.id === badgeId)) {
        newBadges.push({
          id: badgeId,
          name: `${badgeDef.name} (${t.tier})`,
          icon: badgeDef.id,
          description: t.reqDescription,
          unlockedAt: new Date().toISOString()
        });
        newlyUnlockedCount++;
      }
    });

    if (newlyUnlockedCount > 0) {
      await updateUserProfile(userProfile.userId, { badges: newBadges });
      if (onProfileUpdate) onProfileUpdate();
      setBadgeSyncToast(`🎉 Victory! Unlocked ${newlyUnlockedCount} new badge tier(s) for ${badgeDef.name}!`);
    } else {
      setBadgeSyncToast(`Badge tiers synced! Highest unlocked: ${unlockedTiers[unlockedTiers.length - 1].tier}`);
    }
    setTimeout(() => setBadgeSyncToast(null), 3500);
  };

  const handleSyncMonthlyBadge = async (targetGoalToSync: MonthlyGoal = MONTHLY_GOALS[selectedModalMonthIdx] || currentGoal) => {
    if (!userProfile) return;
    const existingBadges = userProfile.badges || [];
    if (existingBadges.some(b => b.id === targetGoalToSync.badgeId)) {
      setBadgeSyncToast(`Monthly Badge "${targetGoalToSync.badgeName}" is already in your profile!`);
      setTimeout(() => setBadgeSyncToast(null), 3000);
      return;
    }

    const newBadges: UserBadge[] = [
      ...existingBadges,
      {
        id: targetGoalToSync.badgeId,
        name: targetGoalToSync.badgeName,
        icon: 'monthly-badge',
        description: targetGoalToSync.rewardDetail,
        unlockedAt: new Date().toISOString()
      }
    ];

    await updateUserProfile(userProfile.userId, { badges: newBadges });
    if (onProfileUpdate) onProfileUpdate();
    setBadgeSyncToast(`🏆 Outstanding! The "${targetGoalToSync.badgeName}" Monthly Badge has been added to your profile!`);
    setTimeout(() => setBadgeSyncToast(null), 3500);
  };

  const handleSaveHydration = async () => {
    if (!log) return;
    setIsSavingHydration(true);
    try {
      await gymService.updateDailyLog(selectedDate, { 
        water: log.water, 
        waterUnit: log.waterUnit, 
        waterGoal: log.waterGoal 
      });
    } catch (e) {
      console.error("Save hydration error:", e);
    } finally {
      setTimeout(() => setIsSavingHydration(false), 1500);
    }
  };

  const handleSaveMovement = async () => {
    if (!log) return;
    setIsSavingSteps(true);
    try {
      await gymService.updateDailyLog(selectedDate, { 
        steps: log.steps, 
        stepGoal: log.stepGoal 
      });
    } catch (e) {
      console.error("Save movement error:", e);
    } finally {
      setTimeout(() => setIsSavingSteps(false), 1500);
    }
  };

  const handleSaveSleep = async () => {
    if (!log) return;
    setIsSavingSleep(true);
    try {
      await gymService.updateDailyLog(selectedDate, { 
        sleepHours: log.sleepHours, 
        sleepGoal: log.sleepGoal,
        sleepQuality: log.sleepQuality,
        sleepNotes: log.sleepNotes
      });
    } catch (e) {
      console.error("Save sleep error:", e);
    } finally {
      setTimeout(() => setIsSavingSleep(false), 1500);
    }
  };

  const updateSleepHours = (amount: number) => {
    if (!log) return;
    const current = Number(log.sleepHours) || 0;
    const newHours = Math.max(0, Math.min(24, Math.round((current + amount) * 10) / 10));
    setLog({ ...log, sleepHours: newHours });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number>(0);
  const [calendarDates, setCalendarDates] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'hub' | 'report' | 'recovery'>('hub');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProgressReportOpen, setIsProgressReportOpen] = useState(false);
  const [trackerOrder, setTrackerOrder] = useState<string[]>(['hydration', 'movement', 'sleep', 'recovery']);

  const handleUpdateRecoverySessions = async (sessions: RecoverySession[]) => {
    if (!log) return;
    const updated = { ...log, recoverySessions: sessions };
    setLog(updated);
    try {
      await gymService.updateDailyLog(selectedDate, { recoverySessions: sessions });
      setLastSaved(Date.now());
    } catch (e) {
      console.error("Save recovery sessions error:", e);
    }
  };

  const handleToggleQuickRecovery = async (modality: string, title: string) => {
    if (!log) return;
    const current = log.recoverySessions || [];
    const idx = current.findIndex(s => s.modality === modality || s.title === title);
    let updated: RecoverySession[];

    if (idx >= 0) {
      updated = [...current];
      const nextVal = !updated[idx].completed;
      updated[idx] = { ...updated[idx], completed: nextVal };
      if (nextVal) setTotalXP(prev => prev + 25);
    } else {
      updated = [
        ...current,
        {
          id: `rec-${Date.now()}`,
          modality: modality as any,
          title,
          durationMinutes: 20,
          completed: true,
          timestamp: new Date().toISOString()
        }
      ];
      setTotalXP(prev => prev + 25);
    }

    await handleUpdateRecoverySessions(updated);
  };

  const getLastPerformance = (exRaw: any) => {
    const parsed = parseExercise(exRaw);
    if (!parsed?.name || !reportLogs || reportLogs.length === 0) return null;
    const targetName = parsed.name.trim().toLowerCase();

    const sorted = [...reportLogs]
      .filter(l => l.date !== selectedDate && l.workoutData)
      .sort((a, b) => b.date.localeCompare(a.date));

    for (const prevLog of sorted) {
      if (!prevLog.workoutData) continue;
      for (const [key, wData] of Object.entries(prevLog.workoutData)) {
        const keyName = key.replace(/^(warmUp|mainWork)-/, '').replace(/-\d+$/, '').replace(/_/g, ' ').toLowerCase();
        if (keyName.includes(targetName) || targetName.includes(keyName) || key.toLowerCase().includes(targetName)) {
          if (wData.setRows && wData.setRows.length > 0) {
            const validSet = wData.setRows.slice().reverse().find(s => s.weight || s.reps);
            if (validSet) return { weight: validSet.weight, reps: validSet.reps, date: prevLog.date };
          }
          if (wData.weight || wData.reps) {
            return { weight: wData.weight, reps: wData.reps, date: prevLog.date };
          }
        }
      }
    }
    return null;
  };

  const parseStepGoal = (goalStr: string) => {
    if (!goalStr) return 10000;
    
    // Normalize string: lower case, handle 'k', remove commas
    const normalized = goalStr.toLowerCase()
      .replace(/(\d+[,.]\d+)k/g, (_, p1) => String(parseFloat(p1.replace(',', '.')) * 1000))
      .replace(/(\d+)k/g, (_, p1) => String(parseInt(p1) * 1000))
      .replace(/,/g, '');
    
    const matches = normalized.match(/\d+(\.\d+)?/g);
    if (!matches) return 10000;
    
    const numbers = matches.map(m => parseFloat(m));
    let value = Math.max(...numbers);

    // Sanity checks
    if (value < 50) return value * 1000; // Case: "10" meaning 10k
    if (value < 3000) return 10000;      // Case: too low, default to 10k
    if (value > 50000) return 10000;     // Case: too high
    
    return Math.round(value);
  };

  const parseSleepGoal = (goalStr?: string) => {
    if (!goalStr) return 8;
    const match = goalStr.match(/(\d+(\.\d+)?)/);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (parsed >= 4 && parsed <= 12) return parsed;
    }
    return 8;
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTrackerOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  const [isEditingHabits, setIsEditingHabits] = useState(false);
  const [editingHabits, setEditingHabits] = useState<string[]>([]);
  const [reportLogs, setReportLogs] = useState<DailyLog[]>([]);
  const [reportDate, setReportDate] = useState(new Date()); // Used for consistency report month/year
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [measurementUnits, setMeasurementUnits] = useState({
    weight: 'kg' as 'kg' | 'lbs',
    length: 'cm' as 'cm' | 'in'
  });
  const [newMeasurement, setNewMeasurement] = useState<Partial<Measurement>>({
    weight: 0,
    bodyFat: 0,
    waist: 0,
    chest: 0,
    leftArm: 0,
    rightArm: 0,
    leftThigh: 0,
    rightThigh: 0,
    leftCalf: 0,
    rightCalf: 0,
    neck: 0
  });


  const ensureDateInCalendar = (dateStr: string) => {
    if (!dateStr) return;
    setCalendarDates(prev => {
      if (prev.includes(dateStr)) return prev;
      const combined = [...new Set([...prev, dateStr])].sort((a, b) => a.localeCompare(b));
      return combined;
    });
  };

  const handlePrevDay = async () => {
    await flushChanges();
    const current = parseLocalDate(selectedDate);
    current.setDate(current.getDate() - 1);
    const prevIso = getLocalDateString(current);
    ensureDateInCalendar(prevIso);
    setSelectedDate(prevIso);
  };

  const handleNextDay = async () => {
    await flushChanges();
    const current = parseLocalDate(selectedDate);
    current.setDate(current.getDate() + 1);
    const nextIso = getLocalDateString(current);
    ensureDateInCalendar(nextIso);
    setSelectedDate(nextIso);
  };

  const handleJumpToToday = async () => {
    await flushChanges();
    ensureDateInCalendar(today);
    setSelectedDate(today);
  };

  useEffect(() => {
    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);

    // Date bar starts on current date (or selectedDate if selectedDate is earlier)
    let minD = new Date(todayD);
    if (selectedDate) {
      const selD = parseLocalDate(selectedDate);
      selD.setHours(0, 0, 0, 0);
      if (selD < minD) {
        minD = selD;
      }
    }

    // Generate 90 days of calendar dates starting from minD (today or selected date)
    const totalDays = 90;
    const dates = Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(minD);
      d.setDate(d.getDate() + i);
      return getLocalDateString(d);
    });

    if (selectedDate && !dates.includes(selectedDate)) {
      dates.push(selectedDate);
      dates.sort((a, b) => a.localeCompare(b));
    }

    setCalendarDates(dates);
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && calendarDates.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`date-btn-${selectedDate}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedDate, calendarDates]);

  const motivationalMessages: Record<number, string> = {
    0: "The only bad workout is the one that didn't happen. Let's go!",
    1: "Small progress is still progress. Keep moving forward.",
    2: "Success usually comes to those who are too busy to be looking for it.",
    3: "Your only limit is you. Challenge yourself today.",
    4: "Motivation is what gets you started. Habit is what keeps you going.",
    5: "Don't stop when you're tired. Stop when you're done.",
    6: "Strength does not come from winning. Your struggles develop your strengths.",
  };

  const importMealsFromPlan = async () => {
    if (!latestReport || !log) return;
    const mealDay = getMealsForSelectedDate();
    if (!mealDay) return;

    const importedMeals: DailyLog['meals'] = [
      { 
        name: mealDay.breakfast, 
        type: 'breakfast', 
        completed: false, 
        url: mealDay.breakfastUrl, 
        calories: mealDay.breakfastMacros?.calories,
        protein: mealDay.breakfastMacros?.protein,
        fat: mealDay.breakfastMacros?.fat,
        carbs: mealDay.breakfastMacros?.carbs
      },
      { 
        name: mealDay.lunch, 
        type: 'lunch', 
        completed: false, 
        url: mealDay.lunchUrl, 
        calories: mealDay.lunchMacros?.calories,
        protein: mealDay.lunchMacros?.protein,
        fat: mealDay.lunchMacros?.fat,
        carbs: mealDay.lunchMacros?.carbs
      },
      { 
        name: mealDay.dinner, 
        type: 'dinner', 
        completed: false, 
        url: mealDay.dinnerUrl, 
        calories: mealDay.dinnerMacros?.calories,
        protein: mealDay.dinnerMacros?.protein,
        fat: mealDay.dinnerMacros?.fat,
        carbs: mealDay.dinnerMacros?.carbs
      },
      { 
        name: mealDay.snack, 
        type: 'snack', 
        completed: false, 
        url: mealDay.snackUrl, 
        calories: mealDay.snackMacros?.calories,
        protein: mealDay.snackMacros?.protein,
        fat: mealDay.snackMacros?.fat,
        carbs: mealDay.snackMacros?.carbs
      }
    ];

    const updatedLog = { ...log, meals: importedMeals };
    setLog(updatedLog);
    await gymService.updateDailyLog(selectedDate, { meals: importedMeals });
  };

  const dayOfWeek = parseLocalDate(selectedDate).getDay();
  const getNutritionTotals = () => {
    if (!log?.meals) return { calories: 0, protein: 0, fat: 0, carbs: 0 };
    return log.meals.reduce((acc, meal) => ({
      calories: acc.calories + (parseInt(meal.calories?.toString() || '0') || 0),
      protein: acc.protein + (parseInt(meal.protein?.toString() || '0') || 0),
      fat: acc.fat + (parseInt(meal.fat?.toString() || '0') || 0),
      carbs: acc.carbs + (parseInt(meal.carbs?.toString() || '0') || 0),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });
  };

  const getTrainingTotals = (overrideData?: any) => {
    const workout = getWorkoutForSelectedDate() as any;
    if (!workout) return { completed: 0, total: 0 };
    
    const warmUp = Array.isArray(workout.warmUp) ? workout.warmUp : (workout.warmUp || workout.warmUpSequence || '').split(/,|\n/).filter((l: string) => l.trim());
    const mainWork = Array.isArray(workout.mainWork) ? workout.mainWork : (workout.mainWork || workout.mainWorkout || '').split('\n').filter((l: string) => l.trim());
    
    const total = warmUp.length + mainWork.length;
    let completed = 0;
    const data = overrideData || log?.workoutData || {};

    warmUp.forEach((_, i) => {
      if (data[`warmup-${i}`]?.completed) completed++;
    });
    mainWork.forEach((_, i) => {
      if (data[`main-${i}`]?.completed) completed++;
    });

    return { completed, total };
  };

  const dailyMessage = motivationalMessages[dayOfWeek] || "Consistency is the key to transformation.";

  const currentWeekIndex = latestReport ? (() => {
    const baseStartDate = latestReport?.userData?.planStartDate 
      ? parseLocalDate(latestReport.userData.planStartDate)
      : (latestReport?.timestamp?.toDate ? latestReport.timestamp.toDate() : (latestReport?.timestamp ? new Date(latestReport.timestamp) : new Date()));
    
    const startD = new Date(baseStartDate);
    startD.setHours(0, 0, 0, 0);

    const targetDate = parseLocalDate(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - startD.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(Math.floor(diffDays / 7), numWeeks - 1));
  })() : 0;

  const currentWeekNumber = currentWeekIndex + 1;

  // Helper to find the best matching day in the workout plan
  const getWorkoutForSelectedDate = () => {
    const isManual = log?.useManualWorkout || !latestReport;

    // Priority 1: Manual workout data in the log if in manual mode
    if (isManual && log?.manualWorkout) {
      return {
        day: 'Manual Entry',
        focus: log.manualWorkout.focus || 'Custom Session',
        warmUp: log.manualWorkout.warmUp || '',
        mainWork: log.manualWorkout.mainWork || '',
        notes: ''
      };
    }

    if (!latestReport?.report.workoutPlan) {
      // Return empty structure for manual entry if no report
      return {
        day: 'Manual Entry',
        focus: 'Custom Session',
        warmUp: '',
        mainWork: '',
        notes: ''
      };
    }
    
    const weekData = latestReport.report.workoutPlan[currentWeekIndex] || latestReport.report.workoutPlan[0];
    if (!weekData?.days) return null;
    
    const planDays = weekData.days;
    const baseStartDate = latestReport?.userData?.planStartDate 
      ? parseLocalDate(latestReport.userData.planStartDate)
      : (latestReport?.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date());
    const startD = new Date(baseStartDate);
    startD.setHours(0, 0, 0, 0);
    const targetDate = parseLocalDate(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - startD.getTime();
    const diffDaysTotal = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const dayOfPlan = diffDaysTotal % 7;

    return planDays[dayOfPlan % planDays.length];
  };

  const getMealsForSelectedDate = () => {
    if (!latestReport?.report.mealPlan) return null;
    
    const weekData = latestReport.report.mealPlan[currentWeekIndex] || latestReport.report.mealPlan[0];
    if (!weekData?.days) return null;
    
    const planDays = weekData.days;
    const baseStartDate = latestReport?.userData?.planStartDate 
      ? parseLocalDate(latestReport.userData.planStartDate)
      : (latestReport?.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date());
    const startD = new Date(baseStartDate);
    startD.setHours(0, 0, 0, 0);
    const targetDate = parseLocalDate(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - startD.getTime();
    const diffDaysTotal = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const dayOfPlan = diffDaysTotal % 7;

    return planDays[dayOfPlan % planDays.length];
  };

  const getRecoveryForSelectedDate = () => {
    if (!latestReport?.report?.recoverySchedule || latestReport.report.recoverySchedule.length === 0) return null;
    
    const baseStartDate = latestReport?.userData?.planStartDate 
      ? parseLocalDate(latestReport.userData.planStartDate)
      : (latestReport?.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date());
    const startD = new Date(baseStartDate);
    startD.setHours(0, 0, 0, 0);
    const targetDate = parseLocalDate(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - startD.getTime();
    const diffDaysTotal = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const dayOfPlan = ((diffDaysTotal % 7) + 7) % 7;

    return latestReport.report.recoverySchedule[dayOfPlan % latestReport.report.recoverySchedule.length] || null;
  };

  const importWorkoutFromPlan = async () => {
    if (!latestReport || !log) return;
    const workout = getWorkoutForSelectedDate() as any;
    if (!workout || workout.day === 'Manual Entry') return;

    const warmUpStr = Array.isArray(workout.warmUp) 
      ? workout.warmUp.map((ex: any) => typeof ex === 'string' ? ex : ex.name).join('\n')
      : (workout.warmUp || '');
      
    const mainWorkStr = Array.isArray(workout.mainWork)
      ? workout.mainWork.map((ex: any) => typeof ex === 'string' ? ex : `${ex.name} ${ex.sets ? `[${ex.sets}x${ex.reps}]` : ''}`).join('\n')
      : (workout.mainWork || '');

    const updatedManual = {
      focus: workout.focus || '',
      warmUp: warmUpStr,
      mainWork: mainWorkStr
    };
    const updatedLog = { ...log, manualWorkout: updatedManual, useManualWorkout: true };
    setLog(updatedLog);
    await gymService.updateDailyLog(selectedDate, { manualWorkout: updatedManual, useManualWorkout: true });
  };

  const handleImportAllReports = async () => {
    const conflicts = checkReportOverlaps(savedReports || []);
    if (conflicts.length > 0) {
      const conflictLines = conflicts.map(c => 
        `• "${c.report1.userData?.name || 'Report 1'}" (${c.range1.startISO} to ${c.range1.endISO}) overlaps with "${c.report2.userData?.name || 'Report 2'}" (${c.range2.startISO} to ${c.range2.endISO}) by ${c.overlapDays} days.`
      ).join('\n');
      alert(`⚠️ OVERLAPPING TRANSFORMATION REPORTS DETECTED\n\nNo overlapping days are allowed between full transformation reports to prevent conflicting information.\n\nConflicting Reports:\n${conflictLines}\n\nPlease delete one of the conflicting reports in your Saved Reports history before importing.`);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await gymService.importAllReportsToHub(savedReports);
      await loadData(selectedDate);
      alert(`Successfully imported all transformation reports into Gym Hub!\nUpdated ${result.logsUpdated} daily logs and ${result.measurementsAdded} body weight / measurement records.`);
      if (onReportSaved) onReportSaved();
    } catch (e: any) {
      console.error("Import failed", e);
      alert(e.message || "Failed to import report data. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAllFutureDays = async () => {
    if (!latestReport || !latestReport.userData?.planStartDate) return;
    
    const conflicts = checkReportOverlaps(savedReports || []);
    if (conflicts.length > 0) {
      const conflictLines = conflicts.map(c => 
        `• "${c.report1.userData?.name || 'Report 1'}" (${c.range1.startISO} to ${c.range1.endISO}) overlaps with "${c.report2.userData?.name || 'Report 2'}" (${c.range2.startISO} to ${c.range2.endISO}) by ${c.overlapDays} days.`
      ).join('\n');
      alert(`⚠️ OVERLAPPING TRANSFORMATION REPORTS DETECTED\n\nNo overlapping days are allowed between full transformation reports to prevent conflicting information.\n\nConflicting Reports:\n${conflictLines}\n\nPlease delete one of the conflicting reports in your Saved Reports history before syncing.`);
      return;
    }

    const confirm = window.confirm("This will overwrite all training and meal logs from your plan start date onwards with the latest prescribed plan. Existing data from that date will be deleted. Continue?");
    if (!confirm) return;

    setIsSyncing(true);
    try {
      await gymService.syncPlanToHub(latestReport);
      
      // Refresh current log
      await loadData(selectedDate);
      alert("Successfully synced Gym Hub with the latest plan starting from " + latestReport.userData.planStartDate);
    } catch (e: any) {
      console.error("Sync failed", e);
      alert(e.message || "Sync failed. Some days may not have updated.");
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleManualMode = () => {
    if (!log) return;
    const updatedLog = { ...log, useManualWorkout: !log.useManualWorkout };
    setLog(updatedLog);
    gymService.updateDailyLog(selectedDate, updatedLog);
  };

  const toggleManualNutritionMode = async () => {
    if (!log) return;
    const newManualState = !log.useManualNutrition;
    const updatedLog = { ...log, useManualNutrition: newManualState };
    if (!newManualState) {
      const mealDay = getMealsForSelectedDate();
      if (mealDay) {
        updatedLog.meals = [
          { name: mealDay.breakfast, type: 'breakfast', completed: false, url: mealDay.breakfastUrl, calories: mealDay.breakfastMacros?.calories, protein: mealDay.breakfastMacros?.protein, fat: mealDay.breakfastMacros?.fat, carbs: mealDay.breakfastMacros?.carbs },
          { name: mealDay.lunch, type: 'lunch', completed: false, url: mealDay.lunchUrl, calories: mealDay.lunchMacros?.calories, protein: mealDay.lunchMacros?.protein, fat: mealDay.lunchMacros?.fat, carbs: mealDay.lunchMacros?.carbs },
          { name: mealDay.dinner, type: 'dinner', completed: false, url: mealDay.dinnerUrl, calories: mealDay.dinnerMacros?.calories, protein: mealDay.dinnerMacros?.protein, fat: mealDay.dinnerMacros?.fat, carbs: mealDay.dinnerMacros?.carbs },
          { name: mealDay.snack, type: 'snack', completed: false, url: mealDay.snackUrl, calories: mealDay.snackMacros?.calories, protein: mealDay.snackMacros?.protein, fat: mealDay.snackMacros?.fat, carbs: mealDay.snackMacros?.carbs }
        ];
      }
    }
    setLog(updatedLog);
    await gymService.updateDailyLog(selectedDate, updatedLog);
  };

  const getSectionExerciseList = (section: 'warmUp' | 'mainWork'): string[] => {
    if (log?.manualWorkout && log.manualWorkout[section] !== undefined) {
      const raw = log.manualWorkout[section] || '';
      return raw ? raw.split('\n') : [];
    }
    const rawSec = workoutDay?.[section];
    if (Array.isArray(rawSec)) {
      return rawSec.map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const name = item.name || 'Exercise';
          const sets = item.sets ? `${item.sets} sets x ` : '';
          const reps = item.reps ? `${item.reps} reps` : '';
          return `${name} ${sets}${reps}`.trim();
        }
        return String(item);
      });
    }
    if (typeof rawSec === 'string') {
      return rawSec.split('\n').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const updateManualWorkout = (field: 'warmUp' | 'mainWork' | 'focus', value: string) => {
    const currentWarmUpList = getSectionExerciseList('warmUp');
    const currentMainWorkList = getSectionExerciseList('mainWork');

    const defaultLog: DailyLog = {
      id: selectedDate,
      date: selectedDate,
      steps: 0,
      stepGoal: 10000,
      water: 0,
      waterGoal: 2500,
      waterUnit: 'ml',
      sleepHours: 0,
      sleepGoal: 8,
      completedWorkouts: 0,
      useManualWorkout: true,
      manualWorkout: {
        warmUp: currentWarmUpList.join('\n'),
        mainWork: currentMainWorkList.join('\n'),
        focus: workoutDay?.focus || 'Custom Session'
      }
    };

    const activeLog = log || defaultLog;

    const updatedManual = {
      warmUp: currentWarmUpList.join('\n'),
      mainWork: currentMainWorkList.join('\n'),
      focus: workoutDay?.focus || 'Custom Session',
      ...(activeLog.manualWorkout || {}),
      [field]: value
    };

    const updatedLog: DailyLog = {
      ...activeLog,
      useManualWorkout: true,
      manualWorkout: updatedManual
    };

    setLog(updatedLog);
    gymService.updateDailyLog(selectedDate, updatedLog);
  };

  const addManualExercise = (section: 'warmUp' | 'mainWork') => {
    const list = getSectionExerciseList(section);
    list.push('New Exercise');
    updateManualWorkout(section, list.join('\n'));
  };

  const updateManualExerciseName = (section: 'warmUp' | 'mainWork', index: number, newName: string) => {
    const list = getSectionExerciseList(section);
    if (index >= 0 && index < list.length) {
      list[index] = newName;
      updateManualWorkout(section, list.join('\n'));
    }
  };

  const removeManualExercise = (section: 'warmUp' | 'mainWork', index: number) => {
    const list = getSectionExerciseList(section);
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      updateManualWorkout(section, list.join('\n'));
    }
  };

  const updateMealMacro = (index: number, field: 'calories' | 'protein' | 'fat' | 'carbs' | 'name', value: string) => {
    if (!log || !log.meals) return;
    const updatedMeals = [...log.meals];
    updatedMeals[index] = { ...updatedMeals[index], [field]: value };
    const updatedLog = { ...log, meals: updatedMeals };
    setLog(updatedLog);
  };

  const toggleMealCompletion = (index: number) => {
    if (!log || !log.meals) return;
    const updatedMeals = [...log.meals];
    updatedMeals[index] = { ...updatedMeals[index], completed: !updatedMeals[index].completed };
    const updatedLog = { ...log, meals: updatedMeals };
    setLog(updatedLog);
  };

  const handleAddManualMeal = () => {
    if (!log) return;
    const currentMeals = log.meals || [];
    const newMeal = { name: 'New Meal', type: 'snack' as any, completed: false };
    const updatedMeals = [...currentMeals, newMeal];
    const updatedLog = { ...log, meals: updatedMeals, useManualWorkout: true };
    setLog(updatedLog);
  };

  const handleRemoveMeal = (index: number) => {
    if (!log || !log.meals) return;
    const updatedMeals = log.meals.filter((_, i) => i !== index);
    const updatedLog = { ...log, meals: updatedMeals };
    setLog(updatedLog);
  };

  const workoutDay = getWorkoutForSelectedDate();
  const mealDay = getMealsForSelectedDate();
  const evaluatedFocus = assessWorkoutFocus(
    log?.useManualWorkout ? log?.manualWorkout?.mainWork : (workoutDay?.mainWork || log?.manualWorkout?.mainWork),
    workoutDay?.focus
  );

  const getWeekDaysAdherence = () => {
    const current = parseLocalDate(selectedDate);
    const dayOfWeek = current.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(current);
    monday.setDate(monday.getDate() + mondayOffset);

    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayLetter, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const iso = getLocalDateString(d);
      
      const matchLog = iso === selectedDate ? log : reportLogs.find(l => l.date === iso);
      const isCompleted = Boolean(
        matchLog && (
          (matchLog.completedWorkouts || 0) > 0 ||
          (matchLog.steps && matchLog.steps >= (matchLog.stepGoal || 8000)) ||
          (matchLog.workoutData && Object.values(matchLog.workoutData).some((ex: any) => (ex as any)?.completed)) ||
          (matchLog.meals && matchLog.meals.some((m: any) => m?.completed))
        )
      );
      const isToday = iso === today;
      const isSelected = iso === selectedDate;
      
      return {
        dayLetter,
        dateISO: iso,
        dateNum: d.getDate(),
        isCompleted,
        isToday,
        isSelected
      };
    });

    const completedCount = days.filter(d => d.isCompleted).length;
    return { days, completedCount };
  };

  // Helper to parse exercise name, sets, and reps
  const parseExercise = (rawEx: any) => {
    if (rawEx && typeof rawEx === 'object') {
      const cleanName = String(rawEx.name || '')
        .replace(/https?:\/\/[^\s\)]+/gi, '')
        .replace(/[\[\]\(\)]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const finalName = cleanName || rawEx.name || 'Exercise';
      return {
        name: finalName,
        sets: rawEx.sets || '',
        reps: rawEx.reps || '',
        url: getSearchUrl(finalName, 'Workouts')
      };
    }
    
    const rawText = String(rawEx || '').trim().replace(/^[-*•]\s*/, '');
    
    // Extract & remove URL strings completely so raw links are never shown
    const urlRegex = /(https?:\/\/[^\s\)]+)/gi;
    const textWithoutUrl = rawText
      .replace(urlRegex, '')
      .replace(/\(\s*\)/g, '')
      .replace(/[\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract sets/reps: looking for patterns like (3x10), 3 sets of 10, 3x10-12
    const setsRepsRegex = /(\d+)\s*(?:sets?\s*(?:of|x|—|\*|-)\s*)(\d+(?:-\d+)?)|(?:(\d+)\s*x\s*(\d+(?:-\d+)?))/i;
    const setsRepsMatch = textWithoutUrl.match(setsRepsRegex);
    
    let sets = '3';
    let reps = '10-12';
    let cleanName = textWithoutUrl;

    if (setsRepsMatch) {
      sets = setsRepsMatch[1] || setsRepsMatch[3];
      reps = setsRepsMatch[2] || setsRepsMatch[4];
      cleanName = textWithoutUrl.replace(setsRepsMatch[0], '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
    } else {
      cleanName = textWithoutUrl.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
    }

    const finalName = cleanName || 'Exercise';

    return {
      name: finalName,
      sets,
      reps,
      url: getSearchUrl(finalName, 'Workouts')
    };
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [latestReport, selectedDate]);

  // Use a debounced effect for global stats to avoid heavy reads on every minor change
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshGlobalStats();
    }, 1000);
    return () => clearTimeout(timer);
  }, [latestReport, userProfile?.userId]);

  const handleTrainingUpdate = (exerciseId: string, field: 'weight' | 'sets' | 'reps' | 'notes' | 'time' | 'completed', value: string | boolean) => {
    if (!log) return;
    const currentData = log.workoutData || {};
    const exerciseData = currentData[exerciseId] || { weight: '', sets: '', reps: '', notes: '', time: '', completed: false };
    
    const updatedWorkoutData = {
      ...currentData,
      [exerciseId]: {
        ...exerciseData,
        [field]: value
      }
    };
    
    const isManual = log.useManualWorkout || !latestReport;
    const { completed, total } = getTrainingTotals(updatedWorkoutData);
    
    let completedWorkouts = 0;
    if (isManual) {
      completedWorkouts = completed > 0 ? 1 : 0;
    } else {
      completedWorkouts = (total > 0 && completed === total) ? 1 : 0;
    }
    
    const newLog = { ...log, workoutData: updatedWorkoutData, completedWorkouts };
    setLog(newLog);
    // Removed immediate service call to let the auto-save useEffect handle it with debounce
  };

  const handleSetRowUpdate = (exerciseId: string, setIndex: number, field: 'reps' | 'weight' | 'completed', val: string | boolean, defaultReps: string, defaultSets?: string) => {
    if (!log) return;
    const currentData = log.workoutData || {};
    const exerciseData = currentData[exerciseId] || {};
    const setsCount = parseInt(exerciseData?.sets || defaultSets || '3') || 3;

    const existingRows: Array<{ reps: string; weight: string; completed?: boolean }> = Array.isArray(exerciseData?.setRows)
      ? [...exerciseData.setRows]
      : Array.from({ length: Math.max(1, setsCount) }, () => ({
          reps: exerciseData?.reps || defaultReps || '',
          weight: exerciseData?.weight || '',
          completed: exerciseData?.completed || false
        }));

    while (existingRows.length <= setIndex) {
      existingRows.push({ reps: defaultReps || '', weight: '', completed: false });
    }

    existingRows[setIndex] = {
      ...existingRows[setIndex],
      [field]: val
    };

    const allSetsCompleted = existingRows.length > 0 && existingRows.every(sr => !!sr.completed);

    const updatedWorkoutData = {
      ...currentData,
      [exerciseId]: {
        ...exerciseData,
        completed: allSetsCompleted,
        setRows: existingRows,
        reps: existingRows[0]?.reps || exerciseData?.reps || '',
        weight: existingRows[0]?.weight || exerciseData?.weight || '',
        sets: String(existingRows.length)
      }
    };

    const { completed, total } = getTrainingTotals(updatedWorkoutData);
    const isManual = log.useManualWorkout || !latestReport;
    const completedWorkouts = isManual ? (completed > 0 ? 1 : 0) : ((total > 0 && completed === total) ? 1 : 0);

    setLog({ ...log, workoutData: updatedWorkoutData, completedWorkouts });
  };

  const handleAddSetRow = (exerciseId: string, defaultReps: string, defaultSets?: string) => {
    if (!log) return;
    const currentData = log.workoutData || {};
    const exerciseData = currentData[exerciseId] || {};
    const setsCount = parseInt(exerciseData?.sets || defaultSets || '3') || 3;

    const existingRows: Array<{ reps: string; weight: string; completed?: boolean }> = Array.isArray(exerciseData?.setRows)
      ? [...exerciseData.setRows]
      : Array.from({ length: Math.max(1, setsCount) }, () => ({
          reps: exerciseData?.reps || defaultReps || '',
          weight: exerciseData?.weight || '',
          completed: exerciseData?.completed || false
        }));

    const lastRow = existingRows[existingRows.length - 1] || { reps: defaultReps || '', weight: '', completed: false };
    const updatedRows = [...existingRows, { reps: lastRow.reps || defaultReps || '', weight: lastRow.weight || '', completed: false }];

    const allSetsCompleted = updatedRows.length > 0 && updatedRows.every(sr => !!sr.completed);

    const updatedWorkoutData = {
      ...currentData,
      [exerciseId]: {
        ...exerciseData,
        completed: allSetsCompleted,
        setRows: updatedRows,
        sets: String(updatedRows.length)
      }
    };

    const { completed, total } = getTrainingTotals(updatedWorkoutData);
    const isManual = log.useManualWorkout || !latestReport;
    const completedWorkouts = isManual ? (completed > 0 ? 1 : 0) : ((total > 0 && completed === total) ? 1 : 0);

    setLog({ ...log, workoutData: updatedWorkoutData, completedWorkouts });
  };

  const handleRemoveSetRow = (exerciseId: string, setIndex: number, defaultReps: string, defaultSets?: string) => {
    if (!log) return;
    const currentData = log.workoutData || {};
    const exerciseData = currentData[exerciseId] || {};
    const setsCount = parseInt(exerciseData?.sets || defaultSets || '3') || 3;

    const existingRows: Array<{ reps: string; weight: string; completed?: boolean }> = Array.isArray(exerciseData?.setRows)
      ? [...exerciseData.setRows]
      : Array.from({ length: Math.max(1, setsCount) }, () => ({
          reps: exerciseData?.reps || defaultReps || '',
          weight: exerciseData?.weight || '',
          completed: exerciseData?.completed || false
        }));

    if (existingRows.length > 1) {
      existingRows.splice(setIndex, 1);
    } else {
      existingRows[0] = { reps: '', weight: '', completed: false };
    }

    const allSetsCompleted = existingRows.length > 0 && existingRows.every(sr => !!sr.completed);

    const updatedWorkoutData = {
      ...currentData,
      [exerciseId]: {
        ...exerciseData,
        completed: allSetsCompleted,
        setRows: existingRows,
        reps: existingRows[0]?.reps || exerciseData?.reps || '',
        weight: existingRows[0]?.weight || exerciseData?.weight || '',
        sets: String(existingRows.length)
      }
    };

    const { completed, total } = getTrainingTotals(updatedWorkoutData);
    const isManual = log.useManualWorkout || !latestReport;
    const completedWorkouts = isManual ? (completed > 0 ? 1 : 0) : ((total > 0 && completed === total) ? 1 : 0);

    setLog({ ...log, workoutData: updatedWorkoutData, completedWorkouts });
  };

  const refreshGlobalStats = async () => {
    if (!userProfile?.userId) return;

    // Use a timestamp to prevent redundant fetches within a short window
    const lastFetch = (window as any)._lastStatsFetch || 0;
    if (Date.now() - lastFetch < 5000) { // 5 second cool-down
       return;
    }
    (window as any)._lastStatsFetch = Date.now();

    // Reduce measurement fetch depth
    const allM = await gymService.getLatestMeasurements(30);
    setMeasurements(allM);

    // Calculate streak and XP from available logs
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); 
    
    const logs = await gymService.getLogsInRange(getLocalDateString(startDate), getLocalDateString(now));
    
    const reportStepGoal = latestReport ? parseStepGoal(latestReport.report.stepGoals) : 10000;
    
    // XP Calculation
    let calculatedTotalXP = 0;
    logs.forEach(l => {
      let sGoal = Number(l.stepGoal) || reportStepGoal;
      if (sGoal > 50000) sGoal = reportStepGoal;
      
      const stepProg = Math.min((Number(l.steps) || 0) / sGoal, 1);
      const waterProg = Math.min((Number(l.water) || 0) / (Number(l.waterGoal) || 3000), 1);
      
      let dayXp = 0;
      dayXp += stepProg * 500;
      dayXp += waterProg * 300;
      dayXp += (Number(l.completedWorkouts) || 0) * 1000;
      
      const workoutData = l.workoutData || {};
      const completedExCount = Object.values(workoutData).filter(ex => (ex as any).completed).length;
      dayXp += completedExCount * 50;

      const completedMeals = (l.meals || []).filter(m => m.completed).length;
      dayXp += completedMeals * 100;
      const completedHabits = (l.habits ? Object.values(l.habits).filter(h => h).length : 0);
      dayXp += completedHabits * 200;

      if (l.weight) dayXp += 250;
      
      calculatedTotalXP += Math.round(dayXp);
    });
    
    setTotalXP(calculatedTotalXP);
    
    // Streak Calculation (Consecutive Workout Days)
    const combinedLogs = [...logs];
    if (log && selectedDate) {
      const existingIdx = combinedLogs.findIndex(l => l.date === selectedDate);
      if (existingIdx >= 0) {
        combinedLogs[existingIdx] = log;
      } else {
        combinedLogs.push(log);
      }
    }

    let streak = 0;
    
    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const activeDays = Array.from(new Set(
      combinedLogs.filter(l => {
        const hasWorkout = (Number(l.completedWorkouts) || 0) > 0 ||
          (l.workoutData && Object.values(l.workoutData).some((ex: any) => ex?.completed || (ex?.setRows && ex.setRows.some((sr: any) => sr?.completed)))) ||
          (l as any).completed === true;
        return hasWorkout;
      }).map(l => l.date)
    )).sort((a, b) => b.localeCompare(a));

    if (activeDays.length > 0) {
      const latestActiveDate = activeDays[0];
      
      if (latestActiveDate === todayStr || latestActiveDate === yesterdayStr) {
        streak = 1;
        for (let i = 1; i < activeDays.length; i++) {
          const d1 = new Date(activeDays[i-1] + 'T12:00:00');
          const d2 = new Date(activeDays[i] + 'T12:00:00');
          const diffDays = Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }
    
    setCurrentStreak(streak);

    // Only update profile if data actually changed significantly
    if (Math.abs(calculatedTotalXP - (userProfile.xp || 0)) > 5 || streak !== userProfile.streak) {
      updateProfileXPAndStreak(calculatedTotalXP, streak);
    }
  };

  const updateProfileXPAndStreak = async (xp: number, streak: number) => {
    if (userProfile?.userId) {
      await updateUserProfile(userProfile.userId, { xp, streak });
      if (onProfileUpdate) onProfileUpdate();
    }
  };

  const handleExerciseToggle = (exerciseId: string, defaultReps?: string, defaultSets?: string) => {
    if (!log) return;
    const currentData = log.workoutData || {};
    const exerciseData = currentData[exerciseId] || { weight: '', sets: '', reps: '', notes: '', time: '', completed: false };
    
    const setsCount = parseInt(exerciseData?.sets || defaultSets || '3') || 3;
    const existingRows: Array<{ reps: string; weight: string; completed?: boolean }> = Array.isArray(exerciseData?.setRows)
      ? [...exerciseData.setRows]
      : Array.from({ length: Math.max(1, setsCount) }, () => ({
          reps: exerciseData?.reps || defaultReps || '',
          weight: exerciseData?.weight || '',
          completed: exerciseData?.completed || false
        }));

    const currentlyCompleted = exerciseData.completed || (existingRows.length > 0 && existingRows.every(sr => !!sr.completed));
    const nextCompleted = !currentlyCompleted;

    const updatedRows = existingRows.map(sr => ({
      ...sr,
      completed: nextCompleted
    }));

    const updatedWorkoutData = {
      ...currentData,
      [exerciseId]: {
        ...exerciseData,
        completed: nextCompleted,
        setRows: updatedRows,
        sets: String(updatedRows.length),
        reps: updatedRows[0]?.reps || exerciseData?.reps || defaultReps || '',
        weight: updatedRows[0]?.weight || exerciseData?.weight || ''
      }
    };

    const { completed, total } = getTrainingTotals(updatedWorkoutData);
    const isManual = log.useManualWorkout || !latestReport;
    const completedWorkouts = isManual ? (completed > 0 ? 1 : 0) : ((total > 0 && completed === total) ? 1 : 0);

    setLog({ ...log, workoutData: updatedWorkoutData, completedWorkouts });
  };

  const handleGeneralNotesUpdate = (notes: string) => {
    if (!log) return;
    setLog({ ...log, generalNotes: notes });
    // Removed immediate service call to let the auto-save useEffect handle it with debounce
  };

  // Data Integrity: Flush changes before switching dates or on unload
  const flushChanges = async () => {
    if (!log || !selectedDate) return;
    
    const currentData = JSON.stringify(log);
    const win = window as any;
    if (win._lastSavedData === currentData) return;

    setIsSaving(true);
    try {
      await gymService.updateDailyLog(selectedDate, log);
      win._lastSavedData = currentData;
      setLastSaved(Date.now());
      // Refresh stats to ensure streaks/XP are updated
      refreshGlobalStats();
    } catch (error) {
      console.error("Flush save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // We can't await here reliably in all browsers, but we try a sync-ish update if possible
      // or just trust the last auto-save. For best integrity, we should have already flushed on navigation.
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [log, selectedDate]);

  // Auto-save log data with debounce to prevent quota issues from frequent updates
  useEffect(() => {
    if (!log || loading) return;
    
    // We want to save EVERYTHING in the log object now to ensure "saved upon entry"
    const timer = setTimeout(async () => {
      const lastData = (window as any)._lastSavedData;
      const currentData = JSON.stringify(log);

      if (lastData === currentData) return;

      setIsSaving(true);
      try {
        await gymService.updateDailyLog(selectedDate, log);
        (window as any)._lastSavedData = currentData;
        setLastSaved(Date.now());
        // Trigger streak refresh whenever data is saved to ensure "renewed streaks"
        refreshGlobalStats();
      } catch (e) {
        console.error("Auto-save failed", e);
      } finally {
        setIsSaving(false);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [log, selectedDate]);

  // Cleanup Macro Chef badge from user profile
  useEffect(() => {
    if (!userProfile || !userProfile.userId) return;
    const hasMacroChefInBadges = userProfile.badges?.some(
      b => b.id.toLowerCase().includes('macro-chef') || b.id.toLowerCase().includes('macro chef') || b.name.toLowerCase().includes('macro chef')
    );
    const isAlreadyInRemoved = userProfile.removedBadges?.includes('macro-chef');

    if (hasMacroChefInBadges || !isAlreadyInRemoved) {
      const cleanedBadges = (userProfile.badges || []).filter(
        b => !b.id.toLowerCase().includes('macro-chef') && !b.id.toLowerCase().includes('macro chef') && !b.name.toLowerCase().includes('macro chef')
      );
      const updatedRemoved = Array.from(new Set([...(userProfile.removedBadges || []), 'macro-chef']));

      updateUserProfile(userProfile.userId, {
        badges: cleanedBadges,
        removedBadges: updatedRemoved
      }).then(() => {
        if (onProfileUpdate) onProfileUpdate();
      }).catch(err => console.error("Error removing Macro Chef badge from profile:", err));
    }
  }, [userProfile?.userId, userProfile?.badges?.length, userProfile?.removedBadges?.length]);

  const loadData = async (date: string) => {
    setLoading(true);
    const [logData, measurementData, dayMeasurement, allLogs] = await Promise.all([
      gymService.getDailyLog(date),
      gymService.getLatestMeasurements(50),
      gymService.getMeasurement(date),
      gymService.getAllDailyLogs()
    ]);

    setMeasurements(measurementData);
    if (allLogs && allLogs.length > 0) {
      setReportLogs(allLogs);
    }
    
    // Pre-fill measurement form for the selected date
    if (dayMeasurement) {
      setHasDayMeasurement(true);
      setNewMeasurement({
        weight: dayMeasurement.weight,
        bodyFat: dayMeasurement.bodyFat || 0,
        waist: dayMeasurement.waist || 0,
        chest: dayMeasurement.chest || 0,
        leftArm: dayMeasurement.leftArm || 0,
        rightArm: dayMeasurement.rightArm || 0,
        leftThigh: dayMeasurement.leftThigh || 0,
        rightThigh: dayMeasurement.rightThigh || 0,
        neck: dayMeasurement.neck || 0
      });
      // Don't overwrite global units preference with day-specific units
      // as it causes confusion when browsing days. 
      // If we really want to preserve it, we'd only do it for initial form state.
    } else {
      setHasDayMeasurement(false);
      // Reset if no measurement for this day, or maybe keep latest? 
      // Let's reset to 0 but maybe keeping units is better.
      setNewMeasurement({
        weight: 0,
        bodyFat: 0,
        waist: 0,
        chest: 0,
        leftArm: 0,
        rightArm: 0,
        leftThigh: 0,
        rightThigh: 0,
        neck: 0
      });
    }

    if (logData) {
      // Sync weight from measurement if available for this day
      if (dayMeasurement && dayMeasurement.weight) {
        logData.weight = dayMeasurement.weight;
        logData.weightUnit = dayMeasurement.units.weight;
      }
      
      // Sync habits with profile master list (ensure new habits appear in old logs)
      const masterHabits = getHabitList();
      const currentHabits = logData.habits || {};
      const updatedHabits: Record<string, boolean> = {};
      let hasChanges = false;
      
      // Ensure goals and current values are numbers
      logData.steps = Number(logData.steps) || 0;
      logData.water = Number(logData.water) || 0;
      logData.sleepHours = Number(logData.sleepHours) || 0;

      const reportSleepGoal = latestReport ? parseSleepGoal(latestReport.report.sleepRecommendation?.duration) : 8;
      if (!logData.sleepGoal || Number(logData.sleepGoal) > 16 || Number(logData.sleepGoal) < 4) {
        logData.sleepGoal = reportSleepGoal;
        hasChanges = true;
      } else {
        logData.sleepGoal = Number(logData.sleepGoal);
      }
      if (!logData.sleepQuality) {
        logData.sleepQuality = 'Good';
      }
      if (logData.sleepNotes === undefined) {
        logData.sleepNotes = '';
      }
      
      // Sync step goal with latest report if available
      const reportStepGoal = latestReport ? parseStepGoal(latestReport.report.stepGoals) : 10000;
      if (!logData.stepGoal || Number(logData.stepGoal) > 50000 || Number(logData.stepGoal) < 3000 || (logData.stepGoal !== reportStepGoal && latestReport)) {
        logData.stepGoal = reportStepGoal;
        hasChanges = true;
      } else {
        logData.stepGoal = Number(logData.stepGoal);
      }
      
      // Sync water goal with report if available
      if (latestReport) {
        const waterTarget = latestReport.report.hydrationTargets.toLowerCase() || '3000ml';
        let reportGoalMl = 3000;
        
        // Parse report target (usually in ml/liters or oz)
        if (waterTarget.includes('oz')) {
          const ozValue = parseInt(waterTarget.match(/\d+/)?.[0] || '100');
          reportGoalMl = Math.round(ozValue * 29.5735);
        } else if (waterTarget.includes('l')) {
          const literMatch = waterTarget.match(/[\d.]+/);
          reportGoalMl = Math.round((parseFloat(literMatch?.[0] || '3')) * 1000);
        } else {
          reportGoalMl = parseInt(waterTarget.match(/\d+/)?.[0] || '3000');
        }

        // Determine current goal in ML for comparison
        const currentGoalMl = logData.waterUnit === 'oz' 
          ? Math.round((logData.waterGoal || 0) * 29.5735) 
          : (logData.waterGoal || 0);

        // If goal is missing, or looks like a major mismatch (e.g. was stored in wrong unit)
        // or just to ensure sync with report if it's the source of truth
        if (!logData.waterGoal || logData.waterGoal <= 0 || Math.abs(currentGoalMl - reportGoalMl) > 10) {
          if (logData.waterUnit === 'oz') {
            logData.waterGoal = Math.round(reportGoalMl / 29.5735);
          } else {
            logData.waterGoal = reportGoalMl;
            logData.waterUnit = 'ml'; // Default to ml if syncing and no unit explicitly set
          }
          hasChanges = true;
        }
      }

      // Final safeguard for "extremely high" values (e.g. 3000oz is always wrong for a human)
      if (logData.waterUnit === 'oz' && (logData.waterGoal || 0) > 400) {
        logData.waterGoal = Math.round((logData.waterGoal || 3000) / 29.5735);
        hasChanges = true;
      } else if (logData.waterUnit === 'ml' && (logData.waterGoal || 0) > 10000) {
        logData.waterGoal = 3000; // Reset to a sane default if it's over 10L
        hasChanges = true;
      }
      
      logData.waterGoal = Number(logData.waterGoal) || 3000;

      masterHabits.forEach(h => {
        if (currentHabits[h] !== undefined) {
          updatedHabits[h] = currentHabits[h];
        } else {
          updatedHabits[h] = false;
          hasChanges = true;
        }
      });

      // Check if we removed any habits
      if (Object.keys(currentHabits).length !== Object.keys(updatedHabits).length) {
        hasChanges = true;
      }

      if (hasChanges) {
        logData.habits = updatedHabits;
        gymService.updateDailyLog(date, { 
          habits: updatedHabits, 
          waterGoal: logData.waterGoal, 
          stepGoal: logData.stepGoal, 
          waterUnit: logData.waterUnit 
        });
      }

      // Ensure meals are initialized if missing or empty in old logs
      if ((!logData.meals || logData.meals.length === 0) && latestReport) {
        const mealDay = getMealsForSelectedDate();
        if (mealDay) {
          logData.meals = [
            { 
              name: mealDay.breakfast, 
              type: 'breakfast', 
              completed: false, 
              url: mealDay.breakfastUrl, 
              calories: mealDay.breakfastMacros?.calories,
              protein: mealDay.breakfastMacros?.protein,
              fat: mealDay.breakfastMacros?.fat,
              carbs: mealDay.breakfastMacros?.carbs
            },
            { 
              name: mealDay.lunch, 
              type: 'lunch', 
              completed: false, 
              url: mealDay.lunchUrl, 
              calories: mealDay.lunchMacros?.calories,
              protein: mealDay.lunchMacros?.protein,
              fat: mealDay.lunchMacros?.fat,
              carbs: mealDay.lunchMacros?.carbs
            },
            { 
              name: mealDay.dinner, 
              type: 'dinner', 
              completed: false, 
              url: mealDay.dinnerUrl, 
              calories: mealDay.dinnerMacros?.calories,
              protein: mealDay.dinnerMacros?.protein,
              fat: mealDay.dinnerMacros?.fat,
              carbs: mealDay.dinnerMacros?.carbs
            },
            { 
              name: mealDay.snack, 
              type: 'snack', 
              completed: false, 
              url: mealDay.snackUrl, 
              calories: mealDay.snackMacros?.calories,
              protein: mealDay.snackMacros?.protein,
              fat: mealDay.snackMacros?.fat,
              carbs: mealDay.snackMacros?.carbs
            }
          ];
        }
      }
      setLog(logData);
    } else {
      // Initialize with defaults if no log and no report, or from report if available
      const stepGoal = latestReport ? parseStepGoal(latestReport.report.stepGoals) : 10000;
      const waterTarget = latestReport?.report.hydrationTargets.toLowerCase() || '3000ml';
      let waterGoal = 3000; // default ml
      let waterUnit: 'ml' | 'oz' = 'ml';

      if (waterTarget.includes('oz')) {
        const ozValue = parseInt(waterTarget.match(/\d+/)?.[0] || '100');
        waterGoal = ozValue;
        waterUnit = 'oz';
      } else if (waterTarget.includes('l')) {
        waterGoal = (parseFloat(waterTarget.match(/[\d.]+/)?.[0] || '3') * 1000);
      }

      const mealDay = getMealsForSelectedDate();
      const initialMeals: DailyLog['meals'] = mealDay ? [
        { 
          name: mealDay.breakfast, 
          type: 'breakfast', 
          completed: false, 
          url: mealDay.breakfastUrl, 
          calories: mealDay.breakfastMacros?.calories,
          protein: mealDay.breakfastMacros?.protein,
          fat: mealDay.breakfastMacros?.fat,
          carbs: mealDay.breakfastMacros?.carbs
        },
        { 
          name: mealDay.lunch, 
          type: 'lunch', 
          completed: false, 
          url: mealDay.lunchUrl, 
          calories: mealDay.lunchMacros?.calories,
          protein: mealDay.lunchMacros?.protein,
          fat: mealDay.lunchMacros?.fat,
          carbs: mealDay.lunchMacros?.carbs
        },
        { 
          name: mealDay.dinner, 
          type: 'dinner', 
          completed: false, 
          url: mealDay.dinnerUrl, 
          calories: mealDay.dinnerMacros?.calories,
          protein: mealDay.dinnerMacros?.protein,
          fat: mealDay.dinnerMacros?.fat,
          carbs: mealDay.dinnerMacros?.carbs
        },
        { 
          name: mealDay.snack, 
          type: 'snack', 
          completed: false, 
          url: mealDay.snackUrl, 
          calories: mealDay.snackMacros?.calories,
          protein: mealDay.snackMacros?.protein,
          fat: mealDay.snackMacros?.fat,
          carbs: mealDay.snackMacros?.carbs
        }
      ] : [
        { name: 'Breakfast', type: 'breakfast', completed: false },
        { name: 'Lunch', type: 'lunch', completed: false },
        { name: 'Dinner', type: 'dinner', completed: false },
        { name: 'Snack', type: 'snack', completed: false }
      ];

      const initialSleepGoal = latestReport ? parseSleepGoal(latestReport.report.sleepRecommendation?.duration) : 8;

      const initialLog: DailyLog = {
        id: selectedDate,
        date: selectedDate,
        steps: 0,
        stepGoal,
        water: 0,
        waterGoal,
        waterUnit,
        sleepHours: 0,
        sleepGoal: initialSleepGoal,
        sleepQuality: 'Good',
        sleepNotes: '',
        completedWorkouts: 0,
        meals: initialMeals,
        habits: {
          'Step Goal': false,
          'Daily Stretching': false,
          'Nutrition Compliance': false,
          'Evening Recovery': false,
          'Adequate Sleep': false,
          'Water Consumption': false
        },
        useManualWorkout: false,
        useManualNutrition: false,
        weight: dayMeasurement?.weight || 0,
        weightUnit: dayMeasurement?.units.weight || measurementUnits.weight
      };
      setLog(initialLog);
      // Removed auto-save of initial log to avoid counting "viewed" days as active
    }
    setLoading(false);
  };

  const getHabitList = () => {
    return userProfile?.habitList || [
      'Adequate Sleep',
      'Water Consumption',
      'Step Goal',
      'Nutrition Compliance',
      'Daily Stretching',
      'Evening Recovery'
    ];
  };

  const habitList = getHabitList();

  const handleUpdateHabitList = async () => {
    if (!userProfile) return;
    try {
      const newList = editingHabits.filter(h => h.trim() !== '');
      await updateUserProfile(userProfile.userId, { habitList: newList });
      
      // Update current log habits mapping if needed
      // If we renamed a habit, we don't necessarily know how to map it unless we track indices
      // For now, simpler: user updates the list, it affects future logs.
      // The user said "reflect after that date", so strictly speaking I should update future logs.
      
      // Update current log to include new habits (init as false if missing)
      if (log) {
        const newHabitsObj = { ...log.habits };
        newList.forEach(h => {
          if (newHabitsObj[h] === undefined) newHabitsObj[h] = false;
        });
        const updatedLog = { ...log, habits: newHabitsObj };
        setLog(updatedLog);
        await gymService.updateDailyLog(selectedDate, { habits: newHabitsObj });
      }

      setIsEditingHabits(false);
      if (onProfileUpdate) onProfileUpdate();
    } catch (e) {
      console.error('Failed to update habits', e);
    }
  };

  const calculateXP = () => {
    if (!log) return 0;
    let xp = 0;
    const stepProg = Math.min((Number(log.steps) || 0) / (Number(log.stepGoal) || 10000), 1);
    const waterProg = Math.min((Number(log.water) || 0) / (Number(log.waterGoal) || 3000), 1);
    const sleepProg = Math.min((Number(log.sleepHours) || 0) / (Number(log.sleepGoal) || 8), 1);
    
    xp += stepProg * 500;
    xp += waterProg * 300;
    xp += sleepProg * 400;
    xp += (Number(log.completedWorkouts) || 0) * 1000;
    
    // Add XP for completed individual exercises
    const workoutData = log.workoutData || {};
    const completedExCount = Object.values(workoutData).filter(ex => ex.completed).length;
    xp += completedExCount * 50;

    const completedMeals = (log.meals || []).filter(m => m.completed).length;
    xp += completedMeals * 100;
    const completedHabits = habitList.filter(habit => log.habits?.[habit]).length;
    xp += completedHabits * 200;
    return Math.round(xp);
  };

  const handleAddMeasurement = async () => {
    if (!newMeasurement.weight) return;
    const measurement: Omit<Measurement, 'id' | 'timestamp'> = {
      date: selectedDate,
      weight: Number(newMeasurement.weight),
      bodyFat: Number(newMeasurement.bodyFat),
      waist: Number(newMeasurement.waist),
      chest: Number(newMeasurement.chest),
      leftArm: Number(newMeasurement.leftArm),
      rightArm: Number(newMeasurement.rightArm),
      leftThigh: Number(newMeasurement.leftThigh),
      rightThigh: Number(newMeasurement.rightThigh),
      leftCalf: Number(newMeasurement.leftCalf),
      rightCalf: Number(newMeasurement.rightCalf),
      neck: Number(newMeasurement.neck),
      units: measurementUnits
    };
    
    // Set loading state for optimistic feel
    setLoading(true);
    try {
      await gymService.addMeasurement(measurement);
      
      // Update local state immediately for snappy feel
      const newM: Measurement = { ...measurement, id: measurement.date, timestamp: new Date().toISOString() };
      setMeasurements(prev => {
        const filtered = prev.filter(m => m.date !== measurement.date);
        return [newM, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      });
      setHasDayMeasurement(true);

      // Sync with DailyLog consistency tracker & user profile
      await gymService.updateDailyLog(selectedDate, { 
        weight: Number(newMeasurement.weight),
        weightUnit: measurementUnits.weight 
      });

      if (userProfile?.userId) {
        await updateUserProfile(userProfile.userId, {
          weight: Number(newMeasurement.weight),
          weightUnit: measurementUnits.weight
        });
        if (onProfileUpdate) onProfileUpdate();
      }

      setIsAddingMeasurement(false);
      // Refresh to be sure
      await refreshGlobalStats();
      await loadData(selectedDate);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeasurement = async (id: string, date: string) => {
    if (!window.confirm('Are you sure you want to delete this measurement?')) return;
    await gymService.deleteMeasurement(id);
    
    // Also remove weight from daily log to keep consistency tracker in sync
    await gymService.updateDailyLog(date, { weight: 0 });
    
    await refreshGlobalStats();
    await loadData(selectedDate);
  };

  const toggleWaterUnit = () => {
    if (!log) return;
    const newUnit: 'ml' | 'oz' = log.waterUnit === 'ml' ? 'oz' : 'ml';
    // Optional: convert current values
    let newWater = log.water;
    let newGoal = log.waterGoal;
    if (newUnit === 'oz') {
      newWater = Math.round(log.water / 29.5735);
      newGoal = Math.round(log.waterGoal / 29.5735);
    } else {
      newWater = Math.round(log.water * 29.5735);
      newGoal = Math.round(log.waterGoal * 29.5735);
    }
    const updated = { ...log, waterUnit: newUnit, water: newWater, waterGoal: newGoal };
    setLog(updated);
  };

  const updateWater = (amount: number) => {
    if (!log) return;
    const newWater = Math.max(0, log.water + amount);
    setLog({ ...log, water: newWater });
  };

  const saveHydration = async () => {
    await flushChanges();
    setIsSavingHydration(true);
    setTimeout(() => setIsSavingHydration(false), 2000);
  };

  const saveSteps = async () => {
    await flushChanges();
    setIsSavingSteps(true);
    setTimeout(() => setIsSavingSteps(false), 2000);
  };

  const updateSteps = (amount: number) => {
    if (!log) return;
    const newSteps = Math.max(0, log.steps + amount);
    setLog({ ...log, steps: newSteps });
  };

  const toggleHabit = (habit: string) => {
    if (!log) return;
    const newHabits = { ...log.habits, [habit]: !log.habits?.[habit] };
    setLog({ ...log, habits: newHabits });
  };

  const loadReportData = async () => {
    setIsReportLoading(true);
    // Get all dates for the specific month in reportDate
    const year = reportDate.getFullYear();
    const month = reportDate.getMonth();
    const firstDay = getLocalDateString(new Date(year, month, 1));
    const lastDay = getLocalDateString(new Date(year, month + 1, 0));
    
    const [logs, monthMeasurements] = await Promise.all([
      gymService.getLogsInRange(firstDay, lastDay),
      gymService.getMeasurementsInRange(firstDay, lastDay)
    ]);

    setReportLogs(logs);
    // Don't overwrite the main measurements state used for the global tracker
    // Instead, use them locally if needed for report logic or refresh all
    if (monthMeasurements.length > 0) {
      setMeasurements(prev => {
        const otherMonths = prev.filter(m => !m.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
        return [...otherMonths, ...monthMeasurements].sort((a, b) => b.date.localeCompare(a.date));
      });
    }
    setIsReportLoading(false);
  };

  useEffect(() => {
    if (activeView === 'report') {
      loadReportData();
    }
  }, [activeView, reportDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!log) return null;

  if (!userProfile?.hasAccess) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-red-500/10 rounded-[2rem] border border-red-500/20"
        >
          <Shield className="w-16 h-16 text-red-500" />
        </motion.div>
        <div className="space-y-3 max-w-sm">
           <h2 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">Access <span className="text-red-500">Denied</span></h2>
           <p className="text-gray-400 font-light leading-relaxed">
             Specialized training protocols are currently locked. Your account requires professional authorization from an UNLCKD instructor.
           </p>
        </div>
        <Button 
          variant="outline" 
          onClick={onHomeClick}
          className="border-white/10 hover:bg-white/5 rounded-2xl px-8"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* Level Info Modal */}
      <LevelInfoModal 
        isOpen={isLevelModalOpen} 
        onClose={() => setIsLevelModalOpen(false)} 
        xp={totalXP} 
      />

      {/* Overlapping Reports Conflict Alert Banner */}
      {(() => {
        const conflicts = checkReportOverlaps(savedReports || []);
        if (conflicts.length === 0) return null;
        return (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-200 text-xs mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-bold text-amber-300 text-sm">Overlapping Transformation Reports Detected</p>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">Action Required: Delete 1 Report</Badge>
              </div>
              <p className="text-amber-200/80 leading-relaxed">
                No overlapping days are allowed between full transformation reports to prevent conflicting workout and meal plans in Gym Hub.
              </p>
              <div className="space-y-1 font-mono text-[11px] text-amber-300 pt-1">
                {conflicts.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                    <span>• <strong>{c.report1.userData?.name || 'Report 1'}</strong> ({c.range1.startISO} to {c.range1.endISO})</span>
                    <span className="text-amber-400 font-bold">conflicts with</span>
                    <span><strong>{c.report2.userData?.name || 'Report 2'}</strong> ({c.range2.startISO} to {c.range2.endISO})</span>
                    <span className="text-amber-400 font-bold">({c.overlapDays} days)</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-amber-400 font-semibold pt-1">
                👉 Please go to Saved Reports in your main library and delete one of the conflicting reports to resolve plan conflicts.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Hero Header - Refined for mobile */}
      <div className="relative min-h-[140px] md:h-48 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden group">
        <div className="absolute inset-0 bg-brand-primary opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent)]" />
        <div className="relative h-full flex flex-col md:flex-row items-center justify-between p-6 md:px-10 gap-6">
          <div className="flex flex-col justify-center text-center md:text-left">
            <div className="flex items-center gap-3 mb-3 mx-auto md:mx-0">
              <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/20 text-[9px] md:text-xs">PREMIUM EXPERIENCE</Badge>
              <AnimatePresence>
                {isSaving && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3 text-brand-primary animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary/60">Saving...</span>
                  </motion.div>
                )}
                {!isSaving && lastSaved > 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500/60">Saved</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <h1 
              className={cn(
                "text-2xl md:text-5xl font-display font-black text-white tracking-tighter",
                onHomeClick && "cursor-pointer hover:text-brand-primary transition-colors"
              )}
              onClick={onHomeClick}
            >
              UNLCKD <span className="text-brand-primary">PRO GYM</span>
            </h1>
            <div className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-brand-primary/60 mt-1 md:mt-2 text-center md:text-left">
              {getLevelInfo(totalXP).title} • {currentStreak} Day Workout Streak
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3 sm:gap-4 mt-3 flex-wrap">
              <button 
                onClick={() => setActiveView('hub')}
                className={cn(
                  "text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer",
                  activeView === 'hub' ? "text-brand-primary" : "text-gray-500 hover:text-gray-300"
                )}
              >
                Dashboard
              </button>
              <div className="w-1 h-1 rounded-full bg-gray-800" />
              <button 
                onClick={() => setActiveView('recovery')}
                className={cn(
                  "text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1",
                  activeView === 'recovery' ? "text-purple-400 font-bold" : "text-gray-500 hover:text-purple-300"
                )}
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                Recovery Hub
              </button>
              <div className="w-1 h-1 rounded-full bg-gray-800" />
              <button 
                onClick={() => setActiveView('report')}
                className={cn(
                  "text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer",
                  activeView === 'report' ? "text-brand-primary" : "text-gray-500 hover:text-gray-300"
                )}
              >
                Consistency
              </button>
              <div className="w-1 h-1 rounded-full bg-gray-800" />
              <button 
                onClick={() => setIsProgressReportOpen(true)}
                className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-brand-primary transition-all cursor-pointer"
              >
                Progress Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeView === 'hub' ? (
        <>
      {/* Daily Navigation */}
      <div className="flex flex-col gap-4">
        {/* Date Selector Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-brand-surface/80 border border-white/10 p-3 rounded-2xl shadow-lg">
          
          {/* Left: Quick Date Nav controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevDay}
              className="h-10 px-3 border-white/10 hover:bg-white/10 text-gray-300 gap-1 rounded-xl cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Prev</span>
            </Button>

            {/* Date Picker Badge */}
            <div className="relative group/header-date inline-flex items-center flex-1 sm:flex-initial">
              <input 
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                value={selectedDate}
                onChange={async (e) => {
                  if (!e.target.value) return;
                  await flushChanges();
                  ensureDateInCalendar(e.target.value);
                  setSelectedDate(e.target.value);
                }}
              />
              <div className="flex items-center justify-center gap-2 cursor-pointer bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 px-3.5 h-10 rounded-xl transition-all shadow-sm w-full">
                <Calendar className="w-4 h-4 text-brand-primary group-hover/header-date:scale-110 transition-all shrink-0" />
                <div className="flex flex-col leading-none justify-center">
                  <span className="text-[9px] font-black uppercase tracking-wider text-brand-primary mb-0.5">
                    {selectedDate === today ? 'Today' : 'Active Date'}
                  </span>
                  <span className="text-xs font-bold font-mono text-white whitespace-nowrap">
                    {parseLocalDate(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="h-10 px-3 border-white/10 hover:bg-white/10 text-gray-300 gap-1 rounded-xl cursor-pointer"
              title="Next Day"
            >
              <span className="hidden sm:inline text-xs font-semibold">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProgressReportOpen(true)}
              className="h-10 px-3 bg-brand-primary/10 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20 text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Daily</span> Report
            </Button>
            {selectedDate !== today && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleJumpToToday}
                className="h-10 px-3 bg-brand-primary text-brand-dark font-bold hover:bg-brand-primary/90 text-xs gap-1.5 rounded-xl cursor-pointer shadow-md shadow-brand-primary/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Jump to Today
              </Button>
            )}
          </div>

        </div>

        {/* Historical Past Date Locked Banner */}
        {isPastDate && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Historical Log — Locked (Read-Only)
                  </span>
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    {parseLocalDate(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-1 font-medium">
                  Past entries are locked from editing to keep historical records accurate. Click "Daily Progress Report" to view or export the full report for this date.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsProgressReportOpen(true)}
                className="h-9 px-3 bg-brand-primary text-brand-dark font-bold hover:bg-brand-primary/90 text-xs gap-1.5 rounded-xl cursor-pointer shadow-md"
              >
                <FileText className="w-3.5 h-3.5" />
                Daily Progress Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleJumpToToday}
                className="h-9 px-3 border-white/20 hover:bg-white/10 text-gray-200 text-xs gap-1.5 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Jump to Today
              </Button>
            </div>
          </div>
        )}

        {/* Scrollable Calendar Strip */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">
          {calendarDates.map((iso, i) => {
            const d = parseLocalDate(iso);
            const isSelected = selectedDate === iso;
            const isToday = iso === today;

            const hasMeasurement = measurements.some(m => m.date === iso && (chartMetric === 'weight' ? (m.weight && m.weight > 0) : (m.bodyFat && m.bodyFat > 0)));

            return (
              <button
                key={`${iso}-${i}`}
                id={`date-btn-${iso}`}
                onClick={async () => {
                  await flushChanges();
                  setSelectedDate(iso);
                }}
                className={cn(
                  "flex flex-col items-center min-w-[72px] p-3.5 rounded-2xl border transition-all relative group shadow-sm cursor-pointer",
                  isSelected 
                    ? "bg-brand-primary border-brand-primary text-brand-dark scale-105 shadow-brand-primary/20" 
                    : isToday 
                    ? "bg-brand-primary/10 border-brand-primary/40 text-gray-200 hover:border-brand-primary" 
                    : "bg-brand-surface border-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200"
                )}
              >
                <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-80 flex items-center gap-1">
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  {isToday && (
                    <span className={cn(
                      "text-[7px] font-black px-1 py-0.2 rounded uppercase leading-tight",
                      isSelected ? "bg-brand-dark/20 text-brand-dark" : "bg-brand-primary/30 text-brand-primary"
                    )}>
                      Today
                    </span>
                  )}
                </span>
                
                <div className="relative flex items-center justify-center">
                  <span className="text-lg font-bold font-mono">{d.getDate()}</span>
                  {hasMeasurement && (
                    <div className={cn(
                      "absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-brand-dark/80" : "bg-brand-primary"
                    )} />
                  )}
                </div>

                <span className="text-[9px] font-mono opacity-60 mt-1">
                  {d.toLocaleDateString('en-US', { month: 'short' })}
                </span>
                
                {isToday && !isSelected && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. TOP EXPERIENCE — DOMINANT TODAY'S WORK */}
      {(() => {
        const warmUpArr = workoutDay?.warmUp
          ? (Array.isArray(workoutDay.warmUp) ? workoutDay.warmUp : workoutDay.warmUp.split(/,|\n/).filter((l: string) => l.trim()))
          : [];
        const mainWorkArr = workoutDay?.mainWork
          ? (Array.isArray(workoutDay.mainWork) ? workoutDay.mainWork : workoutDay.mainWork.split('\n').filter((l: string) => l.trim()))
          : [];
        const totalExCount = warmUpArr.length + mainWorkArr.length;
        const estDuration = totalExCount > 0
          ? `${Math.max(35, totalExCount * 6)}–${Math.max(50, totalExCount * 8)} MIN`
          : '45–55 MIN';
        const phaseName = (
          (latestReport?.report as any)?.trainingPhase || 
          (latestReport?.report as any)?.phase || 
          (workoutDay as any)?.type || 
          'HYPERTROPHY'
        ).toUpperCase();
        const { completed, total } = getTrainingTotals();
        const isSessionStarted = completed > 0;
        const isSessionCompleted = total > 0 && completed === total;
        const weekAdherence = getWeekDaysAdherence();
        const phasePct = Math.round(Math.min(100, Math.max(0, (currentWeekNumber / Math.max(1, numWeeks)) * 100)));

        const handleDownloadWorkout = () => {
          const warmUpLines = warmUpArr.map((ex: any, i: number) => {
            const name = typeof ex === 'string' ? ex : (ex?.name || '');
            return `${i + 1}. ${name}`;
          }).join('\n');
          const mainWorkLines = mainWorkArr.map((ex: any, i: number) => {
            const name = typeof ex === 'string' ? ex : (ex?.name || '');
            const setsReps = (ex?.sets && ex?.reps) ? ` (${ex.sets} sets x ${ex.reps})` : '';
            return `${i + 1}. ${name}${setsReps}`;
          }).join('\n');
          const content = `UNLCKD WORKOUT - ${selectedDate}\n\nFOCUS: ${evaluatedFocus || workoutDay?.focus || 'Training'}\n\n--- WARM-UP ---\n${warmUpLines}\n\n--- MAIN WORKOUT ---\n${mainWorkLines}\n\nExported from UNLCKD Pro Gym`;
          downloadFile(`unlckd-workout-${selectedDate}.txt`, content);
        };

        const targetProteinGrams = Math.round(
          latestReport?.report?.healthMetrics?.recommendedCalorieLevel
            ? (Number(latestReport.report.healthMetrics.recommendedCalorieLevel) || 2000) * 0.3 / 4
            : 170
        );

        return (
          <div className="space-y-6">
            {/* DOMINANT TODAY'S WORK CARD */}
            <div className="relative overflow-hidden bg-gradient-to-b from-[#171717] via-[#111111] to-[#0D0D0D] border border-[#292929] rounded-[2rem] p-6 sm:p-10 shadow-2xl">
              {/* Subtle athletic background glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(#292929_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

              <div className="relative z-10 space-y-6 sm:space-y-8">
                {/* Date line & Tag */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292929] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-[#00DFA2] uppercase">
                      {parseLocalDate(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase().replace(',', ' /')}
                    </span>
                    <span className="text-[#292929] font-mono">•</span>
                    <MetadataLabel className="text-[#A1A1A1] tracking-[0.2em]">TODAY'S WORK.</MetadataLabel>
                  </div>

                  <div className="flex items-center gap-2">
                    {total > 0 && (
                      <Badge variant={isSessionCompleted ? 'active' : 'neutral'} className="text-[10px] sm:text-xs">
                        {isSessionCompleted ? 'SESSION COMPLETE' : `${completed}/${total} EXERCISES`}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Dominant Headline */}
                <div className="space-y-3">
                  <DisplayHeading className="text-3xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight text-white uppercase">
                    {evaluatedFocus || workoutDay?.focus || 'FULL BODY TRAINING'}
                  </DisplayHeading>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-1">
                    <div className="flex items-center gap-2 bg-[#171717] border border-[#292929] px-3.5 py-1.5 rounded-xl">
                      <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider">
                        {estDuration}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#171717] border border-[#292929] px-3.5 py-1.5 rounded-xl">
                      <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider">
                        {totalExCount > 0 ? `${totalExCount} EXERCISES` : 'FULL ROUTINE'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#171717] border border-[#292929] px-3.5 py-1.5 rounded-xl">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#00DFA2] tracking-wider uppercase">
                        {phaseName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Primary Call to Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      size="lg"
                      onClick={() => {
                        setIsTrainingCollapsed(false);
                        setTimeout(() => {
                          document.getElementById('active-workout-section')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="bg-[#00DFA2] text-[#080808] hover:bg-[#00c58f] font-bold text-sm uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-lg shadow-[#00DFA2]/20 cursor-pointer flex items-center gap-2"
                    >
                      <span>{isSessionStarted ? 'RESUME SESSION →' : 'START SESSION →'}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setIsProgressReportOpen(true)}
                      className="border-[#292929] text-white hover:bg-white/5 font-semibold text-sm uppercase tracking-wider px-6 py-3.5 rounded-xl cursor-pointer"
                    >
                      VIEW PROGRAM →
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={toggleManualMode}
                      className={cn(
                        "h-9 px-3 text-[10px] font-bold uppercase tracking-wider transition-all rounded-xl border flex items-center gap-1.5 cursor-pointer",
                        log?.useManualWorkout 
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" 
                          : "bg-white/5 border-[#292929] text-gray-300 hover:bg-white/10"
                      )}
                      title={log?.useManualWorkout ? "Switch to Auto Mode (Prescribed Plan)" : "Switch to Manual Mode (Allow Editing)"}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", log?.useManualWorkout ? "bg-amber-400 animate-pulse" : "bg-[#00DFA2]")} />
                      <span>{log?.useManualWorkout ? 'Manual Mode' : 'Auto Mode'}</span>
                    </Button>

                    {workoutDay && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-gray-400 hover:text-white border border-transparent hover:border-[#292929] h-9 px-3"
                        onClick={handleDownloadWorkout}
                        title="Download Workout Summary"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline ml-1.5">Export</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TODAY'S PERFORMANCE METRIC STRIP (Dividers, Columns, Large Numbers) */}
            <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6 border-b border-[#292929] pb-3">
                <MetadataLabel className="text-[#A1A1A1] tracking-[0.2em]">TODAY'S PERFORMANCE</MetadataLabel>
                <span className="text-[11px] font-mono text-[#6C6C6C]">DAILY ACTIVE METRICS</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y md:divide-y-0 md:divide-x divide-[#292929]">
                {/* STEPS */}
                <div className="space-y-1.5 pt-4 md:pt-0 md:px-4 first:pl-0">
                  <MetricDisplay
                    label="STEPS"
                    value={(log.steps || 0).toLocaleString()}
                    unit={
                      <span className="text-xs font-mono text-[#6C6C6C]">
                        / {(log.stepGoal || 10000).toLocaleString()}
                      </span>
                    }
                  />
                  <div className="flex items-center gap-1.5 pt-2">
                    <button 
                      onClick={() => updateSteps(-500)} 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 cursor-pointer"
                    >
                      -500
                    </button>
                    <button 
                      onClick={() => updateSteps(500)} 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#00DFA2] cursor-pointer"
                    >
                      +500
                    </button>
                  </div>
                </div>

                {/* WATER */}
                <div className="space-y-1.5 pt-4 md:pt-0 md:px-4">
                  <MetricDisplay
                    label={
                      <div className="flex items-center justify-between gap-1 w-full mb-0.5">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-[#6C6C6C]">
                          WATER
                        </span>
                        <div className="flex items-center bg-[#080808] border border-[#292929] rounded-[4px] p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetWaterDisplayUnit('imperial');
                            }}
                            className={cn(
                              "px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer",
                              waterDisplayUnit === 'imperial'
                                ? "bg-[#171717] text-[#00DFA2] border border-[#00DFA2]/30"
                                : "text-[#6C6C6C] hover:text-[#A1A1A1] border border-transparent"
                            )}
                            title="Imperial: Fluid Ounces (FL OZ)"
                          >
                            FL OZ
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetWaterDisplayUnit('metric');
                            }}
                            className={cn(
                              "px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer",
                              waterDisplayUnit === 'metric'
                                ? "bg-[#171717] text-[#00DFA2] border border-[#00DFA2]/30"
                                : "text-[#6C6C6C] hover:text-[#A1A1A1] border border-transparent"
                            )}
                            title="Metric: Milliliters / Liters (ML / L)"
                          >
                            ML
                          </button>
                        </div>
                      </div>
                    }
                    value={
                      waterDisplayUnit === 'imperial'
                        ? `${Math.round((log.water || 0) / 29.5735)}`
                        : (log.water || 0) >= 1000
                        ? `${((log.water || 0) / 1000).toFixed(1)}`
                        : `${Math.round(log.water || 0)}`
                    }
                    unit={
                      waterDisplayUnit === 'imperial' ? (
                        <span className="text-xs font-mono text-[#6C6C6C]">
                          FL OZ / {Math.round((log.waterGoal || 3000) / 29.5735)} FL OZ
                        </span>
                      ) : (log.water || 0) >= 1000 ? (
                        <span className="text-xs font-mono text-[#6C6C6C]">
                          L / {((log.waterGoal || 3000) / 1000).toFixed(1)} L
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-[#6C6C6C]">
                          ML / {Math.round(log.waterGoal || 3000)} ML
                        </span>
                      )
                    }
                  />
                  <div className="flex items-center gap-1.5 pt-2">
                    <button 
                      onClick={() => updateWater(waterDisplayUnit === 'imperial' ? -Math.round(8 * 29.5735) : -250)} 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 cursor-pointer"
                    >
                      {waterDisplayUnit === 'imperial' ? '-8 FL OZ' : '-250 ML'}
                    </button>
                    <button 
                      onClick={() => updateWater(waterDisplayUnit === 'imperial' ? Math.round(8 * 29.5735) : 250)} 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#00DFA2] cursor-pointer"
                    >
                      {waterDisplayUnit === 'imperial' ? '+8 FL OZ' : '+250 ML'}
                    </button>
                  </div>
                </div>

                {/* PROTEIN */}
                <div className="space-y-1.5 pt-4 md:pt-0 md:px-4">
                  <MetricDisplay
                    label="PROTEIN"
                    value={`${getNutritionTotals().protein}`}
                    unit={
                      <span className="text-xs font-mono text-[#6C6C6C]">
                        G / {targetProteinGrams}G
                      </span>
                    }
                  />
                  <span className="text-[11px] font-mono text-[#6C6C6C] block pt-2">
                    {getNutritionTotals().calories} CAL CONSUMED
                  </span>
                </div>

                {/* SLEEP */}
                <div className="space-y-1.5 pt-4 md:pt-0 md:px-4">
                  <MetricDisplay
                    label="SLEEP"
                    value={`${Math.floor(log.sleepHours || 0)}`}
                    unit={
                      <span className="text-xs font-mono text-[#6C6C6C]">
                        H {Math.round(((log.sleepHours || 0) % 1) * 60)}M / {log.sleepGoal || 8}H
                      </span>
                    }
                  />
                  <div className="flex items-center gap-1.5 pt-2">
                    <button 
                      onClick={() => updateSleepHours(-0.5)} 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 cursor-pointer"
                    >
                      -0.5h
                    </button>
                    <button 
                      onClick={() => updateSleepHours(0.5)} 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#00DFA2] cursor-pointer"
                    >
                      +0.5h
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. CURRENT PHASE & WEEKLY CONSISTENCY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CURRENT PHASE */}
              <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                  <MetadataLabel className="text-[#A1A1A1] tracking-[0.2em]">CURRENT PHASE</MetadataLabel>
                  <span className="text-xs font-mono font-bold text-[#00DFA2]">
                    {phasePct}% COMPLETE
                  </span>
                </div>

                <div>
                  <div className="font-display font-extrabold text-2xl sm:text-3xl text-white uppercase tracking-tight">
                    {phaseName} • WEEK {currentWeekNumber} / {numWeeks}
                  </div>
                  <p className="text-xs text-[#A1A1A1] mt-1 font-mono leading-relaxed">
                    {latestReport?.report?.goalAlignmentSummary || 'Progressive overload and structured periodization block.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2 bg-[#171717] rounded-full overflow-hidden border border-[#292929]">
                    <div 
                      className="h-full bg-[#00DFA2] transition-all duration-500"
                      style={{ width: `${phasePct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* WEEKLY CONSISTENCY */}
              <div className="bg-[#111111] border border-[#292929] rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                  <MetadataLabel className="text-[#A1A1A1] tracking-[0.2em]">WEEKLY CONSISTENCY</MetadataLabel>
                  <span className="text-xs font-mono font-bold text-[#00DFA2]">
                    {weekAdherence.completedCount} / 7 DAYS LOGGED
                  </span>
                </div>

                {/* Day dots */}
                <div className="grid grid-cols-7 gap-2 text-center py-1">
                  {weekAdherence.days.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={async () => {
                        await flushChanges();
                        ensureDateInCalendar(day.dateISO);
                        setSelectedDate(day.dateISO);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer",
                        day.isSelected 
                          ? "bg-[#00DFA2]/10 border-[#00DFA2] text-white" 
                          : "bg-[#171717] border-[#292929] text-gray-400 hover:border-white/20"
                      )}
                    >
                      <span className="text-[10px] font-bold font-mono uppercase">{day.dayLetter}</span>
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all",
                        day.isCompleted 
                          ? "bg-[#00DFA2] shadow-[0_0_6px_rgba(0,223,162,0.6)]" 
                          : "border border-[#6C6C6C] bg-transparent"
                      )} />
                      <span className="text-[9px] font-mono opacity-60">{day.dateNum}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-[#6C6C6C] pt-1 border-t border-[#292929]">
                  <span>{currentStreak} DAY ACTIVE STREAK</span>
                  <span>{calculateXP().toLocaleString()} XP TODAY</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Primary Active Session, Nutrition & Measurements */}
        <div className="lg:col-span-2 space-y-8" id="active-workout-section">

          {/* Workout Details */}
          <Card className="p-4 sm:p-6 md:p-8 bg-brand-surface border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-brand-primary/10 rounded-lg shrink-0">
                  <Dumbbell className="w-5 h-5 text-brand-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-100 text-lg sm:text-xl shrink-0">
                      {log?.useManualWorkout ? 'Manual Training Log' : 'Prescribed Training'}
                    </h3>
                    <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/20 font-black text-xs py-1 px-2.5 shrink-0 flex items-center gap-1 shadow-sm">
                      <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">Focus:</span>
                      <span className="text-brand-primary font-extrabold">{evaluatedFocus}</span>
                    </Badge>
                  </div>
                  {!isTrainingCollapsed && (
                    <span className="text-[11px] font-mono font-bold text-brand-primary/80 uppercase tracking-wider mt-0.5">
                      {parseLocalDate(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      {evaluatedFocus ? ` · FOCUS: ${evaluatedFocus.toUpperCase()}` : ''}
                    </span>
                  )}
                  {isTrainingCollapsed && (
                    <div className="flex items-center gap-3 mt-1">
                      {(() => {
                        const { completed, total } = getTrainingTotals();
                        return (
                          <span className="text-[10px] font-mono text-brand-primary font-bold">
                            FOCUS: {evaluatedFocus.toUpperCase()} · {completed} / {total} EXERCISES DONE
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleManualMode}
                  className={cn(
                    "h-8 px-2.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border flex items-center gap-1.5 shrink-0",
                    log?.useManualWorkout 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" 
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  )}
                  title={log?.useManualWorkout ? "Switch to Auto Mode (Prescribed Plan)" : "Switch to Manual Mode (Allow Editing)"}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", log?.useManualWorkout ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
                  <span>{log?.useManualWorkout ? 'Manual Mode' : 'Auto Mode'}</span>
                </Button>

                <UnitToggle<'lbs' | 'kg'>
                  unitA="lbs"
                  unitB="kg"
                  labelA="[LBS]"
                  labelB="[KG]"
                  value={measurementUnits.weight}
                  onChange={(w) => setMeasurementUnits(prev => ({ ...prev, weight: w }))}
                  size="sm"
                />

                {!isTrainingCollapsed && !latestReport && (
                  <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/20 font-black text-[10px] py-1 px-2.5">
                    MANUAL MODE
                  </Badge>
                )}

                {!isTrainingCollapsed && !log?.useManualWorkout && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-brand-primary hover:bg-brand-primary/10 transition-all flex items-center gap-1.5 h-8 px-2.5"
                    onClick={() => {
                      if (!workoutDay) return;
                      const dayDate = parseLocalDate(selectedDate);
                      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
                      let content = `UNLCKD PRO TRAINING - ${dayName.toUpperCase()}\n`;
                      content += `==========================================\n\n`;
                      
                      content += `WARM-UP SEQUENCE:\n`;
                      content += `-----------------\n`;
                      const warmUpLines = Array.isArray(workoutDay.warmUp) ? workoutDay.warmUp : (typeof workoutDay.warmUp === 'string' ? workoutDay.warmUp : '').split(/,|\n/).filter((l: any) => typeof l === 'string' && l.trim());
                      warmUpLines.forEach((l: any) => {
                        const { name, sets, reps } = parseExercise(l);
                        content += `- ${name} ${sets ? `(${sets} x ${reps})` : ''}\n`;
                      });
                      
                      content += `\nMAIN WORKOUT:\n`;
                      content += `-------------\n`;
                      const mainWorkLines = Array.isArray(workoutDay.mainWork) ? workoutDay.mainWork : (typeof workoutDay.mainWork === 'string' ? workoutDay.mainWork : '').split(/,|\n/).filter((l: any) => typeof l === 'string' && l.trim());
                      mainWorkLines.forEach((l: any) => {
                        const { name, sets, reps } = parseExercise(l);
                        content += `- ${name} ${sets ? `(${sets} x ${reps})` : ''}\n`;
                      });

                      if (workoutDay.notes) {
                        content += `\nCOACH NOTES:\n`;
                        content += `------------\n`;
                        content += workoutDay.notes;
                      }
                      
                      downloadFile(`unlckd-workout-${selectedDate}.txt`, content);
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Download</span>
                  </Button>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsTrainingCollapsed(!isTrainingCollapsed)}
                  className="text-gray-400 hover:text-white p-1.5 h-8 w-8"
                >
                  {isTrainingCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <AnimatePresence>
              {!isTrainingCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-6">
              {(log?.useManualWorkout || !latestReport) && (
                <div className="space-y-4 mb-4">
                  <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs font-bold text-brand-primary mb-1">Manual Entry Mode (Editing Allowed)</p>
                      <p className="text-[10px] text-brand-primary/60">Add or edit exercises directly in the tables below.</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Focus:</span>
                        <select
                          value={log?.manualWorkout?.focus || evaluatedFocus}
                          onChange={(e) => updateManualWorkout('focus', e.target.value)}
                          className="bg-transparent text-brand-primary text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="Chest" className="bg-gray-900 text-white">Chest</option>
                          <option value="Legs" className="bg-gray-900 text-white">Legs</option>
                          <option value="Back & Biceps" className="bg-gray-900 text-white">Back & Biceps</option>
                          <option value="Shoulders & Arms" className="bg-gray-900 text-white">Shoulders & Arms</option>
                          <option value="Cardio" className="bg-gray-900 text-white">Cardio</option>
                          <option value="Conditioning" className="bg-gray-900 text-white">Conditioning</option>
                          <option value="Recovery" className="bg-gray-900 text-white">Recovery</option>
                          <option value="Full Body" className="bg-gray-900 text-white">Full Body</option>
                          <option value="Core & Abs" className="bg-gray-900 text-white">Core & Abs</option>
                        </select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleManualMode}
                        className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 hover:border-brand-primary/60 h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
                      >
                        Auto Mode
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!(log?.useManualWorkout || !latestReport) && (
                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed italic">
                    {workoutDay?.notes || latestReport?.report.goalAlignmentSummary}
                  </p>
                </div>
              )}

                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIsWarmUpCollapsed(!isWarmUpCollapsed)}
                        className="flex items-center gap-2 text-xs font-mono font-black uppercase text-gray-400 tracking-widest hover:text-white transition-colors cursor-pointer"
                      >
                        {isWarmUpCollapsed ? <ChevronDown className="w-4 h-4 text-brand-primary" /> : <ChevronUp className="w-4 h-4 text-brand-primary" />}
                        <span>WARM-UP SEQUENCE</span>
                      </button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => addManualExercise('warmUp')}
                        className="h-7 px-2.5 text-xs font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Warm-Up
                      </Button>
                    </div>

                    {!isWarmUpCollapsed && (
                      <div className="space-y-3">
                        {(Array.isArray(workoutDay?.warmUp) 
                          ? workoutDay.warmUp 
                          : (typeof workoutDay?.warmUp === 'string' ? workoutDay.warmUp : '').split(/,|\n/).filter(line => typeof line === 'string' && line.trim())
                        ).map((ex, i) => (
                          <ExerciseCard
                            key={`warmup-${i}`}
                            exerciseId={`warmup-${i}`}
                            exRaw={ex}
                            isManual={log?.useManualWorkout || !latestReport}
                            section="warmUp"
                            index={i}
                            log={log}
                            measurementUnits={measurementUnits}
                            lastPerformance={getLastPerformance(ex)}
                            onToggle={handleExerciseToggle}
                            onSetRowUpdate={handleSetRowUpdate}
                            onAddSetRow={handleAddSetRow}
                            onRemoveSetRow={handleRemoveSetRow}
                            onUpdateManualName={updateManualExerciseName}
                            onRemoveManual={removeManualExercise}
                            parseExercise={parseExercise}
                            getSearchUrl={getSearchUrl}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsMainWorkCollapsed(!isMainWorkCollapsed)}
                      className="flex items-center gap-2 text-xs font-mono font-black uppercase text-gray-400 tracking-widest hover:text-white transition-colors cursor-pointer"
                    >
                      {isMainWorkCollapsed ? <ChevronDown className="w-4 h-4 text-brand-primary" /> : <ChevronUp className="w-4 h-4 text-brand-primary" />}
                      <span>{evaluatedFocus ? `${evaluatedFocus.toUpperCase()} (MAIN WORK)` : 'MAIN WORKOUT'}</span>
                    </button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => addManualExercise('mainWork')}
                        className="h-7 px-2.5 text-xs font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Exercise
                      </Button>
                  </div>
                  {!isMainWorkCollapsed && (
                    <div className="space-y-3">
                      {(Array.isArray(workoutDay?.mainWork) 
                        ? workoutDay.mainWork 
                        : (typeof workoutDay?.mainWork === 'string' ? workoutDay.mainWork : '').split('\n').filter(line => typeof line === 'string' && line.trim())
                      ).map((ex, i) => (
                        <ExerciseCard
                          key={`main-${i}`}
                          exerciseId={`main-${i}`}
                          exRaw={ex}
                          isManual={log?.useManualWorkout || !latestReport}
                          section="mainWork"
                          index={i}
                          log={log}
                          measurementUnits={measurementUnits}
                          lastPerformance={getLastPerformance(ex)}
                          onToggle={handleExerciseToggle}
                          onSetRowUpdate={handleSetRowUpdate}
                          onAddSetRow={handleAddSetRow}
                          onRemoveSetRow={handleRemoveSetRow}
                          onUpdateManualName={updateManualExerciseName}
                          onRemoveManual={removeManualExercise}
                          parseExercise={parseExercise}
                          getSearchUrl={getSearchUrl}
                        />
                      ))}
                    </div>
                  )}
                </div>

                  <div className="mt-8 pt-6 border-t border-white/5">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2 px-1">Training Session Notes</label>
                    <textarea 
                      placeholder="Record RPE, intensity shifts, or technique observations here..."
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm text-gray-300 focus:border-brand-primary outline-none transition-all resize-none h-24 shadow-inner"
                      value={log?.generalNotes || ''}
                      onChange={(e) => handleGeneralNotesUpdate(e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </Card>

          {/* Meal Log */}
          <Card className="p-4 sm:p-6 md:p-8 bg-brand-surface border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 bg-brand-primary/10 rounded-lg cursor-pointer hover:bg-brand-primary/20 transition-colors"
                  onClick={() => setIsNutritionCollapsed(!isNutritionCollapsed)}
                >
                  <Utensils className="w-5 h-5 text-brand-primary" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3">
                  <h3 
                    className="text-xl font-bold text-white cursor-pointer hover:text-brand-primary transition-colors"
                    onClick={() => setIsNutritionCollapsed(!isNutritionCollapsed)}
                  >
                    Nutrition
                  </h3>
                  {(() => {
                    const totals = getNutritionTotals();
                    const targetCal = latestReport?.report?.healthMetrics?.recommendedCalorieLevel || 1790;
                    const completedMealsCount = log?.meals?.filter(m => m.completed).length || 0;
                    const totalMealsCount = log?.meals?.length || 0;
                    return (
                      <span className="text-xs sm:text-sm font-mono text-gray-400 font-medium">
                        {totals.calories} / {targetCal} cal · {completedMealsCount}/{totalMealsCount} meals
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleManualNutritionMode}
                  className={cn(
                    "h-8 px-2.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border flex items-center gap-1.5 shrink-0 cursor-pointer",
                    log?.useManualNutrition 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" 
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  )}
                  title={log?.useManualNutrition ? "Switch to Auto Mode (Prescribed Plan)" : "Switch to Manual Mode (Allow Editing)"}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", log?.useManualNutrition ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
                  <span>{log?.useManualNutrition ? 'Manual Mode' : 'Auto Mode'}</span>
                </Button>

                {!isNutritionCollapsed && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddManualMeal}
                      className="border-brand-primary/20 hover:bg-brand-primary/10 text-brand-primary h-8 px-3 text-[11px] font-bold uppercase tracking-wider"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Meal
                    </Button>
                    {latestReport && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={importMealsFromPlan}
                        className="border-brand-primary/20 hover:bg-brand-primary/10 text-brand-primary h-8 px-3 text-[11px] font-bold uppercase tracking-wider"
                      >
                        Sync Plan
                      </Button>
                    )}
                  </>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsNutritionCollapsed(!isNutritionCollapsed)}
                  className="text-gray-400 hover:text-white p-1.5"
                >
                  {isNutritionCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {!isNutritionCollapsed && log?.meals && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                    {log.meals.map((meal, i) => {
                      const isCompleted = !!meal.completed;
                      return (
                        <div 
                          key={i}
                          className={cn(
                            "p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative group",
                            isCompleted 
                              ? "bg-emerald-500/[0.04] border-emerald-500/30" 
                              : "bg-white/[0.02] border-white/10 hover:border-white/20"
                          )}
                        >
                          {/* Header row of meal card */}
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => toggleMealCompletion(i)}
                              className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0",
                                isCompleted 
                                  ? "bg-emerald-500 text-black font-bold shadow-sm shadow-emerald-500/30" 
                                  : "border border-white/20 hover:border-brand-primary text-transparent"
                              )}
                              title={isCompleted ? "Mark as unconsumed" : "Mark as consumed"}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>

                            <div className="flex items-center gap-2">
                              {(log.useManualNutrition || log.useManualWorkout) ? (
                                <div className="flex items-center gap-1.5">
                                  <select 
                                    className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px] uppercase font-mono font-bold text-gray-300 outline-none focus:border-brand-primary"
                                    value={meal.type}
                                    onChange={(e) => updateMealMacro(i, 'type' as any, e.target.value)}
                                  >
                                    <option value="breakfast">BREAKFAST</option>
                                    <option value="lunch">LUNCH</option>
                                    <option value="dinner">DINNER</option>
                                    <option value="snack">SNACK</option>
                                    <option value="other">OTHER</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMeal(i)}
                                    className="p-1 text-red-500/50 hover:text-red-500 transition-colors"
                                    title="Delete meal"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] font-mono font-black tracking-widest text-gray-400 uppercase">
                                  {meal.type}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Meal Title */}
                          <div>
                            {(log.useManualNutrition || log.useManualWorkout) ? (
                              <input 
                                type="text"
                                className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-sm font-bold text-brand-primary outline-none focus:border-brand-primary w-full"
                                value={meal.name}
                                onChange={(e) => updateMealMacro(i, 'name', e.target.value)}
                                placeholder="Meal Name"
                              />
                            ) : (
                              <a 
                                href={getSearchUrl(meal.name, 'Nutrition')} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-base font-bold text-white hover:text-brand-primary transition-colors inline-flex items-center gap-1.5 leading-snug"
                              >
                                {meal.name} <ExternalLink className="w-3.5 h-3.5 opacity-40 shrink-0" />
                              </a>
                            )}
                          </div>

                          {/* Macros Pills / Editable Inputs */}
                          {(log.useManualNutrition || log.useManualWorkout) ? (
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-mono text-gray-500 uppercase text-center">Cal</span>
                                <input 
                                  type="text" 
                                  placeholder="0"
                                  className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-xs text-white outline-none focus:border-brand-primary"
                                  value={meal.calories || ''}
                                  onChange={(e) => updateMealMacro(i, 'calories', e.target.value)}
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-mono text-gray-500 uppercase text-center">Prot</span>
                                <input 
                                  type="text" 
                                  placeholder="0"
                                  className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-xs text-white outline-none focus:border-brand-primary"
                                  value={meal.protein || ''}
                                  onChange={(e) => updateMealMacro(i, 'protein', e.target.value)}
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-mono text-gray-500 uppercase text-center">Fat</span>
                                <input 
                                  type="text" 
                                  placeholder="0"
                                  className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-xs text-white outline-none focus:border-brand-primary"
                                  value={meal.fat || ''}
                                  onChange={(e) => updateMealMacro(i, 'fat', e.target.value)}
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-mono text-gray-500 uppercase text-center">Carb</span>
                                <input 
                                  type="text" 
                                  placeholder="0"
                                  className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-center font-mono text-xs text-white outline-none focus:border-brand-primary"
                                  value={meal.carbs || ''}
                                  onChange={(e) => updateMealMacro(i, 'carbs', e.target.value)}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-gray-300">
                                {meal.calories || 0} cal
                              </span>
                              <span className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-gray-300">
                                P {meal.protein || 0}g
                              </span>
                              <span className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-gray-300">
                                F {meal.fat || 0}g
                              </span>
                              <span className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-gray-300">
                                C {meal.carbs || 0}g
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Measurements */}
          <Card id="measurements-section" className="p-4 sm:p-6 md:p-8 bg-brand-surface border-white/5 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                    <Ruler className="w-5 h-5 text-purple-500" />
                  </div>
                  <h3 className="font-bold text-gray-100 text-lg sm:text-xl shrink-0">Body Measurements</h3>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <UnitToggle<'lbs' | 'kg'>
                    unitA="lbs"
                    unitB="kg"
                    labelA="[LBS]"
                    labelB="[KG]"
                    value={measurementUnits.weight}
                    onChange={(w) => setMeasurementUnits(prev => ({ ...prev, weight: w }))}
                    size="sm"
                  />
                  <UnitToggle<'in' | 'cm'>
                    unitA="in"
                    unitB="cm"
                    labelA="[IN]"
                    labelB="[CM]"
                    value={measurementUnits.length}
                    onChange={(l) => setMeasurementUnits(prev => ({ ...prev, length: l }))}
                    size="sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddingMeasurement(true)}
                  className="border-white/10 hover:bg-white/5 whitespace-nowrap h-8 text-xs font-medium shrink-0"
                >
                  {hasDayMeasurement ? 'Update Log' : 'Log New'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsMeasurementsExpanded(!isMeasurementsExpanded)}
                  className="text-gray-400 hover:text-white p-1.5 h-8 w-8 shrink-0"
                >
                  {isMeasurementsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {isAddingMeasurement ? (
              <div className="space-y-6 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input 
                    label={`Weight (${measurementUnits.weight})`} 
                    type="number" 
                    value={newMeasurement.weight ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, weight: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                  <Input 
                    label="Body Fat (%)" 
                    type="number" 
                    value={newMeasurement.bodyFat ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, bodyFat: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                  <Input 
                    label={`Neck (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.neck ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, neck: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                  <Input 
                    label={`Chest (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.chest ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, chest: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                  <Input 
                    label={`Waist (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.waist ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, waist: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                   <Input 
                    label={`L.Arm (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.leftArm ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, leftArm: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                   <Input 
                    label={`R.Arm (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.rightArm ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, rightArm: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                   <Input 
                    label={`L.Thigh (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.leftThigh ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, leftThigh: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                   <Input 
                    label={`R.Thigh (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.rightThigh ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, rightThigh: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                   <Input 
                    label={`L.Calf (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.leftCalf ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, leftCalf: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                   <Input 
                    label={`R.Calf (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.rightCalf ?? ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, rightCalf: e.target.value === '' ? ('' as any) : Number(e.target.value)})}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <Button variant="ghost" onClick={() => setIsAddingMeasurement(false)}>Cancel</Button>
                  <Button className="bg-brand-primary text-brand-dark px-10" onClick={handleAddMeasurement}>Save Log</Button>
                </div>
              </div>
            ) : isMeasurementsExpanded && measurements.length > 0 ? (
              (() => {
                const sortedMeasurements = [...measurements].sort((a, b) => b.date.localeCompare(a.date));
                const itemsPerPage = 5;
                const totalPages = Math.ceil(sortedMeasurements.length / itemsPerPage) || 1;
                const safePage = Math.min(Math.max(1, measurementPage), totalPages);
                const startIndex = (safePage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedMeasurements = sortedMeasurements.slice(startIndex, endIndex);

                return (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                          <tr>
                            <th className="pb-4 font-bold">Date</th>
                            <th className="pb-4 font-bold">Weight</th>
                            <th className="pb-4 font-bold">Fat %</th>
                            <th className="pb-4 font-bold">Waist/Neck</th>
                            <th className="pb-4 font-bold">Arms (L/R)</th>
                            <th className="pb-4 font-bold">Thighs (L/R)</th>
                            <th className="pb-4 font-bold">Calves (L/R)</th>
                            <th className="pb-4 font-bold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {paginatedMeasurements.map((m) => {
                            const convertWeight = (w: number, from: string) => {
                              if (from === measurementUnits.weight) return w;
                              if (measurementUnits.weight === 'kg' && from === 'lbs') return w * 0.453592;
                              if (measurementUnits.weight === 'lbs' && from === 'kg') return w / 0.453592;
                              return w;
                            };
                            const convertLen = (l: number, from: string) => {
                              if (from === measurementUnits.length) return l;
                              if (measurementUnits.length === 'cm' && from === 'in') return l * 2.54;
                              if (measurementUnits.length === 'in' && from === 'cm') return l / 2.54;
                              return l;
                            };

                            const displayWeight = convertWeight(Number(m.weight), m.units?.weight || 'kg');
                            const displayWaist = convertLen(Number(m.waist), m.units?.length || 'cm');
                            const displayNeck = convertLen(Number(m.neck), m.units?.length || 'cm');
                            const displayLArm = convertLen(Number(m.leftArm), m.units?.length || 'cm');
                            const displayRArm = convertLen(Number(m.rightArm), m.units?.length || 'cm');
                            const displayLThigh = convertLen(Number(m.leftThigh), m.units?.length || 'cm');
                            const displayRThigh = convertLen(Number(m.rightThigh), m.units?.length || 'cm');
                            const displayLCalf = convertLen(Number(m.leftCalf || m.calves || 0), m.units?.length || 'cm');
                            const displayRCalf = convertLen(Number(m.rightCalf || m.calves || 0), m.units?.length || 'cm');

                            // Safe local date parsing
                            const displayDate = parseLocalDate(m.date).toLocaleDateString();

                            return (
                              <tr key={m.id} className="border-b border-white/[0.02] last:border-0 group">
                                <td className="py-4 text-gray-400 font-mono text-[10px] uppercase font-bold">{displayDate}</td>
                                <td className="py-4 font-mono text-gray-200">
                                  <span className="block">{displayWeight.toFixed(1)}{measurementUnits.weight}</span>
                                  {m.units?.weight && m.units.weight !== measurementUnits.weight && (
                                    <span className="text-[9px] text-gray-600 block">orig: {m.weight}{m.units.weight}</span>
                                  )}
                                </td>
                                <td className="py-4 font-mono text-gray-200">{m.bodyFat || 0}%</td>
                                <td className="py-4 font-mono text-gray-200">
                                  <span className="block">{displayWaist.toFixed(1)} / {displayNeck.toFixed(1)}{measurementUnits.length}</span>
                                  {m.units?.length && m.units.length !== measurementUnits.length && (
                                    <span className="text-[9px] text-gray-600 block">orig: {m.waist}/{m.neck}{m.units.length}</span>
                                  )}
                                </td>
                                <td className="py-4 font-mono text-gray-200">
                                  <span className="block">{displayLArm.toFixed(1)}/{displayRArm.toFixed(1)}{measurementUnits.length}</span>
                                </td>
                                <td className="py-4 font-mono text-gray-200">
                                  <span className="block">{displayLThigh.toFixed(1)}/{displayRThigh.toFixed(1)}{measurementUnits.length}</span>
                                </td>
                                <td className="py-4 font-mono text-gray-200">
                                  <span className="block">{displayLCalf.toFixed(1)}/{displayRCalf.toFixed(1)}{measurementUnits.length}</span>
                                </td>
                                <td className="py-4 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => {
                                        setSelectedDate(m.date);
                                        setIsAddingMeasurement(true);
                                        document.getElementById('measurements-section')?.scrollIntoView({ behavior: 'smooth' });
                                      }}
                                      className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-brand-primary cursor-pointer"
                                      title="Edit Entry"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteMeasurement(m.id, m.date)}
                                      className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-red-500 cursor-pointer"
                                      title="Delete Entry"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs">
                        <div className="text-gray-400 font-mono text-[11px]">
                          Showing <span className="font-bold text-gray-200">{startIndex + 1}</span>–<span className="font-bold text-gray-200">{Math.min(endIndex, sortedMeasurements.length)}</span> of <span className="font-bold text-gray-200">{sortedMeasurements.length}</span> entries
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage <= 1}
                            onClick={() => setMeasurementPage(safePage - 1)}
                            className="h-7 px-2.5 border-white/10 hover:bg-white/5 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs gap-1 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>Prev</span>
                          </Button>

                          <div className="flex items-center gap-1 px-1">
                            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                              <button
                                key={p}
                                onClick={() => setMeasurementPage(p)}
                                className={cn(
                                  "w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer",
                                  safePage === p
                                    ? "bg-purple-500/20 border border-purple-500/50 text-purple-300 shadow-sm"
                                    : "hover:bg-white/5 text-gray-400"
                                )}
                              >
                                {p}
                              </button>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage >= totalPages}
                            onClick={() => setMeasurementPage(safePage + 1)}
                            className="h-7 px-2.5 border-white/10 hover:bg-white/5 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs gap-1 cursor-pointer"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : measurements.length > 0 && !isMeasurementsExpanded ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500 font-mono">Expand entries to see historical tracking</p>
              </div>
            ) : (
              <div className="text-center py-12 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                <p className="text-sm text-gray-500 italic">No measurements logged yet. Track your progress weekly.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Habits & Rewards */}
        <div className="space-y-8">
          <GymQuickTrackers
            sensors={sensors}
            trackerOrder={trackerOrder}
            handleDragEnd={handleDragEnd}
            log={log}
            setLog={setLog}
            isWaterCollapsed={isWaterCollapsed}
            setIsWaterCollapsed={setIsWaterCollapsed}
            updateWater={updateWater}
            toggleWaterUnit={toggleWaterUnit}
            handleSaveHydration={handleSaveHydration}
            isSavingHydration={isSavingHydration}
            isStepsCollapsed={isStepsCollapsed}
            setIsStepsCollapsed={setIsStepsCollapsed}
            updateSteps={updateSteps}
            handleSaveMovement={handleSaveMovement}
            isSavingSteps={isSavingSteps}
            isSleepCollapsed={isSleepCollapsed}
            setIsSleepCollapsed={setIsSleepCollapsed}
            updateSleepHours={updateSleepHours}
            handleSaveSleep={handleSaveSleep}
            isSavingSleep={isSavingSleep}
            isRecoveryCollapsed={isRecoveryCollapsed}
            setIsRecoveryCollapsed={setIsRecoveryCollapsed}
            getRecoveryForSelectedDate={getRecoveryForSelectedDate}
            handleToggleQuickRecovery={handleToggleQuickRecovery}
            setActiveView={setActiveView}
          />
          <Card className="p-8 bg-brand-surface border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setIsHabitsCollapsed(!isHabitsCollapsed)}
              >
                <div className="p-2 bg-brand-primary/10 rounded-lg group-hover:bg-brand-primary/20 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-gray-100">Daily Habits</h3>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isHabitsCollapsed ? "text-brand-primary" : "text-gray-500")}>
                      {isHabitsCollapsed ? `${habitList.filter(h => log.habits?.[h]).length}/${habitList.length} Completed` : "Daily Checklist"}
                    </span>
                    {isHabitsCollapsed ? <ChevronDown className="w-3 h-3 text-gray-600" /> : <ChevronUp className="w-3 h-3 text-gray-600" />}
                  </div>
                </div>
              </div>
              {!isHabitsCollapsed && (
                <button 
                  onClick={() => {
                    if (isEditingHabits) {
                      handleUpdateHabitList();
                    } else {
                      setEditingHabits(habitList);
                      setIsEditingHabits(true);
                    }
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:text-brand-primary/80 transition-colors"
                >
                  {isEditingHabits ? 'Save Changes' : 'Manage Habits'}
                </button>
              )}
            </div>
            
            <AnimatePresence>
              {!isHabitsCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4">
                    {isEditingHabits ? (
                      <div className="space-y-3">
                        {editingHabits.map((h, idx) => (
                          <div key={idx} className="flex gap-2">
                             <Input 
                              value={h}
                              onChange={(e) => {
                                const newList = [...editingHabits];
                                newList[idx] = e.target.value;
                                setEditingHabits(newList);
                              }}
                              className="bg-white/5 border-white/10"
                             />
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500/50 hover:text-red-500"
                              onClick={() => setEditingHabits(editingHabits.filter((_, i) => i !== idx))}
                             >
                               <Minus className="w-4 h-4" />
                             </Button>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          className="w-full border-dashed border-white/10 text-gray-500 hover:text-brand-primary hover:border-brand-primary/30"
                          onClick={() => setEditingHabits([...editingHabits, ''])}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add Habit
                        </Button>
                      </div>
                    ) : (
                      habitList.map((habit) => {
                        const completed = log.habits?.[habit] || false;
                        return (
                          <button
                            key={habit}
                            onClick={() => toggleHabit(habit)}
                            className={cn(
                              "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                              completed 
                                ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary" 
                                : "bg-white/5 border-white/5 text-gray-400 hover:border-white/10"
                            )}
                          >
                            <div className="flex items-center gap-3 text-left">
                              {(habit.toLowerCase().includes('nutrition') || habit.toLowerCase().includes('diet')) && <Utensils className="w-4 h-4" />}
                              {(habit.toLowerCase().includes('recovery') || habit.toLowerCase().includes('sleep')) && <Moon className="w-4 h-4" />}
                              {habit.toLowerCase().includes('step') && <Footprints className="w-4 h-4" />}
                              {(habit.toLowerCase().includes('stretching') || habit.toLowerCase().includes('mobility')) && <ZapIcon className="w-4 h-4" />}
                              {habit.toLowerCase().includes('water') && <Droplets className="w-4 h-4" />}
                              <span className="text-sm font-medium">{habit}</span>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                              completed ? "bg-brand-primary border-brand-primary" : "border-white/10"
                            )}>
                              {completed && <Check className="w-3 h-3 text-brand-surface" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          <Card 
            className="p-8 bg-brand-primary border-none text-brand-dark cursor-pointer group hover:scale-[1.02] transition-all relative overflow-hidden"
            onClick={() => setIsLevelModalOpen(true)}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <ZapIcon className="w-24 h-24" />
            </div>
            
            {(() => {
              const info = getLevelInfo(totalXP);
              return (
                <>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Level {info.level}</h4>
                      <h3 className="text-2xl font-display font-black tracking-tighter uppercase">{info.title}</h3>
                    </div>
                    <div className="text-4xl filter drop-shadow-lg group-hover:bounce transition-all">
                      {info.badge}
                    </div>
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span>Progress to Level {info.level + 1}</span>
                        <span>{info.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-brand-dark/10 rounded-full overflow-hidden border border-brand-dark/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${info.progress}%` }}
                          className="h-full bg-brand-dark shadow-[0_0_12px_rgba(0,0,0,0.2)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] uppercase font-black opacity-70">
                      <Sparkles className="w-3 h-3" />
                      <span>Click to view level rewards</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
      </div>

      {/* Monthly Goal & Badges Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Badge Card */}
        <Card 
          className="p-6 md:p-8 bg-brand-surface border-white/5 relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-brand-primary/30 transition-all shadow-lg hover:shadow-brand-primary/5"
          onClick={() => {
            setSelectedModalMonthIdx(activeMonthIdx);
            setIsMonthlyBadgeModalOpen(true);
          }}
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Target className="w-40 h-40 text-brand-primary" />
          </div>
          
          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-primary/10 rounded-xl border border-brand-primary/20 shrink-0">
                  <Calendar className="w-5 h-5 text-brand-primary" />
                </div>
                <h3 className="font-extrabold text-white text-base tracking-wide">Monthly Badge</h3>
              </div>
              <Badge className={cn(
                "px-3 py-1 rounded-xl border-none font-bold uppercase text-[10px] tracking-wider shrink-0",
                userProfile?.badges?.find(b => b.id === currentGoal.badgeId) ? "bg-brand-primary text-brand-dark shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "bg-white/10 text-gray-300"
              )}>
                {userProfile?.badges?.find(b => b.id === currentGoal.badgeId) ? "Mission Complete" : "In Progress"}
              </Badge>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3.5">
                <div 
                  className="w-12 h-12 rounded-2xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-[0_0_12px_rgba(16,185,129,0.15)] mt-0.5"
                  title="Click to view requirements and details"
                >
                  <currentGoal.icon className="w-6 h-6 text-brand-primary" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 
                    className="text-lg font-display font-black text-white hover:text-brand-primary transition-colors cursor-pointer flex items-center gap-1.5 group/title"
                    title="Click to view requirements and details"
                  >
                    <span>{currentGoal.missionName}</span>
                    <ChevronRight className="w-4 h-4 text-brand-primary opacity-80 group-hover/title:translate-x-1 transition-transform shrink-0" />
                  </h4>
                  <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{currentGoal.description}</p>
                </div>
              </div>

              {/* Requirement & Progress summary */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Requirement:</span>
                  <p className="text-brand-primary font-bold text-xs leading-snug">{currentGoal.rewardDetail}</p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono font-bold">
                    <span>Progress: {reportLogs.filter(l => (l.sleepHours || 0) >= 8).length} / 20 Nights</span>
                    <span>{Math.min(100, Math.round((reportLogs.filter(l => (l.sleepHours || 0) >= 8).length / 20) * 100))}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-brand-primary/80 to-brand-primary h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.round((reportLogs.filter(l => (l.sleepHours || 0) >= 8).length / 20) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Deadline:</span>
                  <span className="font-mono text-gray-200 font-semibold">{currentGoalDeadline}</span>
                </div>

                {/* Upcoming Month Preview Quick Link */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedModalMonthIdx((activeMonthIdx + 1) % 12);
                    setIsMonthlyBadgeModalOpen(true);
                  }}
                  className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1 transition-all"
                >
                  <span>Next Up ({MONTHLY_GOALS[(activeMonthIdx + 1) % 12].monthName})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Accomplishment Badges Card */}
        {(() => {
          const validBadges = ACCOMPLISHMENT_BADGES.filter(b => b.id !== 'macro-chef' && !userProfile?.removedBadges?.includes(b.id));
          const earnedAccomplishmentBadges = validBadges.filter((badgeDef) => {
            const val = badgeDef.getProgressValue(reportLogs, log, userProfile, measurements);
            return badgeDef.tiers.some(t => val >= t.targetValue);
          });
          const displayedAccomplishmentBadges = showAllAccomplishmentBadges 
            ? validBadges 
            : earnedAccomplishmentBadges;

          return (
            <Card className="p-6 md:p-8 bg-brand-surface border-white/5 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-primary/10 rounded-xl border border-brand-primary/20 shrink-0">
                    <Award className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (isAccomplishmentBadgesCollapsed) {
                            setIsAccomplishmentBadgesCollapsed(false);
                            setShowAllAccomplishmentBadges(true);
                          } else {
                            setShowAllAccomplishmentBadges(prev => !prev);
                          }
                        }}
                        className="font-extrabold text-gray-100 uppercase tracking-widest text-sm hover:text-brand-primary transition-colors text-left flex items-center gap-2"
                        title="Click title to view all or earned badges"
                      >
                        <span>Accomplishment Badges</span>
                      </button>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/30">
                        {earnedAccomplishmentBadges.length} / {ACCOMPLISHMENT_BADGES.length} Earned
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block pt-0.5">
                      {isAccomplishmentBadgesCollapsed
                        ? "Collapsed • Click title or arrow to view"
                        : showAllAccomplishmentBadges
                        ? "Showing All Badges (Click title for earned only)"
                        : "Showing Earned Only (Click title for all badges)"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAccomplishmentBadgesCollapsed(prev => !prev)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                  title={isAccomplishmentBadgesCollapsed ? "Expand section" : "Collapse section"}
                >
                  <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", !isAccomplishmentBadgesCollapsed && "rotate-180")} />
                </button>
              </div>

              {!isAccomplishmentBadgesCollapsed && (
                <div className="space-y-4 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="text-[10px] sm:text-xs font-mono text-gray-400">
                      Tap any badge to view tiers & requirements
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAllAccomplishmentBadges(prev => !prev)}
                      className="text-[11px] font-bold text-brand-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
                    >
                      {showAllAccomplishmentBadges ? (
                        <span>Show Earned Only ({earnedAccomplishmentBadges.length})</span>
                      ) : (
                        <span>Show All Badges ({ACCOMPLISHMENT_BADGES.length})</span>
                      )}
                    </button>
                  </div>

                  {displayedAccomplishmentBadges.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {displayedAccomplishmentBadges.map((badgeDef) => {
                        const val = badgeDef.getProgressValue(reportLogs, log, userProfile, measurements);
                        const unlockedTiers = badgeDef.tiers.filter(t => val >= t.targetValue);
                        const highestUnlockedTier = unlockedTiers.length > 0 ? unlockedTiers[unlockedTiers.length - 1] : null;
                        const tierStyle = getTierStyle(highestUnlockedTier ? highestUnlockedTier.tier : null);

                        return (
                          <div 
                            key={badgeDef.id}
                            onClick={() => setSelectedAccomplishmentBadge(badgeDef)}
                            className={cn(
                              "flex flex-col items-center text-center p-3.5 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.03] relative overflow-hidden",
                              tierStyle.bg,
                              tierStyle.border
                            )}
                          >
                            <div className={cn("w-11 h-11 rounded-full flex items-center justify-center mb-2 transition-transform group-hover:scale-110 shadow-md", tierStyle.iconBg)}>
                              <badgeDef.icon className={cn("w-5 h-5", tierStyle.iconColor)} />
                            </div>
                            <span className="text-xs font-black text-gray-100 tracking-tight leading-tight line-clamp-1">{badgeDef.name}</span>
                            <span className={cn("text-[9px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full border", tierStyle.tag)}>
                              {highestUnlockedTier ? highestUnlockedTier.tier : 'Locked'}
                            </span>
                            <span className="text-[9px] font-mono text-gray-400 mt-1 line-clamp-1">
                              {val.toLocaleString()} {badgeDef.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center space-y-2">
                      <Award className="w-8 h-8 text-gray-600 mx-auto" />
                      <p className="text-xs font-bold text-gray-300">No Badges Earned Yet</p>
                      <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                        Keep logging workouts, step milestones, sleep, and recovery to unlock your first badge!
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAllAccomplishmentBadges(true)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline"
                      >
                        View All {ACCOMPLISHMENT_BADGES.length} Available Badges
                      </button>
                    </div>
                  )}

                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">
                      Workouts, step milestones, mobility flows & sleep hygiene automatically unlock badge tiers.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          );
        })()}
      </div>
      </>
      ) : activeView === 'recovery' ? (
        <RecoveryScheduleView 
          log={log} 
          selectedDate={selectedDate} 
          report={latestReport} 
          onUpdateRecoverySessions={handleUpdateRecoverySessions} 
          onAddXP={(amount) => setTotalXP(prev => prev + amount)}
        />
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 md:p-3 bg-brand-primary/10 rounded-2xl">
                <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-brand-primary" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-display font-black text-white">Consistency Tracker</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Detailed progression analysis</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-3 bg-brand-surface border border-white/5 p-1.5 md:p-2 rounded-2xl">
              <button 
                onClick={() => {
                  const d = new Date(reportDate);
                  d.setMonth(d.getMonth() - 1);
                  setReportDate(d);
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-4 text-xs md:text-sm font-black uppercase tracking-widest text-white min-w-[120px] md:min-w-[140px] text-center">
                {reportDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </div>
              <button 
                onClick={() => {
                  const d = new Date(reportDate);
                  d.setMonth(d.getMonth() + 1);
                  setReportDate(d);
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {(() => {
              const daysInMonth = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate();
              const isCurrentMonth = reportDate.getMonth() === new Date().getMonth() && reportDate.getFullYear() === new Date().getFullYear();
              const daysToConsider = isCurrentMonth ? new Date().getDate() : daysInMonth;
              
              const defaultStepGoal = 10000;
              const stepCompliance = reportLogs.filter(l => l.steps >= 10000).length;
              const waterCompliance = reportLogs.reduce((acc, l) => acc + (l.water >= l.waterGoal ? 1 : 0), 0);
              const weightCompliance = new Set(
                measurements
                  .filter(m => {
                    const yearMonth = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
                    return m.date.startsWith(yearMonth) && (m.weight || 0) > 0;
                  })
                  .map(m => m.date)
              ).size;
              const habitCompletionTotal = reportLogs.reduce((acc, l) => acc + (Object.values(l.habits || {}).filter(Boolean).length / (Object.keys(l.habits || {}).length || 1)), 0);

              return (
                <>
                  <Card className="p-8 bg-brand-surface border-white/5 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Step Compliance</span>
                    <div className="text-3xl font-display font-black text-white">
                      {Math.round((stepCompliance / daysToConsider) * 100)}%
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000" 
                        style={{ width: `${(stepCompliance / daysToConsider) * 100}%` }} 
                      />
                    </div>
                  </Card>
                  <Card className="p-8 bg-brand-surface border-white/5 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hydration Goal</span>
                    <div className="text-3xl font-display font-black text-white">
                      {Math.round((waterCompliance / daysToConsider) * 100)}%
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-1000" 
                        style={{ width: `${(waterCompliance / daysToConsider) * 100}%` }} 
                      />
                    </div>
                  </Card>
                  <Card className="p-8 bg-brand-surface border-white/5 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Habit Integrity</span>
                    <div className="text-3xl font-display font-black text-white">
                      {Math.round((habitCompletionTotal / daysToConsider) * 100)}%
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-primary transition-all duration-1000" 
                        style={{ width: `${(habitCompletionTotal / daysToConsider) * 100}%` }} 
                      />
                    </div>
                  </Card>
                  <Card className="p-8 bg-brand-surface border-white/5 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Weight Monitoring</span>
                    <div className="text-3xl font-display font-black text-white">
                      {Math.round((weightCompliance / daysToConsider) * 100)}%
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-primary/50 transition-all duration-1000" 
                        style={{ width: `${(weightCompliance / daysToConsider) * 100}%` }} 
                      />
                    </div>
                  </Card>
                </>
              );
            })()}
          </div>

          <Card className="p-8 bg-brand-surface border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-brand-primary" />
                </div>
                <h3 className="font-bold text-gray-100 uppercase tracking-widest text-sm">Monthly Habit Tracker</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500 mr-2">
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-primary" /> Completed</div>
                   <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-white/10" /> Missed</div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsHabitsCollapsed(!isHabitsCollapsed)}
                  className="text-gray-500 hover:text-white"
                >
                  {isHabitsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {!isHabitsCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto pb-6 custom-scrollbar scroll-smooth">
                    {(() => {
                      const daysInMonth = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate();
                      return (
                        <div className="min-w-fit">
                          <div 
                            className="grid items-center relative"
                            style={{ 
                              gridTemplateColumns: `minmax(180px, 240px) repeat(${daysInMonth}, 32px)` 
                            }}
                          >
                            {/* Calendar Days Header */}
                            <div className="sticky left-0 z-30 bg-brand-surface text-[10px] font-black text-gray-500 uppercase tracking-widest p-3 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.4)] h-12 flex items-center">
                              Habit & Accuracy
                            </div>
                            {Array.from({ length: daysInMonth }).map((_, i) => (
                              <div key={i} className="text-[10px] font-mono text-gray-600 text-center sticky top-0 bg-brand-surface z-10 h-12 flex items-center justify-center border-b border-white/5">{i + 1}</div>
                            ))}

                            {/* Habit Rows */}
                            {habitList.map((habit) => {
                              const isCurrentMonth = reportDate.getMonth() === new Date().getMonth() && reportDate.getFullYear() === new Date().getFullYear();
                              const daysToConsider = isCurrentMonth ? new Date().getDate() : daysInMonth;
                              
                              const completions = reportLogs.filter(l => l.habits?.[habit]).length;
                              const percentage = Math.round((completions / Math.max(1, daysToConsider)) * 100);

                              return (
                                <React.Fragment key={habit}>
                                  <div className="sticky left-0 z-20 bg-brand-surface flex items-center justify-between gap-3 pl-3 pr-4 min-w-0 h-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.4)]">
                                    <span className="text-xs font-bold text-gray-100 truncate flex-1">{habit}</span>
                                    <span className="text-[10px] font-mono font-black text-brand-primary shrink-0 bg-brand-primary/10 px-1.5 py-0.5 rounded border border-brand-primary/20">{percentage}%</span>
                                  </div>
                                  {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const logAtDate = reportLogs.find(l => l.date === dateStr);
                                    const isDone = logAtDate?.habits?.[habit] || false;
                                    const isFuture = new Date(dateStr) > new Date();

                                    return (
                                      <div key={i} className="flex justify-center h-10 items-center bg-white/[0.01] border-b border-white/[0.02]">
                                        {isFuture ? (
                                          <div className="w-2 h-2 rounded-full bg-white/[0.03]" />
                                        ) : isDone ? (
                                          <motion.div 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="w-2.5 h-2.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                          />
                                        ) : (
                                          <div className="w-2 h-2 rounded-full border border-white/10" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}

                            {/* Built-in Metrics Rows */}
                            <div className="col-span-full border-t border-white/10 my-2" />
                            
                            {(() => {
                              const isCurrentMonth = reportDate.getMonth() === new Date().getMonth() && reportDate.getFullYear() === new Date().getFullYear();
                              const daysToConsider = isCurrentMonth ? new Date().getDate() : daysInMonth;
                              
                              const reportStepGoal = 10000;
                              const stepCompletions = reportLogs.filter(l => l.steps >= 10000).length;
                              const stepPercentage = Math.round((stepCompletions / Math.max(1, daysToConsider)) * 100);
                              
                              const waterCompletions = reportLogs.filter(l => l.water >= l.waterGoal).length;
                              const waterPercentage = Math.round((waterCompletions / Math.max(1, daysToConsider)) * 100);

                              return (
                                <>
                                  <div className="sticky left-0 z-20 bg-brand-surface flex items-center justify-between gap-3 pl-3 pr-4 min-w-0 h-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.4)]">
                                    <span className="text-xs font-bold text-gray-100 truncate flex-1">10K Step Goal</span>
                                    <span className="text-[10px] font-mono font-black text-emerald-500 shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{stepPercentage}%</span>
                                  </div>
                                  {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const logAtDate = reportLogs.find(l => l.date === dateStr);
                                    const effectiveStepGoal = logAtDate?.stepGoal || reportStepGoal;
                                    const isDone = logAtDate && logAtDate.steps >= effectiveStepGoal;
                                    const isFuture = new Date(dateStr) > new Date();

                                    return (
                                      <div key={i} className="flex justify-center h-10 items-center bg-white/[0.01] border-b border-white/[0.02]">
                                        {isFuture ? <div className="w-2 h-2 rounded-full bg-white/[0.03]" /> :
                                         isDone ? <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> :
                                         <div className="w-2 h-2 rounded-full border border-white/10" />
                                        }
                                      </div>
                                    );
                                  })}

                                  <div className="sticky left-0 z-20 bg-brand-surface flex items-center justify-between gap-3 pl-3 pr-4 min-w-0 h-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.4)]">
                                    <span className="text-xs font-bold text-gray-100 truncate flex-1">Hydration Target</span>
                                    <span className="text-[10px] font-mono font-black text-blue-500 shrink-0 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{waterPercentage}%</span>
                                  </div>
                                  {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const logAtDate = reportLogs.find(l => l.date === dateStr);
                                    const isDone = logAtDate && logAtDate.water >= logAtDate.waterGoal;
                                    const isFuture = new Date(dateStr) > new Date();

                                    return (
                                      <div key={i} className="flex justify-center h-10 items-center bg-white/[0.01] border-b border-white/[0.02]">
                                        {isFuture ? <div className="w-2 h-2 rounded-full bg-white/[0.03]" /> :
                                         isDone ? <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" /> :
                                         <div className="w-2 h-2 rounded-full border border-white/10" />
                                        }
                                      </div>
                                    );
                                  })}

                                  {(() => {
                                    const currentYearMonth = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
                                    const weightLoggingDays = new Set(
                                      measurements
                                        .filter(m => m.date.startsWith(currentYearMonth) && (m.weight || 0) > 0)
                                        .map(m => m.date)
                                    );
                                    const weightPercentage = Math.round((weightLoggingDays.size / Math.max(1, daysToConsider)) * 100);
                                    return (
                                      <>
                                        <div className="sticky left-0 z-20 bg-brand-surface flex items-center justify-between gap-3 pl-3 pr-4 min-w-0 h-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.4)]">
                                          <span className="text-xs font-bold text-gray-100 truncate flex-1">Body Weight Logged</span>
                                          <span className="text-[10px] font-mono font-black text-brand-primary shrink-0 bg-brand-primary/10 px-1.5 py-0.5 rounded border border-brand-primary/20">{weightPercentage}%</span>
                                        </div>
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                          const day = i + 1;
                                          const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                          const hasDayWeight = weightLoggingDays.has(dateStr);
                                          const isFuture = new Date(dateStr) > new Date();

                                          return (
                                            <div key={i} className="flex justify-center h-10 items-center bg-white/[0.01] border-b border-white/[0.02]">
                                              {isFuture ? <div className="w-2 h-2 rounded-full bg-white/[0.03]" /> :
                                               hasDayWeight ? <div className="w-2.5 h-2.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> :
                                               <div className="w-2 h-2 rounded-full border border-white/10" />
                                              }
                                            </div>
                                          );
                                        })}
                                      </>
                                    );
                                  })()}

                                  {(() => {
                                    const workoutCompletions = reportLogs.filter(l => (l.completedWorkouts || 0) > 0).length;
                                    const workoutPercentage = Math.round((workoutCompletions / Math.max(1, daysToConsider)) * 100);
                                    return (
                                      <>
                                        <div className="sticky left-0 z-20 bg-brand-surface flex items-center justify-between gap-3 pl-3 pr-4 min-w-0 h-10 border-r border-white/10 shadow-[4px_0_12px_rgba(0,0,0,0.4)]">
                                          <span className="text-xs font-bold text-gray-100 truncate flex-1">Workout Sessions</span>
                                          <span className="text-[10px] font-mono font-black text-amber-500 shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{workoutPercentage}%</span>
                                        </div>
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                          const day = i + 1;
                                          const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                          const logAtDate = reportLogs.find(l => l.date === dateStr);
                                          const isDone = logAtDate && (logAtDate.completedWorkouts || 0) > 0;
                                          const isFuture = new Date(dateStr) > new Date();

                                          return (
                                            <div key={i} className="flex justify-center h-10 items-center bg-white/[0.01] border-b border-white/[0.02]">
                                              {isFuture ? <div className="w-2 h-2 rounded-full bg-white/[0.03]" /> :
                                               isDone ? <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]" /> :
                                               <div className="w-2 h-2 rounded-full border border-white/10" />
                                              }
                                            </div>
                                          );
                                        })}
                                      </>
                                    );
                                  })()}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      )}
      
      <div className="mt-8 p-4 md:p-6 bg-red-500/5 border border-red-500/10 rounded-[1.5rem] md:rounded-[2rem]">
        <div className="flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 leading-relaxed uppercase tracking-wider font-bold">
            <span className="text-red-500 font-extrabold uppercase">Safety & Medical Disclaimer:</span> Always consult with a qualified healthcare professional or licensed physician prior to starting any new exercise program, consuming any suggested nutritional supplements, or making significant lifestyle/dietary changes to ensure safety. This hub provides strategic informational guidance and does not replace professional medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>

      <ProgressReportModal 
        isOpen={isProgressReportOpen}
        onClose={() => setIsProgressReportOpen(false)}
        userProfile={userProfile}
        selectedDate={selectedDate}
        onReportSaved={onReportSaved}
      />

      {/* Toast Notification Alert */}
      <AnimatePresence>
        {badgeSyncToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-brand-surface border border-brand-primary/40 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl"
          >
            <div className="p-2 bg-brand-primary/20 rounded-xl">
              <Award className="w-5 h-5 text-brand-primary" />
            </div>
            <p className="text-xs font-bold font-mono tracking-tight">{badgeSyncToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly Badge Requirements & Details Modal */}
      <AnimatePresence>
        {isMonthlyBadgeModalOpen && (() => {
          const viewGoal = MONTHLY_GOALS[selectedModalMonthIdx] || currentGoal;
          const isSelectedActive = selectedModalMonthIdx === activeMonthIdx;
          const isSelectedUpcoming = selectedModalMonthIdx > activeMonthIdx;
          const isSelectedUnlocked = userProfile?.badges?.some(b => b.id === viewGoal.badgeId);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-brand-surface border border-white/10 rounded-2xl md:rounded-3xl max-w-xl w-full p-4 sm:p-6 md:p-8 space-y-5 relative shadow-2xl max-h-[85vh] sm:max-h-[88vh] overflow-y-auto custom-scrollbar min-h-0"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/30">
                      <Calendar className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-display font-black text-white">Monthly Challenges</h3>
                      <p className="text-[10px] text-brand-primary font-mono uppercase font-bold tracking-widest">
                        {viewGoal.monthName} Challenge {isSelectedActive ? '(Active)' : isSelectedUpcoming ? '(Upcoming)' : '(Past)'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMonthlyBadgeModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Month Navigation & Preview Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-400">
                    <span>Browse Challenges:</span>
                    <span className="text-brand-primary font-bold">
                      {isSelectedActive ? '★ Current Active Month' : isSelectedUpcoming ? '🔒 Upcoming Preview' : '✓ Past Challenge'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar scroll-smooth">
                    {MONTHLY_GOALS.map((goal, idx) => {
                      const isSelected = idx === selectedModalMonthIdx;
                      const isActiveCurrent = idx === activeMonthIdx;
                      const isUpcoming = idx > activeMonthIdx;
                      const isUnlockedBadge = userProfile?.badges?.some(b => b.id === goal.badgeId);

                      return (
                        <button
                          key={goal.monthName}
                          type="button"
                          onClick={() => setSelectedModalMonthIdx(idx)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5",
                            isSelected 
                              ? "bg-brand-primary text-brand-dark border-brand-primary font-black shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                              : isActiveCurrent
                              ? "bg-brand-primary/10 text-brand-primary border-brand-primary/40 hover:bg-brand-primary/20"
                              : isUpcoming
                              ? "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                              : "bg-white/[0.02] text-gray-500 border-white/5 hover:bg-white/5"
                          )}
                        >
                          <span>{goal.monthName}</span>
                          {isUnlockedBadge && <CheckCircle2 className={cn("w-3 h-3", isSelected ? "text-brand-dark" : "text-brand-primary")} />}
                          {isActiveCurrent && !isUnlockedBadge && <span className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-brand-dark" : "bg-brand-primary")} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hero Banner */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-brand-primary/15 via-brand-primary/5 to-transparent border border-brand-primary/20 rounded-2xl flex items-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <viewGoal.icon className="w-7 h-7 sm:w-8 sm:h-8 text-brand-primary" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-brand-primary font-mono uppercase font-bold tracking-widest">
                        {viewGoal.monthName} Challenge
                      </span>
                      {isSelectedUpcoming && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] px-2 py-0.5 font-bold uppercase">
                          Upcoming Preview
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-base sm:text-lg font-display font-black text-white tracking-tight leading-tight">{viewGoal.missionName}</h4>
                    <p className="text-xs text-gray-300 font-semibold">Badge Title: <span className="text-white font-extrabold">{viewGoal.badgeName}</span></p>
                  </div>
                </div>

                {/* Requirements & Description */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Mission Overview</h5>
                  <p className="text-xs text-gray-300 leading-relaxed bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                    {viewGoal.description}
                  </p>

                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 pt-1">Requirements Checklist</h5>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-200">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white">Target Goal: </span>
                        <span>{viewGoal.rewardDetail}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-200">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white">Timeframe: </span>
                        <span>
                          {isSelectedActive ? (
                            <>Complete before <span className="font-mono text-brand-primary font-bold">{currentGoalDeadline}</span></>
                          ) : isSelectedUpcoming ? (
                            <>Active during the full month of <span className="font-mono text-brand-primary font-bold">{viewGoal.monthName}</span></>
                          ) : (
                            <>Past Challenge (<span className="font-mono text-gray-400 font-bold">{viewGoal.monthName}</span>)</>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-200">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white">Logging Method: </span>
                        <span>Log workouts, sleep, hydration or recovery sessions daily in Pro Gym</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Evaluation */}
                {isSelectedActive ? (
                  <div className="p-3.5 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-200">Current Log Progress:</span>
                      <span className="font-mono text-brand-primary font-black">
                        {reportLogs.filter(l => (l.sleepHours || 0) >= 8).length} / 20 Nights Logged
                      </span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-brand-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((reportLogs.filter(l => (l.sleepHours || 0) >= 8).length / 20) * 100))}%` }}
                      />
                    </div>
                  </div>
                ) : isSelectedUpcoming ? (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-200/90 leading-normal">
                      <span className="font-bold text-amber-300">Upcoming Challenge: </span>
                      This mission unlocks on the 1st of {viewGoal.monthName}. Review the requirements above to prepare your training routine!
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-gray-400">Past Month Challenge ({viewGoal.monthName})</span>
                    {isSelectedUnlocked ? (
                      <span className="text-brand-primary font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Badge Unlocked
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Not unlocked</span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setIsMonthlyBadgeModalOpen(false)}
                    className="flex-1 text-xs font-bold py-2.5 border-white/10 text-gray-300 hover:bg-white/5"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => handleSyncMonthlyBadge(viewGoal)}
                    className="flex-1 text-xs font-extrabold py-2.5 bg-brand-primary text-brand-dark hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20"
                  >
                    <Award className="w-4 h-4 mr-1.5" /> 
                    {isSelectedActive 
                      ? 'Sync / Claim Badge' 
                      : isSelectedUnlocked 
                      ? 'Badge Unlocked' 
                      : 'Claim Badge'}
                  </Button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Accomplishment Badge Tiers & Breakdown Modal */}
      <AnimatePresence>
        {selectedAccomplishmentBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-white/10 rounded-2xl md:rounded-3xl max-w-xl w-full p-4 sm:p-6 md:p-8 space-y-5 relative shadow-2xl max-h-[85vh] sm:max-h-[88vh] overflow-y-auto custom-scrollbar min-h-0"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-primary/10 rounded-xl border border-brand-primary/30">
                    <Award className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-black text-white">{selectedAccomplishmentBadge.name} Badge</h3>
                    <p className="text-[10px] text-brand-primary font-mono uppercase font-bold tracking-widest">{selectedAccomplishmentBadge.category}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAccomplishmentBadge(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hero Overview */}
              <div className="p-5 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center shrink-0 shadow-lg">
                  <selectedAccomplishmentBadge.icon className="w-8 h-8 text-brand-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">{selectedAccomplishmentBadge.name}</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">{selectedAccomplishmentBadge.description}</p>
                  <div className="pt-1 text-xs font-mono text-brand-primary font-bold">
                    Your Record: {selectedAccomplishmentBadge.getProgressValue(reportLogs, log, userProfile, measurements).toLocaleString()} {selectedAccomplishmentBadge.unit}
                  </div>
                </div>
              </div>

              {/* Tiers List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400">Achievement Tiers</h5>
                <div className="space-y-3">
                  {selectedAccomplishmentBadge.tiers.map((t) => {
                    const userVal = selectedAccomplishmentBadge.getProgressValue(reportLogs, log, userProfile, measurements);
                    const isUnlocked = userVal >= t.targetValue;
                    const tierStyle = getTierStyle(t.tier);
                    const progressPercent = Math.min(100, Math.round((userVal / t.targetValue) * 100));

                    return (
                      <div 
                        key={t.tier} 
                        className={cn(
                          "p-4 rounded-2xl border transition-all space-y-2.5",
                          tierStyle.bg,
                          tierStyle.border
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-xs", tierStyle.iconBg)}>
                              {t.tierLevel}
                            </div>
                            <div>
                              <h6 className="text-xs font-extrabold text-white">{t.tier} Tier — {t.targetLabel}</h6>
                              <p className="text-[11px] text-gray-300">{t.reqDescription}</p>
                            </div>
                          </div>
                          <Badge className={cn("px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border", tierStyle.tag)}>
                            {isUnlocked ? 'UNLOCKED' : `${progressPercent}%`}
                          </Badge>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              isUnlocked ? "bg-brand-primary" : "bg-white/40"
                            )}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAccomplishmentBadge(null)}
                  className="flex-1 text-xs font-bold py-3 border-white/10 text-gray-300 hover:bg-white/5"
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleSyncAccomplishmentBadge(selectedAccomplishmentBadge)}
                  className="flex-1 text-xs font-extrabold py-3 bg-brand-primary text-brand-dark hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20"
                >
                  <Award className="w-4 h-4 mr-2" /> Sync / Claim Earned Tiers
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
