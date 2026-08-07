import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Award, 
  ShieldAlert, 
  Dumbbell, 
  Ruler, 
  Activity, 
  Save, 
  X, 
  Sparkles,
  ChevronRight,
  ChevronDown,
  Utensils,
  Printer,
  Check,
  Plus,
  Footprints,
  Scale
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { UserProfile, DailyLog, Measurement, AssessmentResult } from '../types';
import { gymService } from '../services/gymService';
import { historyService } from '../services/historyService';
import { cn } from '../lib/utils';

export type ReportTimeframe = 'weekly' | 'monthly' | '4-week' | '8-week' | '12-week' | 'full';

interface ProgressReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onReportSaved?: () => void;
}

export function ProgressReportModal({
  isOpen,
  onClose,
  userProfile,
  onReportSaved
}: ProgressReportModalProps) {
  const [timeframe, setTimeframe] = useState<ReportTimeframe>('monthly');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [allGymLogs, setAllGymLogs] = useState<DailyLog[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedGymRangeIds, setSelectedGymRangeIds] = useState<string[]>([]);
  const [displayWeightUnit, setDisplayWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [savingReport, setSavingReport] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (userProfile?.weightUnit === 'kg' || userProfile?.weightUnit === 'kgs') {
      setDisplayWeightUnit('kg');
    } else {
      setDisplayWeightUnit('lbs');
    }
  }, [userProfile]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, timeframe]);

  const loadData = async () => {
    setLoading(true);
    try {
      const daysCount = timeframe === 'weekly' ? 7 : timeframe === '4-week' ? 28 : timeframe === '8-week' ? 56 : timeframe === '12-week' ? 84 : timeframe === 'full' ? 365 : 30;
      const [fetchedLogs, fetchedAllGymLogs, fetchedMeasurements] = await Promise.all([
        gymService.getDailyLogsRange(daysCount + 10),
        gymService.getAllDailyLogs(),
        gymService.getLatestMeasurements(100)
      ]);

      // STRICTLY EXCLUDE ANY LOGS/MEASUREMENTS PAST CURRENT DATE
      const validLogs = (fetchedLogs || []).filter(l => l.date <= todayStr);
      const validAllGymLogs = (fetchedAllGymLogs || []).filter(l => l.date <= todayStr);
      const validMeasurements = (fetchedMeasurements || []).filter(m => m.date <= todayStr);

      setLogs(validLogs);
      setAllGymLogs(validAllGymLogs);
      setMeasurements(validMeasurements);
    } catch (e) {
      console.error("Failed loading report data", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Format weight value based on selected unit toggle (lbs vs kg)
  const formatWeightVal = (lbsVal: number): string => {
    if (!lbsVal || isNaN(lbsVal) || lbsVal === 0) return '0';
    if (displayWeightUnit === 'kg') {
      const kgVal = lbsVal * 0.45359237;
      return kgVal % 1 === 0 ? kgVal.toFixed(0) : kgVal.toFixed(1);
    }
    return lbsVal % 1 === 0 ? lbsVal.toFixed(0) : lbsVal.toFixed(1);
  };

  // Helper to clean exercise name
  const cleanExerciseName = (rawName: string): string => {
    if (!rawName) return '';
    let name = rawName.trim();
    name = name.replace(/^(?:main work|main|warmup|warm up|focus|auxiliary|accessory|\d+[\.\)]|[a-z][\.\)])\s*[-:]?\s*/i, '');
    name = name.replace(/_/g, ' ').trim();
    name = name.replace(/\s*[\(\[-]\s*\d+\s*sets?.*$/i, '').trim();
    name = name.replace(/\s*\(?\d+\s*x\s*\d+.*$/i, '').trim();

    const lower = name.toLowerCase();
    if (
      lower === 'main' || 
      lower === 'main work' || 
      lower === 'mainwork' || 
      lower === 'warmup' || 
      lower === 'warm up' || 
      lower === 'focus' ||
      lower.length < 2
    ) {
      return '';
    }
    return name;
  };

  // Helper to exclude untrackable exercises (foam rolling, stretching, walks)
  const isUntrackableExercise = (name: string): boolean => {
    if (!name) return true;
    const lower = name.toLowerCase();
    const untrackableKeywords = [
      'foam roll', 'foam rolling', 'stretching', 'stretch',
      'warmup', 'warm up', 'cool down', 'cooldown',
      'mobility', 'massage', 'breathing', 'flexibility',
      'walk', 'walking', 'zone 2'
    ];
    return untrackableKeywords.some(kw => lower.includes(kw));
  };

  // Compute date ranges
  const days = timeframe === 'weekly' ? 7 : timeframe === '4-week' ? 28 : timeframe === '8-week' ? 56 : timeframe === '12-week' ? 84 : timeframe === 'full' ? 365 : 30;
  const cutoffDate = new Date();
  if (timeframe !== 'full') {
    cutoffDate.setDate(cutoffDate.getDate() - days);
  } else {
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
  }

  const filteredLogs = logs.filter(l => l.date <= todayStr && new Date(l.date) >= cutoffDate);
  const filteredMeasurements = measurements.filter(m => m.date <= todayStr && new Date(m.date) >= cutoffDate);

  // Compute measurement changes
  const sortedMeasurements = [...filteredMeasurements].sort((a, b) => a.date.localeCompare(b.date));
  const firstM = sortedMeasurements[0] || (measurements.length > 0 ? measurements[measurements.length - 1] : null);
  const latestM = sortedMeasurements[sortedMeasurements.length - 1] || (measurements.length > 0 ? measurements[0] : null);

  // User current stats
  const currentWeight = latestM?.weight ?? (userProfile?.weight ? Number(userProfile.weight) : 185);
  const startWeight = firstM?.weight ?? currentWeight;
  const weightChange = currentWeight - startWeight;
  const goalWeight = userProfile?.goalWeight ?? 175;

  const heightInches = userProfile?.height || 70;
  const heightFormatted = userProfile?.heightUnit === 'cm' 
    ? `${Math.round(heightInches * 2.54)} cm`
    : `${Math.floor(heightInches / 12)}'${Math.round(heightInches % 12)}"`;

  const ageDisplay = userProfile?.age || '32';
  const lengthUnit = userProfile?.bodyMeasurements?.units?.length || 'in';

  // Compute Habit & Compliance data
  const totalDays = Math.max(1, filteredLogs.length);
  const workoutsCompleted = filteredLogs.reduce((acc, l) => acc + (l.completedWorkouts || 0), 0);
  const waterTargetDays = filteredLogs.filter(l => l.water >= (l.waterGoal || 2000)).length;
  const stepsTargetDays = filteredLogs.filter(l => l.steps >= (l.stepGoal || 10000)).length;

  const waterCompliance = Math.round((waterTargetDays / totalDays) * 100);
  const stepCompliance = Math.round((stepsTargetDays / totalDays) * 100);

  // Meal Plan Compliance Calculation
  const daysWithMealsLogged = filteredLogs.filter(l => l.meals && l.meals.some(m => m.completed)).length;
  const totalCompletedMeals = filteredLogs.reduce((acc, l) => acc + (l.meals?.filter(m => m.completed)?.length || 0), 0);
  const totalTargetMeals = filteredLogs.reduce((acc, l) => acc + (l.meals?.length || 4), 0);
  const mealCompliance = Math.round((totalCompletedMeals / Math.max(1, totalTargetMeals)) * 100);

  // Walk Tracking Calculation (Low Intensity Zone 2 Walk)
  const walkSessionsCompleted = filteredLogs.filter(l => {
    const notes = (l.generalNotes || '').toLowerCase();
    const mainWork = (l.manualWorkout?.mainWork || '').toLowerCase();
    const focus = (l.manualWorkout?.focus || '').toLowerCase();
    const warmup = (l.manualWorkout?.warmUp || '').toLowerCase();
    return notes.includes('walk') || mainWork.includes('walk') || focus.includes('walk') || warmup.includes('walk') || (l.steps && l.steps >= 6000);
  }).length;
  const walkTargetCount = Math.max(1, Math.round((days / 7) * 4));

  // Build lookup map for date -> mainWork lines across all available logs
  const dateToMainWorkLines: Record<string, string[]> = {};
  [...logs, ...allGymLogs].forEach(l => {
    if (l.date && l.manualWorkout?.mainWork && !dateToMainWorkLines[l.date]) {
      const lines = l.manualWorkout.mainWork
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      if (lines.length > 0) {
        dateToMainWorkLines[l.date] = lines;
      }
    }
  });

  const getExerciseTitleFromLog = (exId: string, l: DailyLog): string => {
    if (!exId) return '';
    if (exId.startsWith('warmup') || exId.startsWith('warmUp')) return '';

    let rawName = '';

    // Check if exId is indexed e.g. main-0, mainWork-1, etc.
    const indexMatch = exId.match(/^(?:mainWork|main)-(\d+)$/i);
    if (indexMatch) {
      const idx = parseInt(indexMatch[1], 10);
      const lines = l.manualWorkout?.mainWork
        ? l.manualWorkout.mainWork.split('\n').map(s => s.trim()).filter(Boolean)
        : dateToMainWorkLines[l.date];

      if (lines && lines[idx]) {
        rawName = lines[idx];
      }
    }

    if (!rawName) {
      rawName = exId.replace(/^(?:mainWork|main)-/i, '').replace(/-\d+$/, '').replace(/_/g, ' ');
    }

    return cleanExerciseName(rawName);
  };

  // Collect exercises from ALL main workouts & logged data (WARMUPS & UNTRACKABLES EXCLUDED)
  const exerciseProgressMap: Record<string, { 
    startWeight: number; 
    maxWeight: number; 
    dates: string[];
    source?: string;
  }> = {};

  // Parse prescribed exercises from manual workouts in logs
  filteredLogs.forEach(l => {
    if (l.manualWorkout && l.manualWorkout.mainWork) {
      const lines = l.manualWorkout.mainWork.split('\n');
      lines.forEach(line => {
        const name = cleanExerciseName(line);
        if (name && !isUntrackableExercise(name)) {
          if (!exerciseProgressMap[name]) {
            exerciseProgressMap[name] = { startWeight: 0, maxWeight: 0, dates: [l.date] };
          }
        }
      });
    }

    if (l.workoutData) {
      Object.entries(l.workoutData).forEach(([exId, data]) => {
        const exName = getExerciseTitleFromLog(exId, l);
        if (!exName || isUntrackableExercise(exName)) return;

        let maxW = Number(data.weight) || 0;
        let minW = maxW > 0 ? maxW : 0;

        if (data.setRows && Array.isArray(data.setRows)) {
          data.setRows.forEach(sr => {
            const w = Number(sr.weight) || 0;
            if (w > maxW) maxW = w;
            if (w > 0 && (minW === 0 || w < minW)) minW = w;
          });
        }

        if (!exerciseProgressMap[exName]) {
          exerciseProgressMap[exName] = { 
            startWeight: minW, 
            maxWeight: maxW, 
            dates: [l.date]
          };
        } else {
          if (minW > 0 && (exerciseProgressMap[exName].startWeight === 0 || minW < exerciseProgressMap[exName].startWeight)) {
            exerciseProgressMap[exName].startWeight = minW;
          }
          if (maxW > exerciseProgressMap[exName].maxWeight) {
            exerciseProgressMap[exName].maxWeight = maxW;
          }
          if (!exerciseProgressMap[exName].dates.includes(l.date)) {
            exerciseProgressMap[exName].dates.push(l.date);
          }
        }
      });
    }
  });

  const gymHubRangeOptions = [
    { id: '12-week', label: '12-Week Transformation Range', days: 84, description: 'Last 12 Weeks (84 Days)' },
    { id: '8-week', label: '8-Week Transformation Range', days: 56, description: 'Last 8 Weeks (56 Days)' },
    { id: '4-week', label: '4-Week Cycle Range', days: 28, description: 'Last 4 Weeks (28 Days)' },
    { id: 'monthly', label: 'Monthly Transformation Range', days: 30, description: 'Current Month / 30 Days' },
    { id: 'full-year', label: '1-Year History Range', days: 365, description: 'Last 365 Days' },
    { id: 'all-history', label: 'All Recorded Gym Hub History', days: 99999, description: 'Complete Record On File' },
  ];

  const getLogsForRangeOption = (rangeId: string) => {
    const rangeOpt = gymHubRangeOptions.find(r => r.id === rangeId);
    if (!rangeOpt) return [];
    
    let cutoffStr = '1970-01-01';
    if (rangeOpt.days < 9999) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - rangeOpt.days);
      cutoffStr = cutoff.toISOString().slice(0, 10);
    }

    return allGymLogs.filter(l => l.date <= todayStr && l.date >= cutoffStr);
  };

  // Merge selected previous Gym Hub range data
  const selectedRangeLogsMap = new Map<string, DailyLog>();
  selectedGymRangeIds.forEach(rangeId => {
    const rangeLogs = getLogsForRangeOption(rangeId);
    rangeLogs.forEach(l => {
      const key = l.id || l.date;
      if (!selectedRangeLogsMap.has(key)) {
        selectedRangeLogsMap.set(key, l);
      }
    });
  });

  const selectedGymRangeLogs = Array.from(selectedRangeLogsMap.values());

  selectedGymRangeLogs.forEach(l => {
    if (l.manualWorkout && l.manualWorkout.mainWork) {
      const lines = l.manualWorkout.mainWork.split('\n');
      lines.forEach(line => {
        const name = cleanExerciseName(line);
        if (name && !isUntrackableExercise(name)) {
          if (!exerciseProgressMap[name]) {
            exerciseProgressMap[name] = { 
              startWeight: 0, 
              maxWeight: 0, 
              dates: [l.date],
              source: `Gym Hub History (${l.date})`
            };
          }
        }
      });
    }

    if (l.workoutData) {
      Object.entries(l.workoutData).forEach(([exId, data]) => {
        const exName = getExerciseTitleFromLog(exId, l);
        if (!exName || isUntrackableExercise(exName)) return;

        let maxW = Number(data.weight) || 0;
        let minW = maxW > 0 ? maxW : 0;

        if (data.setRows && Array.isArray(data.setRows)) {
          data.setRows.forEach(sr => {
            const w = Number(sr.weight) || 0;
            if (w > maxW) maxW = w;
            if (w > 0 && (minW === 0 || w < minW)) minW = w;
          });
        }

        if (!exerciseProgressMap[exName]) {
          exerciseProgressMap[exName] = { 
            startWeight: minW, 
            maxWeight: maxW, 
            dates: [l.date],
            source: `Gym Hub History (${l.date})`
          };
        } else {
          if (minW > 0 && (exerciseProgressMap[exName].startWeight === 0 || minW < exerciseProgressMap[exName].startWeight)) {
            exerciseProgressMap[exName].startWeight = minW;
          }
          if (maxW > exerciseProgressMap[exName].maxWeight) {
            exerciseProgressMap[exName].maxWeight = maxW;
          }
          if (!exerciseProgressMap[exName].dates.includes(l.date)) {
            exerciseProgressMap[exName].dates.push(l.date);
          }
        }
      });
    }
  });

  const exerciseProgressList = Object.entries(exerciseProgressMap).map(([name, stat]) => {
    const start = stat.startWeight;
    const max = stat.maxWeight;
    const diff = max - start;
    const pct = start > 0 ? ((diff / start) * 100).toFixed(1) : '0';
    return {
      name,
      startWeight: start,
      maxWeight: max,
      diff,
      pct,
      source: stat.source
    };
  }).sort((a, b) => b.maxWeight - a.maxWeight);

  // Recommendations based on goals & progress
  const recommendations = (() => {
    const goal = (userProfile?.goals || 'Recomposition').toLowerCase();
    const recs: string[] = [];

    if (goal.includes('fat loss') || goal.includes('weight loss')) {
      recs.push(`Maintain a steady calorie deficit while keeping protein at 1.0g per lb of target body weight (${goalWeight}g protein/day).`);
      if (stepCompliance < 80) recs.push(`Increase daily movement consistency to reach your 10,000 steps target (currently at ${stepCompliance}% compliance).`);
      else recs.push(`Step compliance is strong (${stepCompliance}%). Focus on progressive overload in compound lifts.`);
    } else if (goal.includes('muscle') || goal.includes('hypertrophy') || goal.includes('bulk')) {
      recs.push(`Ensure a modest calorie surplus with prioritized protein intake to support lean muscle hypertrophy.`);
      recs.push(`Focus on increasing weights or reps on primary lifts each week to maintain high strain stimulus.`);
    } else {
      recs.push(`Body recomposition strategy: Maintain balanced macros with high protein and structured strength sessions.`);
      recs.push(`Focus on consistent sleep (7-8 hours) and optimal hydration for maximum recovery efficiency.`);
    }

    if (waterCompliance < 75) {
      recs.push(`Hydration compliance is at ${waterCompliance}%. Aim for at least 3 liters of water daily to support metabolic function.`);
    }

    if (mealCompliance < 75) {
      recs.push(`Meal plan logging compliance is at ${mealCompliance}%. Consistent meal tracking ensures exact macro precision.`);
    }

    return recs;
  })();

  const handlePrintReport = () => {
    window.print();
  };

  const handleSaveToHistory = async () => {
    if (!userProfile) return;
    setSavingReport(true);
    try {
      const timeframeTitle = timeframe === 'weekly' ? 'Weekly Progress Report' :
                             timeframe === '4-week' ? '4-Week Progress Report' :
                             timeframe === '8-week' ? '8-Week Progress Report' :
                             timeframe === '12-week' ? '12-Week Progress Report' :
                             timeframe === 'full' ? 'Full Program Transformation Report' :
                             'Monthly Transformation Report';

      const formattedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const mockAssessment = {
        reportType: `${timeframeTitle} • ${formattedDate}`,
        toplineSummary: `${timeframeTitle} generated on ${formattedDate}. Net weight change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} ${weightUnit}. Workouts completed: ${workoutsCompleted}. Meal compliance: ${mealCompliance}%. Hydration target: ${waterCompliance}%. Steps compliance: ${stepCompliance}%.`,
        toplineRatings: [
          { category: 'Workout Consistency', rating: Math.min(10, Math.max(1, Math.round((workoutsCompleted / Math.max(1, days / 2)) * 10))), evaluation: `${workoutsCompleted} completed sessions over ${days} days.` },
          { category: 'Hydration Target', rating: Math.min(10, Math.max(1, Math.round(waterCompliance / 10))), evaluation: `${waterCompliance}% target adherence.` },
          { category: 'Nutrition Compliance', rating: Math.min(10, Math.max(1, Math.round(mealCompliance / 10))), evaluation: `${mealCompliance}% meal plan compliance.` },
          { category: 'Daily Activity', rating: Math.min(10, Math.max(1, Math.round(stepCompliance / 10))), evaluation: `${stepCompliance}% step compliance.` }
        ],
        frontViewAnalysis: { ratings: [], summary: `Current Weight: ${currentWeight ? `${currentWeight} ${weightUnit}` : 'N/A'} (Net Change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} ${weightUnit}).` },
        leftViewAnalysis: { ratings: [], summary: 'Body circumference measurements tracked.' },
        backViewAnalysis: { ratings: [], summary: 'Exercise weight progression tracked.' },
        rightViewAnalysis: { ratings: [], summary: 'Habit & Macro Compliance.' },
        finalSummary: {
          ratings: [],
          nextSteps: recommendations
        },
        workoutPlan: { week: 1, phase: 'Progress Phase', days: [] },
        nutritionPlan: { targetCalories: '2,200', targetProtein: '180g', targetCarbs: '200g', targetFat: '65g', mealPlan: [] }
      };

      await historyService.saveReport(
        'progress',
        {
          name: userProfile.fullName || 'User',
          age: ageDisplay,
          sex: userProfile.sex || 'Male',
          height: heightFormatted,
          heightUnit: userProfile.heightUnit === 'cm' ? 'cm' : 'ftin',
          weight: `${currentWeight}`,
          weightUnit,
          location: userProfile.location || '',
          occupation: '',
          gymAccess: 'Full Gym',
          goals: userProfile.goals || 'Recomposition',
          eventFocus: '',
          physiqueStyle: 'Athletic',
          injuries: '',
          allergies: '',
          currentWorkout: '',
          caloriePreference: 'maintain',
          physicalActivity: 'Active',
          desiredPhysicalActivity: 'Very Active',
          syncToGymHub: true
        },
        mockAssessment as unknown as AssessmentResult,
        { front: userProfile.avatarUrl || null, back: null, left: null, right: null }
      );

      setSavedSuccess(true);
      if (onReportSaved) onReportSaved();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Error saving report", e);
    } finally {
      setSavingReport(false);
    }
  };

  const timeframeOptions = [
    { id: 'weekly' as ReportTimeframe, label: 'Weekly (7 Days)', shortLabel: 'Weekly' },
    { id: 'monthly' as ReportTimeframe, label: 'Monthly (Current Month)', shortLabel: 'Monthly (Current Month)' },
    { id: '4-week' as ReportTimeframe, label: '4-Week Cycle (28 Days)', shortLabel: '4-Week' },
    { id: '8-week' as ReportTimeframe, label: '8-Week Cycle (56 Days)', shortLabel: '8-Week' },
    { id: '12-week' as ReportTimeframe, label: '12-Week Cycle (84 Days)', shortLabel: '12-Week' },
    { id: 'full' as ReportTimeframe, label: 'Full Program (All Time)', shortLabel: 'Full Program' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <style>{`
        @media print {
          body, html { 
            background: #0A0A0A !important; 
            color: #FFFFFF !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .no-print { display: none !important; }
          .fixed { position: static !important; background: transparent !important; padding: 0 !important; }
          .max-h-\\[90vh\\] { max-height: none !important; overflow: visible !important; }
          .overflow-y-auto { overflow: visible !important; }
          .shadow-2xl, .shadow-xl, .shadow-md, .shadow-sm { box-shadow: none !important; }
          .my-8 { margin: 0 !important; }
          .max-w-4xl { max-width: 100% !important; width: 100% !important; }
          .bg-brand-surface, .bg-brand-dark {
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-brand-dark border border-white/10 rounded-3xl max-w-4xl w-full my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-brand-surface border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl">
              <FileText className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-tight">
                Transformation Progress Report
              </h2>
              <p className="text-xs text-gray-400">Comprehensive historical measurement & performance report</p>
            </div>
          </div>

          <div className="flex items-center gap-3 no-print">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-primary" />
              <span className="text-xs font-mono font-bold uppercase text-gray-300">Timeframe:</span>
            </div>

            {/* Selectable Dropdown */}
            <div className="relative">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as ReportTimeframe)}
                className="bg-brand-surface border border-white/15 text-white font-mono font-bold text-xs py-1.5 px-3 pr-8 rounded-xl appearance-none cursor-pointer focus:outline-none focus:border-brand-primary transition-all shadow-inner"
              >
                {timeframeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-brand-dark text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-brand-primary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Quick Pill Buttons */}
            <div className="hidden lg:flex items-center bg-brand-surface p-1 rounded-xl border border-white/10 gap-1">
              {timeframeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTimeframe(opt.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer whitespace-nowrap",
                    timeframe === opt.id 
                      ? "bg-brand-primary text-brand-dark font-black shadow-md shadow-brand-primary/20" 
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  {opt.shortLabel}
                </button>
              ))}
            </div>

            {/* Weight Measurement Unit Toggle (LBS / KGS) */}
            <div className="flex items-center bg-brand-surface p-1 rounded-xl border border-white/10 gap-1 ml-1">
              <Scale className="w-3.5 h-3.5 text-brand-primary ml-1" />
              <button
                type="button"
                onClick={() => setDisplayWeightUnit('lbs')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer",
                  displayWeightUnit === 'lbs' 
                    ? "bg-brand-primary text-brand-dark font-black shadow-sm" 
                    : "text-gray-400 hover:text-white"
                )}
              >
                LBS
              </button>
              <button
                type="button"
                onClick={() => setDisplayWeightUnit('kg')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer",
                  displayWeightUnit === 'kg' 
                    ? "bg-brand-primary text-brand-dark font-black shadow-sm" 
                    : "text-gray-400 hover:text-white"
                )}
              >
                KGS
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handlePrintReport}
              variant="outline"
              size="sm"
              className="bg-brand-surface border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl gap-2 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 text-brand-primary" /> Print / Export PDF
            </Button>

            <Button
              onClick={handleSaveToHistory}
              disabled={savingReport || savedSuccess}
              className="bg-brand-primary hover:bg-brand-primary/90 text-brand-dark font-bold text-xs rounded-xl gap-2 cursor-pointer shadow-md"
            >
              {savingReport ? (
                <>Saving...</>
              ) : savedSuccess ? (
                <><CheckCircle2 className="w-4 h-4 text-brand-dark" /> Saved!</>
              ) : (
                <><Save className="w-4 h-4" /> Save to History</>
              )}
            </Button>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-gray-500 font-mono text-sm">
              Analyzing metrics and building report...
            </div>
          ) : (
            <>
              {/* Profile Header Banner */}
              <Card className="p-6 bg-gradient-to-r from-brand-surface via-brand-surface to-brand-primary/10 border-white/10 rounded-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                  {/* Profile Picture */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-brand-primary/40 bg-black/60 shrink-0 flex items-center justify-center shadow-xl">
                    {userProfile?.avatarUrl ? (
                      <img 
                        src={userProfile.avatarUrl} 
                        alt="Profile avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-black text-2xl">
                        {userProfile?.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>

                  {/* Profile Key Stats */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h3 className="text-2xl font-display font-black text-white">
                        {userProfile?.fullName || 'Client Profile'}
                      </h3>
                      <span className="px-2.5 py-0.5 bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-[10px] font-mono font-bold uppercase rounded-full">
                        {timeframeOptions.find(o => o.id === timeframe)?.label || 'Progress Report'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-left">
                      <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
                        <span className="text-[9px] font-mono uppercase text-gray-500 block">Height & Age</span>
                        <span className="text-xs font-bold text-white font-mono">{heightFormatted} • {ageDisplay} yrs</span>
                      </div>
                      <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
                        <span className="text-[9px] font-mono uppercase text-gray-500 block">Current Weight</span>
                        <span className="text-xs font-bold text-brand-primary font-mono">{formatWeightVal(currentWeight)} {displayWeightUnit}</span>
                      </div>
                      <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
                        <span className="text-[9px] font-mono uppercase text-gray-500 block">Target Weight</span>
                        <span className="text-xs font-bold text-white font-mono">{formatWeightVal(goalWeight)} {displayWeightUnit}</span>
                      </div>
                      <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
                        <span className="text-[9px] font-mono uppercase text-gray-500 block">Net Change</span>
                        <span className={cn(
                          "text-xs font-bold font-mono",
                          weightChange < 0 ? "text-emerald-400" : weightChange > 0 ? "text-amber-400" : "text-gray-300"
                        )}>
                          {weightChange > 0 ? `+${formatWeightVal(weightChange)}` : formatWeightVal(weightChange)} {displayWeightUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Previous Gym Hub Range Selector */}
              <div className="space-y-3 no-print">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-purple-400" />
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                      Include Data from Gym Hub Transformation Ranges (Multi-Select)
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                    {selectedGymRangeIds.length} Range(s) Selected
                  </span>
                </div>

                <Card className="p-4 bg-brand-surface border-white/5 rounded-2xl">
                  {allGymLogs.length === 0 ? (
                    <p className="text-xs text-gray-500 font-mono">No previous Gym Hub data found in your account history. Log workouts in Gym Hub to enable multi-range comparison.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {gymHubRangeOptions.map((option) => {
                        const isSelected = selectedGymRangeIds.includes(option.id);
                        const rangeLogs = getLogsForRangeOption(option.id);
                        const logsCount = rangeLogs.length;
                        const workoutsCount = rangeLogs.reduce((acc, l) => acc + (l.completedWorkouts || (l.workoutData || l.manualWorkout ? 1 : 0)), 0);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedGymRangeIds(selectedGymRangeIds.filter(id => id !== option.id));
                              } else {
                                setSelectedGymRangeIds([...selectedGymRangeIds, option.id]);
                              }
                            }}
                            className={cn(
                              "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5",
                              isSelected 
                                ? "bg-purple-500/15 border-purple-500/40 text-white shadow-md shadow-purple-500/10" 
                                : "bg-black/30 border-white/5 text-gray-400 hover:text-white hover:border-white/20"
                            )}
                          >
                            <div className="truncate flex-1">
                              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                                {option.label}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="text-purple-300 font-bold">{option.description}</span>
                                <span>•</span>
                                <span>{logsCount} Day Log(s) ({workoutsCount} Session(s))</span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                              isSelected ? "bg-purple-500 border-purple-400 text-white" : "border-white/20 bg-black/40"
                            )}>
                              {isSelected ? <Check className="w-3.5 h-3.5 text-white stroke-[3]" /> : <Plus className="w-3.5 h-3.5 text-gray-500" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>

              {/* Body Measurements & Net Changes Table */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-brand-primary" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                    Recorded Body Measurements & Changes
                  </h4>
                </div>

                <Card className="p-4 bg-brand-surface border-white/5 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-[10px] uppercase">
                        <th className="pb-3 font-bold">Measurement Site</th>
                        <th className="pb-3 font-bold text-center">Start Value</th>
                        <th className="pb-3 font-bold text-center">Latest Value</th>
                        <th className="pb-3 font-bold text-right">Net Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        { label: 'Weight', start: firstM?.weight, latest: latestM?.weight, isWeight: true },
                        { label: 'Body Fat %', start: firstM?.bodyFat, latest: latestM?.bodyFat, unit: '%' },
                        { label: 'Chest', start: firstM?.chest ?? userProfile?.bodyMeasurements?.chest, latest: latestM?.chest ?? userProfile?.bodyMeasurements?.chest, unit: lengthUnit },
                        { label: 'Waist', start: firstM?.waist ?? userProfile?.bodyMeasurements?.waist, latest: latestM?.waist ?? userProfile?.bodyMeasurements?.waist, unit: lengthUnit },
                        { label: 'Left Arm', start: firstM?.leftArm ?? userProfile?.bodyMeasurements?.leftArm, latest: latestM?.leftArm ?? userProfile?.bodyMeasurements?.leftArm, unit: lengthUnit },
                        { label: 'Right Arm', start: firstM?.rightArm ?? userProfile?.bodyMeasurements?.rightArm, latest: latestM?.rightArm ?? userProfile?.bodyMeasurements?.rightArm, unit: lengthUnit },
                        { label: 'Left Thigh', start: firstM?.leftThigh ?? userProfile?.bodyMeasurements?.leftThigh, latest: latestM?.leftThigh ?? userProfile?.bodyMeasurements?.leftThigh, unit: lengthUnit },
                        { label: 'Right Thigh', start: firstM?.rightThigh ?? userProfile?.bodyMeasurements?.rightThigh, latest: latestM?.rightThigh ?? userProfile?.bodyMeasurements?.rightThigh, unit: lengthUnit },
                        { label: 'Neck', start: firstM?.neck ?? userProfile?.bodyMeasurements?.neck, latest: latestM?.neck ?? userProfile?.bodyMeasurements?.neck, unit: lengthUnit },
                      ].map((site) => {
                        const sVal = site.start !== undefined ? Number(site.start) : null;
                        const lVal = site.latest !== undefined ? Number(site.latest) : null;
                        const diff = (sVal !== null && lVal !== null) ? (lVal - sVal) : null;
                        const unitDisplay = site.isWeight ? displayWeightUnit : site.unit;

                        return (
                          <tr key={site.label} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 font-bold text-gray-200">{site.label}</td>
                            <td className="py-2.5 text-center text-gray-400">
                              {sVal !== null ? (site.isWeight ? `${formatWeightVal(sVal)} ${unitDisplay}` : `${sVal.toFixed(1)} ${unitDisplay}`) : '--'}
                            </td>
                            <td className="py-2.5 text-center text-white font-bold">
                              {lVal !== null ? (site.isWeight ? `${formatWeightVal(lVal)} ${unitDisplay}` : `${lVal.toFixed(1)} ${unitDisplay}`) : '--'}
                            </td>
                            <td className="py-2.5 text-right font-bold">
                              {diff !== null ? (
                                <span className={diff < 0 ? "text-emerald-400" : diff > 0 ? "text-amber-400" : "text-gray-400"}>
                                  {diff > 0 ? `+` : ''}{site.isWeight ? formatWeightVal(diff) : diff.toFixed(1)} {unitDisplay}
                                </span>
                              ) : '--'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </div>

              {/* Single Exercise Progression Comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-purple-400" />
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                      Single Exercise Data & Weight Progression
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                    {exerciseProgressList.length} Single Exercises Tracked
                  </span>
                </div>

                <Card className="p-4 bg-brand-surface border-white/5 rounded-2xl">
                  {exerciseProgressList.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-xs font-mono">
                      No trackable single weight exercises found in this timeframe. Log workout sets in Gym Hub to populate progression metrics.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-white/10 text-gray-400 text-[10px] uppercase">
                              <th className="pb-3 px-2 font-bold text-left min-w-[140px]">Exercise Title</th>
                              <th className="pb-3 px-2 font-bold text-center">Initial Weight</th>
                              <th className="pb-3 px-2 font-bold text-center">Latest Max</th>
                              <th className="pb-3 px-2 font-bold text-right">Progression & Difference</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {exerciseProgressList.map((ex) => (
                              <tr key={ex.name} className="hover:bg-white/[0.02]">
                                <td className="py-3.5 px-2 font-bold text-white capitalize text-xs">
                                  {ex.name}
                                </td>
                                <td className="py-3.5 px-2 text-center text-gray-300 font-bold whitespace-nowrap">
                                  {ex.startWeight > 0 ? `${formatWeightVal(ex.startWeight)} ${displayWeightUnit}` : '--'}
                                </td>
                                <td className="py-3.5 px-2 text-center text-brand-primary font-bold whitespace-nowrap">
                                  {ex.maxWeight > 0 ? `${formatWeightVal(ex.maxWeight)} ${displayWeightUnit}` : '--'}
                                </td>
                                <td className="py-3.5 px-2 text-right whitespace-nowrap">
                                  {ex.diff > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                      <TrendingUp className="w-3 h-3 shrink-0" />
                                      +{formatWeightVal(ex.diff)} {displayWeightUnit} (+{ex.pct}%)
                                    </span>
                                  ) : ex.maxWeight > 0 && ex.diff === 0 ? (
                                    <span className="text-gray-400 font-bold">
                                      Maintained ({formatWeightVal(ex.maxWeight)} {displayWeightUnit})
                                    </span>
                                  ) : ex.diff < 0 ? (
                                    <span className="text-amber-400 font-bold">
                                      {formatWeightVal(ex.diff)} {displayWeightUnit} ({ex.pct}%)
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 text-[10px]">
                                      No logged sets
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Habit Tracking & Compliance Metrics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                    Habit Tracking & Target Adherence
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
                  <Card className="p-4 bg-brand-surface border-white/5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-400">Workout Sessions</span>
                    <div className="text-2xl font-black text-white">{workoutsCompleted}</div>
                    <p className="text-[10px] text-gray-500 font-mono">Completed sessions in timeframe</p>
                  </Card>

                  {/* Dedicated Low Intensity Zone 2 Walk Tracking Box */}
                  <Card className="p-4 bg-brand-surface border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-brand-surface to-transparent rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1">
                        <Footprints className="w-3.5 h-3.5 text-emerald-400" /> Walk Tracking
                      </span>
                    </div>
                    <div className="text-xl font-black text-emerald-400">
                      {walkSessionsCompleted}/{walkTargetCount} Completed
                    </div>
                    <p className="text-[10px] text-gray-300 font-mono leading-tight pt-1">
                      Low intensity Zone 2 walk - {walkSessionsCompleted}/{walkTargetCount} completed
                    </p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round((walkSessionsCompleted / walkTargetCount) * 100))}%` }} 
                      />
                    </div>
                  </Card>

                  {/* Dedicated Meal Plan Compliance Box */}
                  <Card className="p-4 bg-brand-surface border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-brand-surface to-transparent rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
                        <Utensils className="w-3.5 h-3.5 text-amber-400" /> Meal Compliance
                      </span>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-mono font-bold rounded-full border border-amber-500/20">
                        {daysWithMealsLogged}/{totalDays} Days
                      </span>
                    </div>
                    <div className="text-2xl font-black text-amber-400">{mealCompliance}%</div>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {totalCompletedMeals} / {totalTargetMeals} meals logged
                    </p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, mealCompliance)}%` }} 
                      />
                    </div>
                  </Card>

                  <Card className="p-4 bg-brand-surface border-white/5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-400">Hydration Compliance</span>
                    <div className="text-2xl font-black text-blue-400">{waterCompliance}%</div>
                    <p className="text-[10px] text-gray-500 font-mono">Met daily goal ({waterTargetDays}/{totalDays} days)</p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-blue-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, waterCompliance)}%` }} 
                      />
                    </div>
                  </Card>

                  <Card className="p-4 bg-brand-surface border-white/5 rounded-2xl space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-400">Movement / Steps</span>
                    <div className="text-2xl font-black text-emerald-400">{stepCompliance}%</div>
                    <p className="text-[10px] text-gray-500 font-mono">Met step goal ({stepsTargetDays}/{totalDays} days)</p>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, stepCompliance)}%` }} 
                      />
                    </div>
                  </Card>
                </div>
              </div>

              {/* Recommendations Area */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                    Status & Goal Recommendations
                  </h4>
                </div>

                <Card className="p-5 bg-gradient-to-br from-amber-500/10 via-brand-surface to-brand-surface border-amber-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                    <Award className="w-4 h-4" /> Customized Plan Adjustments
                  </div>
                  <ul className="space-y-2 text-xs text-gray-200">
                    {recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              {/* Safety & Medical Disclaimer */}
              <Card className="p-5 bg-red-500/5 border-red-500/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-mono font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4" /> Safety & Medical Disclaimer
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  This report is for informational, educational, and self-tracking purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a licensed physician or qualified healthcare provider before beginning any exercise, nutrition, or physical training regimen. Discontinue physical activity immediately if you experience pain, dizziness, or chest discomfort.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

