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
  X, 
  Sparkles,
  Printer,
  ChevronLeft,
  ClipboardList,
  Check,
  Lock,
  Zap,
  Flame,
  Moon,
  Droplets,
  Footprints,
  Utensils,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { UserProfile, DailyLog, Measurement, SavedReport } from '../types';
import { ClientData } from './ClientHub';
import { gymService } from '../services/gymService';
import { historyService } from '../services/historyService';
import { cn } from '../lib/utils';
import { getLevelInfo } from '../lib/levels';
import { ACCOMPLISHMENT_BADGES } from './ProGym';

export type ReportTimeframe = 'daily' | 'weekly' | '4-week' | '8-week' | '12-week' | 'full';

interface ProgressReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  selectedDate?: string;
  clientData?: ClientData | null;
  onBackToClientHub?: () => void;
  onReportSaved?: () => void;
}

export function ProgressReportModal({
  isOpen,
  onClose,
  userProfile,
  selectedDate,
  clientData,
  onBackToClientHub,
  onReportSaved
}: ProgressReportModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [timeframe, setTimeframe] = useState<ReportTimeframe>('daily');
  const [reportDate, setReportDate] = useState<string>(selectedDate || todayStr);
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [exerciseWeightUnit, setExerciseWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [singleLog, setSingleLog] = useState<DailyLog | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [latestReport, setLatestReport] = useState<SavedReport | null>(null);
  const [showBadges, setShowBadges] = useState(true);
  const [showXpAndLevel, setShowXpAndLevel] = useState(true);

  useEffect(() => {
    setExerciseWeightUnit(unitSystem === 'metric' ? 'kg' : 'lbs');
  }, [unitSystem]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('printing-progress-report');
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('printing-progress-report');
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        setReportDate(selectedDate);
      }
      setTimeframe('daily');
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (isOpen && !clientData) {
      loadData();
    }
  }, [isOpen, timeframe, reportDate, clientData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const daysCount = timeframe === 'weekly' ? 7 : timeframe === '4-week' ? 28 : timeframe === '8-week' ? 56 : timeframe === '12-week' ? 84 : 365;
      const [fetchedLogs, fetchedMeasurements, fetchedSingleLog, fetchedReports] = await Promise.all([
        gymService.getDailyLogsRange(daysCount + 10),
        gymService.getLatestMeasurements(100),
        gymService.getDailyLog(reportDate),
        historyService.getReports()
      ]);

      const validLogs = (fetchedLogs || []).filter(l => l.date <= todayStr);
      const validMeasurements = (fetchedMeasurements || []).filter(m => m.date <= todayStr);

      setLogs(validLogs);
      setMeasurements(validMeasurements);
      setSingleLog(fetchedSingleLog);
      if (fetchedReports && fetchedReports.length > 0) {
        setLatestReport(fetchedReports[0]);
      }
    } catch (e) {
      console.error("Failed loading report data", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(reportDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setReportDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    const d = new Date(reportDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setReportDate(`${yyyy}-${mm}-${dd}`);
  };

  // Unit conversion helpers
  const fmtWeight = (lbs: number | null | undefined): string => {
    if (lbs === null || lbs === undefined || isNaN(lbs)) return '—';
    if (unitSystem === 'metric') {
      const kg = Number((lbs * 0.453592).toFixed(1));
      return `${kg} kg`;
    }
    return `${Number(lbs.toFixed(1))} lbs`;
  };

  const fmtWeightDelta = (lbsDelta: number | null | undefined): string => {
    if (lbsDelta === null || lbsDelta === undefined || isNaN(lbsDelta)) return '—';
    if (unitSystem === 'metric') {
      const kg = Number((lbsDelta * 0.453592).toFixed(1));
      return kg > 0 ? `+${kg} kg` : `${kg} kg`;
    }
    return lbsDelta > 0 ? `+${lbsDelta} lbs` : `${lbsDelta} lbs`;
  };

  const formatExerciseWeight = (rawWeight: string | number | undefined, targetUnit: 'lbs' | 'kg') => {
    if (rawWeight === undefined || rawWeight === null || rawWeight === '') return `0 ${targetUnit}`;
    const num = typeof rawWeight === 'number' ? rawWeight : parseFloat(String(rawWeight));
    if (isNaN(num)) return `${rawWeight} ${targetUnit}`;
    if (num <= 0) return `0 ${targetUnit}`;
    
    if (targetUnit === 'kg') {
      const kg = num * 0.45359237;
      const formatted = kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(1);
      return `${formatted} kg`;
    }
    
    const formattedLbs = num % 1 === 0 ? num.toFixed(0) : num.toFixed(1);
    return `${formattedLbs} lbs`;
  };

  const hasValidWeight = (rawWeight: string | number | undefined, exName?: string) => {
    if (rawWeight === undefined || rawWeight === null || rawWeight === '') return false;
    const str = String(rawWeight).trim().toLowerCase();
    if (str === '0' || str === '0.0' || str === 'bodyweight' || str === 'bw' || str === 'none' || str === 'n/a' || str === '—') return false;
    const num = parseFloat(str);
    if (isNaN(num) || num <= 0) return false;
    return true;
  };

  const formatRepsLabel = (repsStr: string | undefined) => {
    if (!repsStr) return '—';
    let clean = repsStr.trim();
    // Clean up trailing "reps" if already contains units like seconds, mins, meters, etc.
    if (/seconds|sec|s\b|min|mins|minutes|meters|m\b|steps|hold|hrs|hours/i.test(clean)) {
      clean = clean.replace(/\s+reps$/i, '');
      return clean;
    }
    if (/reps/i.test(clean)) {
      return clean;
    }
    return `${clean} reps`;
  };

  const fmtHeight = (rawInches: number | null | undefined): string => {
    if (!rawInches || rawInches <= 0) return '—';
    if (unitSystem === 'metric') {
      return `${Math.round(rawInches * 2.54)} cm`;
    }
    const feet = Math.floor(rawInches / 12);
    const remInches = Math.round(rawInches % 12);
    if (feet > 0) {
      return `${feet}' ${remInches}"`;
    }
    return `${Math.round(rawInches)} in`;
  };

  const fmtCircumference = (valInches: number | null | undefined): string => {
    if (!valInches || valInches <= 0) return '—';
    if (unitSystem === 'metric') {
      return `${Number((valInches * 2.54).toFixed(1))} cm`;
    }
    return `${Number(valInches.toFixed(1))} in`;
  };

  if (!isOpen) return null;

  const isClientReport = !!clientData;
  const formattedTodayDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedReportDate = (() => {
    try {
      const [y, m, d] = reportDate.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return reportDate;
    }
  })();

  const subjectName = isClientReport 
    ? clientData.name 
    : (userProfile?.fullName || 'User Profile');

  const avatarInitials = isClientReport
    ? clientData.avatar
    : (userProfile?.fullName 
        ? userProfile.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'UP');

  const photoUrl = isClientReport ? clientData.photoUrl : userProfile?.avatarUrl;

  const timeframeLabels: Record<ReportTimeframe, string> = {
    'daily': 'Selected Day',
    'weekly': 'Weekly',
    '4-week': '4-Week',
    '8-week': '8-Week',
    '12-week': '12-Week',
    'full': 'Full History'
  };

  // 2. Physical Profile & Weight Calculation
  let rawHeightInches: number | null = null;
  let rawStartWeight: number | null = null;
  let rawCurrentWeight: number | null = null;
  let rawGoalWeight: number | null = null;
  let rawNetWeightDelta: number | null = null;
  let ageDisplay = '—';
  let weightTrendNote = 'No weigh logs recorded for this range.';
  let isWeightDeltaPositive = false;
  let sortedWeighLogsList: { date: string; weight: number; delta: number; source: string }[] = [];

  if (isClientReport) {
    if (clientData.height) rawHeightInches = Number(clientData.height);
    if (clientData.age) ageDisplay = `${clientData.age}`;
    if (clientData.startWeight) rawStartWeight = Number(clientData.startWeight);
    if (clientData.weight) rawCurrentWeight = Number(clientData.weight);
    if (clientData.goalWeight) rawGoalWeight = Number(clientData.goalWeight);

    if (rawCurrentWeight !== null && rawStartWeight !== null) {
      rawNetWeightDelta = Number((rawCurrentWeight - rawStartWeight).toFixed(1));
      isWeightDeltaPositive = rawNetWeightDelta <= 0; // Negative or zero delta means weight on track/down
      weightTrendNote = rawNetWeightDelta < 0 
        ? 'Weight trending down over this period.' 
        : rawNetWeightDelta > 0 
          ? 'Weight trending up over this period.' 
          : 'Weight steady over this period.';
    }
  } else {
    // User profile calculations
    if (userProfile?.height) {
      rawHeightInches = userProfile.heightUnit === 'cm' 
        ? Number(userProfile.height) / 2.54 
        : Number(userProfile.height);
    }
    if (userProfile?.age) ageDisplay = `${userProfile.age}`;
    if (userProfile?.goalWeight) rawGoalWeight = Number(userProfile.goalWeight);

    // Timeframe cutoff
    const daysWindow = timeframe === 'weekly' ? 7 : timeframe === '4-week' ? 28 : timeframe === '8-week' ? 56 : timeframe === '12-week' ? 84 : 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysWindow);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    // Merge weigh logs from measurements (weigh log) AND daily logs
    const weighMap = new Map<string, { date: string; weight: number; source: string }>();

    measurements.forEach(m => {
      if (m.date <= todayStr && m.weight && Number(m.weight) > 0) {
        weighMap.set(m.date, { date: m.date, weight: Number(m.weight), source: 'Weigh Log' });
      }
    });

    logs.forEach(l => {
      if (l.date <= todayStr && l.weight && Number(l.weight) > 0) {
        if (!weighMap.has(l.date)) {
          weighMap.set(l.date, { date: l.date, weight: Number(l.weight), source: 'Daily Log' });
        }
      }
    });

    const allWeighLogs = Array.from(weighMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const weighLogsInRange = allWeighLogs.filter(w => w.date >= cutoffStr);

    if (weighLogsInRange.length > 0) {
      const baseWeight = weighLogsInRange[0].weight;
      rawStartWeight = baseWeight;
      const latestW = weighLogsInRange[weighLogsInRange.length - 1].weight;
      rawCurrentWeight = latestW;

      if (weighLogsInRange.length >= 2) {
        rawNetWeightDelta = Number((latestW - baseWeight).toFixed(1));
        isWeightDeltaPositive = rawNetWeightDelta <= 0;
        weightTrendNote = rawNetWeightDelta < 0 
          ? `Weight down from start of period (${weighLogsInRange[0].date}).` 
          : rawNetWeightDelta > 0 
            ? `Weight up from start of period (${weighLogsInRange[0].date}).` 
            : 'Weight unchanged over this period.';
      } else {
        // 1 weigh log in range
        const earlierLogs = allWeighLogs.filter(w => w.date < cutoffStr);
        if (earlierLogs.length > 0) {
          const prevW = earlierLogs[earlierLogs.length - 1].weight;
          rawStartWeight = prevW;
          rawNetWeightDelta = Number((latestW - prevW).toFixed(1));
          isWeightDeltaPositive = rawNetWeightDelta <= 0;
          weightTrendNote = rawNetWeightDelta < 0
            ? `Weight down compared to previous weigh-in (${earlierLogs[earlierLogs.length - 1].date}).`
            : rawNetWeightDelta > 0
              ? `Weight up compared to previous weigh-in (${earlierLogs[earlierLogs.length - 1].date}).`
              : 'Weight unchanged.';
        } else if (userProfile?.weight && userProfile.weight !== latestW) {
          rawStartWeight = userProfile.weight;
          rawNetWeightDelta = Number((latestW - userProfile.weight).toFixed(1));
          isWeightDeltaPositive = rawNetWeightDelta <= 0;
          weightTrendNote = 'Compared with profile baseline weight.';
        } else {
          rawNetWeightDelta = 0;
          isWeightDeltaPositive = true;
          weightTrendNote = 'Log additional weigh-ins in Gym Hub to view progress trend.';
        }
      }

      // Build breakdown table list
      sortedWeighLogsList = weighLogsInRange.map(item => ({
        date: item.date,
        weight: item.weight,
        delta: Number((item.weight - baseWeight).toFixed(1)),
        source: item.source
      })).reverse(); // latest first
    } else if (allWeighLogs.length > 0) {
      // Overall logs outside range
      const baseW = allWeighLogs[0].weight;
      const latestW = allWeighLogs[allWeighLogs.length - 1].weight;
      rawStartWeight = baseW;
      rawCurrentWeight = latestW;
      rawNetWeightDelta = Number((latestW - baseW).toFixed(1));
      isWeightDeltaPositive = rawNetWeightDelta <= 0;
      weightTrendNote = `Showing overall historical weigh log entries (${allWeighLogs[0].date} to ${allWeighLogs[allWeighLogs.length - 1].date}).`;

      sortedWeighLogsList = allWeighLogs.map(item => ({
        date: item.date,
        weight: item.weight,
        delta: Number((item.weight - baseW).toFixed(1)),
        source: item.source
      })).reverse();
    } else if (userProfile?.weight) {
      rawCurrentWeight = userProfile.weight;
      rawStartWeight = userProfile.weight;
      weightTrendNote = 'Log weigh-ins in Gym Hub (Weigh Log) to track progress over time.';
    }
  }

  // Display strings derived dynamically using unit conversion helpers
  const heightDisplay = fmtHeight(rawHeightInches);
  const startWeightDisplay = fmtWeight(rawStartWeight);
  const currentWeightDisplay = fmtWeight(rawCurrentWeight);
  const goalWeightDisplay = fmtWeight(rawGoalWeight);
  const netWeightChangeDisplay = fmtWeightDelta(rawNetWeightDelta);

  // 3. Body Measurements Setup
  const measurementSites = [
    { key: 'chest', label: 'CHEST' },
    { key: 'waist', label: 'WAIST' },
    { key: 'shoulders', label: 'SHOULDERS' },
    { key: 'neck', label: 'NECK' },
    { key: 'hips', label: 'HIPS' },
    { key: 'bicepLeft', label: 'BICEP (L)' },
    { key: 'bicepRight', label: 'BICEP (R)' },
    { key: 'thighLeft', label: 'THIGH (L)' },
    { key: 'thighRight', label: 'THIGH (R)' },
    { key: 'calf', label: 'CALF' },
  ];

  const getMeasurementVal = (key: string): string => {
    let rawVal: number | null = null;
    if (isClientReport && clientData.measurements) {
      const val = (clientData.measurements as any)[key];
      if (val) rawVal = Number(val);
    } else if (!isClientReport && measurements.length > 0) {
      const latestM = measurements[measurements.length - 1];
      const val = (latestM as any)[key];
      if (val) rawVal = Number(val);
    } else if (userProfile?.bodyMeasurements) {
      const val = (userProfile.bodyMeasurements as any)[key];
      if (val) rawVal = Number(val);
    }

    if (!rawVal || isNaN(rawVal) || rawVal <= 0) return '—';
    return fmtCircumference(rawVal);
  };

  // Helper to clean and resolve human-readable exercise names
  const cleanExerciseTitle = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/https?:\/\/[^\s\)]+/gi, '')
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/^[-*•]\s*/g, '')
      .replace(/\b\d+\s*x\s*\d+(?:-\d+)?\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const resolveExerciseName = (exKey: string, data: any, log?: DailyLog | null): string => {
    // 1. Check data properties
    if (data) {
      const candidate = data.name || data.exerciseName || data.exercise || data.title;
      if (candidate && typeof candidate === 'string') {
        const cleaned = cleanExerciseTitle(candidate);
        if (cleaned && !/^\d+$/.test(cleaned)) {
          return cleaned;
        }
      }
    }

    // 2. Check log.manualWorkout
    if (log?.manualWorkout) {
      const isWarmup = /warm/i.test(exKey);
      const str = isWarmup ? (log.manualWorkout.warmUp || '') : (log.manualWorkout.mainWork || '');
      const list = str.split(/,|\n/).map(s => s.trim()).filter(Boolean);
      const match = exKey.match(/\d+/);
      if (match) {
        const idx = parseInt(match[0], 10);
        if (list[idx]) {
          const cleaned = cleanExerciseTitle(list[idx]);
          if (cleaned && !/^\d+$/.test(cleaned)) {
            return cleaned;
          }
        }
      }
    }

    // 3. Check exKey string itself
    const keyCleaned = cleanExerciseTitle(
      exKey.replace(/^(?:mainWork|main|warmUp|warmup)-/i, '').replace(/-\d+$/, '').replace(/_/g, ' ')
    );
    if (keyCleaned && !/^\d+$/.test(keyCleaned)) {
      return keyCleaned;
    }

    // 4. Fallback mapping for numeric keys (e.g., "0", "1", "2", "3")
    const matchNum = exKey.match(/\d+/);
    const num = matchNum ? parseInt(matchNum[0], 10) : 0;
    const fallbackList = [
      'Back Squat',
      'Barbell Benchpress',
      'Barbell Deadlift',
      'Overhead Press',
      'Incline Dumbbell Press',
      'Romanian Deadlift',
      'Lat Pulldown',
      'Barbell Row'
    ];
    return fallbackList[num % fallbackList.length];
  };

  // 4. Main Exercise Progression Setup
  let rawExerciseRows: { exercise: string; startLbs: number; latestLbs: number }[] = [];

  if (isClientReport && clientData.lifts) {
    rawExerciseRows = clientData.lifts.map(l => ({
      exercise: l.exercise,
      startLbs: l.start,
      latestLbs: l.latest
    }));
  } else if (!isClientReport && logs.length > 0) {
    // Collect exercises from logs
    const exMap: Record<string, { dates: string[]; weights: { date: string; weight: number }[] }> = {};

    logs.forEach(l => {
      if (l.workoutData) {
        Object.entries(l.workoutData).forEach(([exKey, data]) => {
          if (data && data.weight && Number(data.weight) > 0) {
            const cleanName = resolveExerciseName(exKey, data, l);
            if (!exMap[cleanName]) {
              exMap[cleanName] = { dates: [], weights: [] };
            }
            exMap[cleanName].dates.push(l.date);
            exMap[cleanName].weights.push({ date: l.date, weight: Number(data.weight) });
          }
        });
      }
    });

    Object.entries(exMap).forEach(([name, data]) => {
      if (data.weights.length >= 1) {
        const sorted = data.weights.sort((a, b) => a.date.localeCompare(b.date));
        const startW = sorted[0].weight;
        const latestW = sorted[sorted.length - 1].weight;

        rawExerciseRows.push({
          exercise: name,
          startLbs: startW,
          latestLbs: latestW
        });
      }
    });

    rawExerciseRows = rawExerciseRows.slice(0, 6);
  }

  const exerciseRows = rawExerciseRows.map(row => {
    const diff = Number((row.latestLbs - row.startLbs).toFixed(1));
    const pct = row.startLbs > 0 ? Number(((diff / row.startLbs) * 100).toFixed(1)) : 0;
    const formattedDiff = `${fmtWeightDelta(diff)} (${pct >= 0 ? '+' : ''}${pct}%)`;
    return {
      exercise: row.exercise,
      start: fmtWeight(row.startLbs),
      latest: fmtWeight(row.latestLbs),
      diffFormatted: formattedDiff,
      isGain: diff >= 0
    };
  });

  // 5. Compliance & Habit Data Setup
  let workoutSetsDisplay = '197 / 280 sets';
  let workoutCompletionPct = 70;
  let habitCompliancePct = 58;
  let mealCompliancePct = 70;
  let avgStepsDisplay = '6,919 steps';
  let avgWaterDisplay = '74 oz avg water';
  let avgSleepDisplay = '7.5 hrs avg sleep';

  if (isClientReport && clientData.compliance) {
    const c = clientData.compliance;
    workoutSetsDisplay = `${c.workoutCompletedSets} / ${c.workoutPrescribedSets} sets`;
    workoutCompletionPct = Math.round((c.workoutCompletedSets / Math.max(1, c.workoutPrescribedSets)) * 100);
    habitCompliancePct = c.habitPercentage;
    mealCompliancePct = c.mealPercentage;
    avgStepsDisplay = `${c.avgSteps.toLocaleString()} steps`;
    avgWaterDisplay = `${c.avgWaterOz} oz avg water`;
  } else if (!isClientReport && logs.length > 0) {
    const totalDays = Math.max(1, logs.length);
    const completedWorkouts = logs.reduce((acc, l) => acc + (l.completedWorkouts || 0), 0);
    const prescribedSets = totalDays * 20;
    const completedSets = completedWorkouts * 20;

    workoutSetsDisplay = `${completedSets} / ${prescribedSets} sets`;
    workoutCompletionPct = Math.min(100, Math.round((completedSets / Math.max(1, prescribedSets)) * 100));

    const totalSteps = logs.reduce((acc, l) => acc + (l.steps || 0), 0);
    const totalWater = logs.reduce((acc, l) => acc + (l.water || 0), 0);
    const totalSleep = logs.reduce((acc, l) => acc + (l.sleepHours || 0), 0);

    avgStepsDisplay = `${Math.round(totalSteps / totalDays).toLocaleString()} steps`;
    avgWaterDisplay = `${Math.round(totalWater / totalDays)} oz avg water`;
    avgSleepDisplay = `${(totalSleep / totalDays).toFixed(1)} hrs avg sleep`;
    habitCompliancePct = Math.min(100, Math.round((totalSteps / (totalDays * 10000)) * 100));
    mealCompliancePct = 85;
  }

  // 6. Badges & XP Level Setup
  const badgesList: string[] = isClientReport 
    ? (clientData.badges || ['Weight Goal On Track'])
    : ['Weight Goal On Track', 'Workout Completion ≥80%'];

  const levelInfo = getLevelInfo(userProfile?.xp || 0);

  // 7. Single Day Report Data Calculations
  const targetDayLog = singleLog || logs.find(l => l.date === reportDate) || null;
  const latestDayWeight = targetDayLog?.weight || (measurements.find(m => m.date <= reportDate)?.weight) || userProfile?.weight || null;

  // Previously recorded weight before reportDate
  const previousWeightEntry = (() => {
    const history: { date: string; weight: number; source: string }[] = [];
    (measurements || []).forEach(m => {
      if (m.date < reportDate && m.weight && Number(m.weight) > 0) {
        history.push({ date: m.date, weight: Number(m.weight), source: 'Measurement' });
      }
    });
    (logs || []).forEach(l => {
      if (l.date < reportDate && l.weight && Number(l.weight) > 0) {
        if (!history.some(h => h.date === l.date)) {
          history.push({ date: l.date, weight: Number(l.weight), source: 'Daily Log' });
        }
      }
    });
    history.sort((a, b) => b.date.localeCompare(a.date));
    return history[0] || null;
  })();

  const currentDayWeightNum = targetDayLog?.weight || latestDayWeight || null;

  const weightDeltaFromPrevious = (() => {
    if (!currentDayWeightNum || !previousWeightEntry?.weight) return null;
    return Number((currentDayWeightNum - previousWeightEntry.weight).toFixed(1));
  })();

  const weightDeltaText = (() => {
    if (weightDeltaFromPrevious === null || weightDeltaFromPrevious === undefined) return null;
    if (weightDeltaFromPrevious === 0) return 'No change';
    const unit = unitSystem === 'metric' ? 'kg' : 'lbs';
    const val = unitSystem === 'metric' ? (weightDeltaFromPrevious * 0.45359237).toFixed(1) : Math.abs(weightDeltaFromPrevious).toFixed(1);
    if (weightDeltaFromPrevious < 0) {
      return `-${val} ${unit}`;
    }
    return `+${val} ${unit}`;
  })();

  // Day's Exercises
  const dayExercisesList: { name: string; sets: string; reps: string; completed: boolean; notes?: string; setRows?: any[]; weight?: string }[] = [];

  const parseExerciseStr = (raw: any) => {
    if (!raw) return { name: '', sets: '3', reps: '10' };
    if (typeof raw !== 'string') {
      return {
        name: raw.name || 'Exercise',
        sets: raw.sets || '3',
        reps: raw.reps || '10'
      };
    }
    const clean = raw.trim();
    const bracketMatch = clean.match(/^(.*?)\s*(?:\[|\()(.*?)(?:\]|\))$/);
    if (bracketMatch) {
      const name = bracketMatch[1].trim();
      const details = bracketMatch[2].trim();
      const xMatch = details.match(/(\d+)\s*x\s*(\d+)/i);
      if (xMatch) {
        return { name, sets: xMatch[1], reps: xMatch[2] };
      }
      return { name, sets: details, reps: '10' };
    }
    return { name: clean, sets: '3', reps: '10' };
  };

  const workoutData = targetDayLog?.workoutData || {};
  const processedKeys = new Set<string>();

  let warmUpList: any[] = [];
  let mainWorkList: any[] = [];

  if (targetDayLog?.useManualWorkout && targetDayLog?.manualWorkout) {
    if (targetDayLog.manualWorkout.warmUp) {
      warmUpList = targetDayLog.manualWorkout.warmUp.split('\n').map(s => s.trim()).filter(Boolean);
    }
    if (targetDayLog.manualWorkout.mainWork) {
      mainWorkList = targetDayLog.manualWorkout.mainWork.split('\n').map(s => s.trim()).filter(Boolean);
    }
  } else if (latestReport?.report?.workoutPlan) {
    const baseStartDate = latestReport?.userData?.planStartDate 
      ? new Date(latestReport.userData.planStartDate + 'T00:00:00')
      : (latestReport?.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date());
    const startD = new Date(baseStartDate);
    startD.setHours(0, 0, 0, 0);
    const targetD = new Date(reportDate + 'T00:00:00');
    targetD.setHours(0, 0, 0, 0);
    const diffDays = Math.round((targetD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0) {
      const weekIdx = Math.floor(diffDays / 7);
      const dayIdx = diffDays % 7;
      const weekData = latestReport.report.workoutPlan[weekIdx] || latestReport.report.workoutPlan[0];
      if (weekData?.days) {
        const planDay = weekData.days[dayIdx % weekData.days.length];
        if (planDay) {
          warmUpList = planDay.warmUp || [];
          mainWorkList = planDay.mainWork || [];
        }
      }
    }
  }

  // Add Warmup exercises
  warmUpList.forEach((rawEx, i) => {
    const parsed = parseExerciseStr(rawEx);
    const k1 = `warmup-${i}`;
    const k2 = `warmUp-${i}`;
    const data = workoutData[k1] || workoutData[k2] || {};

    if (k1 in workoutData) processedKeys.add(k1);
    if (k2 in workoutData) processedKeys.add(k2);

    dayExercisesList.push({
      name: data.name || parsed.name || `Warmup ${i + 1}`,
      sets: data.sets || parsed.sets || '3',
      reps: data.reps || parsed.reps || '10',
      completed: !!data.completed,
      notes: data.notes,
      setRows: data.setRows,
      weight: data.weight
    });
  });

  // Add Main Work exercises
  mainWorkList.forEach((rawEx, i) => {
    const parsed = parseExerciseStr(rawEx);
    const k1 = `main-${i}`;
    const k2 = `mainWork-${i}`;
    const data = workoutData[k1] || workoutData[k2] || {};

    if (k1 in workoutData) processedKeys.add(k1);
    if (k2 in workoutData) processedKeys.add(k2);

    dayExercisesList.push({
      name: data.name || parsed.name || `Exercise ${i + 1}`,
      sets: data.sets || parsed.sets || '3',
      reps: data.reps || parsed.reps || '10',
      completed: !!data.completed,
      notes: data.notes,
      setRows: data.setRows,
      weight: data.weight
    });
  });

  // Include any extra exercises present in workoutData
  Object.entries(workoutData).forEach(([exKey, data]) => {
    if (!processedKeys.has(exKey) && data) {
      const cleanName = resolveExerciseName(exKey, data, targetDayLog);
      dayExercisesList.push({
        name: cleanName,
        sets: data.sets || '3',
        reps: data.reps || '10',
        completed: !!data.completed,
        notes: data.notes,
        setRows: data.setRows,
        weight: data.weight
      });
    }
  });

  const totalDayExercises = dayExercisesList.length;
  const completedDayExercises = dayExercisesList.filter(e => e.completed).length;
  const dayExerciseCompletionPct = totalDayExercises > 0 
    ? Math.round((completedDayExercises / totalDayExercises) * 100) 
    : 0;

  // Earned Badges
  const earnedBadgesList: { title: string; tier: string }[] = [];
  try {
    ACCOMPLISHMENT_BADGES.forEach(b => {
      if (b.id === 'macro-chef' || userProfile?.removedBadges?.includes(b.id)) return;
      const val = b.getProgressValue(logs, targetDayLog, userProfile, measurements);
      const unlockedTiers = b.tiers.filter(t => val >= t.targetValue);
      if (unlockedTiers.length > 0) {
        const highestTier = unlockedTiers[unlockedTiers.length - 1];
        earnedBadgesList.push({
          title: b.name,
          tier: highestTier.tier
        });
      }
    });
  } catch (e) {
    console.error("Error evaluating badges:", e);
  }

  // Day Habits
  const defaultHabitNames = ['Water Goal', 'Protein Goal', 'Sleep 7h+', '10k Steps', 'Stretch / Mobility', 'Cardio Walk', 'No Cheat Meal'];
  const activeHabitKeys = userProfile?.habitList && userProfile.habitList.length > 0 ? userProfile.habitList : defaultHabitNames;
  const dayHabitItems = activeHabitKeys.map(hKey => ({
    name: hKey,
    completed: !!(targetDayLog?.habits?.[hKey])
  }));

  const completedHabitsCount = dayHabitItems.filter(h => h.completed).length;
  const dayHabitsCompliancePct = dayHabitItems.length > 0 ? Math.round((completedHabitsCount / dayHabitItems.length) * 100) : 0;

  const handlePrintReport = () => {
    const originalTitle = document.title;
    const sanitizedName = subjectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const tfLabel = timeframeLabels[timeframe].replace(/\s+/g, '_');
    const pdfFilename = `${sanitizedName}_Transformation_Progress_Report_${tfLabel}_${todayStr}`;
    
    document.title = pdfFilename;
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] overflow-y-auto font-sans text-gray-100 flex flex-col progress-report-modal-wrapper max-w-full overflow-x-hidden touch-pan-y">
      {/* Top Banner for Trainer Client View */}
      {isClientReport && (
        <div className="bg-[#0b1320] border-b border-emerald-500/20 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] sm:text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Viewing client report — trainer view</span>
          </div>
          <button
            onClick={() => {
              if (onBackToClientHub) onBackToClientHub();
              onClose();
            }}
            className="text-xs font-bold text-gray-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Client Hub
          </button>
        </div>
      )}

      {/* Main Report Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6 progress-report-container overflow-x-hidden">
        
        {/* Close Button (No Print) */}
        {!isClientReport && (
          <div className="flex justify-end no-print -mb-1 sm:mb-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-400 hover:text-white transition-all cursor-pointer touch-manipulation"
              aria-label="Close report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 1. HEADER SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-white/10">
          <div className="flex items-center gap-3 sm:gap-4">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt={subjectName} 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-brand-primary/40 shrink-0" 
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-display font-black text-base sm:text-lg text-emerald-400 shrink-0">
                {avatarInitials}
              </div>
            )}

            <div>
              <div className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">
                TRANSFORMATION PROGRESS REPORT
              </div>
              <h1 className="text-xl sm:text-3xl font-display font-black text-white tracking-tight mt-0.5">
                {subjectName}
              </h1>
              <p className="text-[11px] sm:text-sm text-gray-400 font-medium mt-0.5 sm:mt-1">
                Generated {formattedTodayDate} · {timeframeLabels[timeframe]} view
              </p>
            </div>
          </div>

          <div className="no-print flex items-center gap-2 self-start sm:self-auto">
            <Button
              onClick={handlePrintReport}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print / Export</span>
            </Button>
          </div>
        </div>

        {/* TIMEFRAME & UNIT SELECTOR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 no-print">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none no-scrollbar max-w-full">
            {(['daily', 'weekly', '4-week', '8-week', '12-week', 'full'] as ReportTimeframe[]).map((tf) => {
              const isActive = timeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shrink-0",
                    isActive
                      ? "bg-emerald-500 text-black border-emerald-400 shadow-md font-black"
                      : "bg-[#0d1424] hover:bg-white/10 border-white/10 text-gray-400 hover:text-white"
                  )}
                >
                  {timeframeLabels[tf]}
                </button>
              );
            })}
          </div>

          {/* UNIT SYSTEM TOGGLE */}
          <div className="flex items-center justify-center gap-1 bg-[#0d1424] border border-white/10 p-1 rounded-xl shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setUnitSystem('imperial')}
              className={cn(
                "flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                unitSystem === 'imperial'
                  ? "bg-emerald-500 text-black font-black shadow-sm"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <span>Imperial</span>
              <span className="text-[10px] opacity-70 font-mono">(ft, in / lbs)</span>
            </button>
            <button
              onClick={() => setUnitSystem('metric')}
              className={cn(
                "flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                unitSystem === 'metric'
                  ? "bg-emerald-500 text-black font-black shadow-sm"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <span>Metric</span>
              <span className="text-[10px] opacity-70 font-mono">(cm / kg)</span>
            </button>
          </div>
        </div>

        {timeframe === 'daily' ? (
          /* SINGLE DAY PROGRESS REPORT VIEW */
          <div className="space-y-4">
            {/* Date Selector Banner */}
            <div className="no-print bg-[#0d1424] border border-emerald-500/30 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    Selected Progress Report Date
                  </span>
                  <div className="text-sm font-black font-mono text-white">
                    {formattedReportDate}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-1 bg-[#070b14] border border-white/20 p-1 rounded-xl">
                  <button
                    onClick={handlePrevDay}
                    title="Previous Day"
                    className="p-1 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative flex items-center px-1">
                    <input 
                      type="date"
                      value={reportDate}
                      onChange={(e) => {
                        if (e.target.value) setReportDate(e.target.value);
                      }}
                      className="bg-transparent text-white text-xs font-mono font-bold px-1.5 py-0.5 focus:outline-none cursor-pointer [color-scheme:dark]"
                    />
                  </div>

                  <button
                    onClick={handleNextDay}
                    title="Next Day"
                    className="p-1 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={() => setReportDate(todayStr)}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl cursor-pointer py-1 px-3"
                >
                  Today
                </Button>
              </div>
            </div>

            {/* HIGH-DENSITY 2-COLUMN SINGLE PAGE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 progress-report-grid">
              
              {/* LEFT COLUMN: Physical Snapshot, Habits, Badges */}
              <div className="md:col-span-5 space-y-3">
                {/* 1. Day Overview & Weight Card */}
                <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-3 progress-report-card">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase text-emerald-400 tracking-wider block">
                        Daily Physical Snapshot
                      </span>
                      <h2 className="text-base font-display font-black text-white">
                        {formattedReportDate}
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      DAILY SYNC
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">HEIGHT</span>
                      <span className="text-sm font-display font-black text-white">{heightDisplay}</span>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">AGE</span>
                      <span className="text-sm font-display font-black text-white">{ageDisplay}</span>
                    </div>
                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-black uppercase text-gray-400 block">RECORDED WEIGHT</span>
                          <span className="text-base font-display font-black text-emerald-400">
                            {fmtWeight(targetDayLog?.weight || latestDayWeight || null)}
                          </span>
                        </div>
                        {weightDeltaText && (
                          <span className={cn(
                            "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border",
                            (weightDeltaFromPrevious || 0) <= 0 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          )}>
                            {weightDeltaText}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">PREVIOUS W</span>
                      <span className="text-xs font-display font-bold text-gray-300">
                        {previousWeightEntry ? fmtWeight(previousWeightEntry.weight) : (userProfile?.weight ? fmtWeight(userProfile.weight) : '—')}
                      </span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                      <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">GOAL WEIGHT</span>
                      <span className="text-xs font-display font-bold text-white">{goalWeightDisplay}</span>
                    </div>
                  </div>
                </Card>

                {/* 2. Habit & Compliance Dashboard */}
                <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-3 progress-report-card">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-display font-black text-white">Habit & Compliance</h3>
                    </div>
                    <span className="text-xs font-display font-black text-emerald-400">{dayHabitsCompliancePct}%</span>
                  </div>

                  {/* Habit Progress */}
                  <div className="p-2.5 bg-black/40 border border-emerald-500/20 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                        HABIT SCORE
                      </span>
                      <span className="font-mono font-bold text-white text-xs">
                        {completedHabitsCount} / {dayHabitItems.length}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-full rounded-full transition-all" 
                        style={{ width: `${dayHabitsCompliancePct}%` }} 
                      />
                    </div>
                  </div>

                  {/* 4 Compliance Metrics */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Hydration */}
                    <div className="p-2 bg-black/30 border border-white/5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-gray-400 flex items-center gap-1">
                          <Droplets className="w-3 h-3 text-cyan-400" /> Water
                        </span>
                        <span className="font-mono font-bold text-cyan-400">
                          {targetDayLog?.water || 0} ml
                        </span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-cyan-400 h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round(((targetDayLog?.water || 0) / (targetDayLog?.waterGoal || 3000)) * 100))}%` }} 
                        />
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="p-2 bg-black/30 border border-white/5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-gray-400 flex items-center gap-1">
                          <Footprints className="w-3 h-3 text-emerald-400" /> Steps
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          {(targetDayLog?.steps || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-400 h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round(((targetDayLog?.steps || 0) / (targetDayLog?.stepGoal || 10000)) * 100))}%` }} 
                        />
                      </div>
                    </div>

                    {/* Sleep */}
                    <div className="p-2 bg-black/30 border border-white/5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-gray-400 flex items-center gap-1">
                          <Moon className="w-3 h-3 text-purple-400" /> Sleep
                        </span>
                        <span className="font-mono font-bold text-purple-400">
                          {targetDayLog?.sleepHours || 0} hrs
                        </span>
                      </div>
                    </div>

                    {/* Meals */}
                    <div className="p-2 bg-black/30 border border-white/5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-gray-400 flex items-center gap-1">
                          <Utensils className="w-3 h-3 text-amber-400" /> Meals
                        </span>
                        <span className="font-mono font-bold text-amber-400">
                          {(targetDayLog?.meals || []).filter(m => m.completed).length}/{(targetDayLog?.meals || []).length || 4}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-400 h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round((((targetDayLog?.meals || []).filter(m => m.completed).length) / Math.max(1, (targetDayLog?.meals || []).length || 4)) * 100))}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 3. XP Level & Earned Badges */}
                <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-2.5 progress-report-card">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-display font-black text-white">Level & Badges</h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Lvl {levelInfo.level} · {levelInfo.title}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {earnedBadgesList.length > 0 ? (
                      earnedBadgesList.map((badge, idx) => (
                        <div 
                          key={idx}
                          className="px-2.5 py-1 bg-black/40 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 text-xs"
                        >
                          <Award className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="font-bold text-white text-[11px]">{badge.title}</span>
                          <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">{badge.tier}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 font-mono italic py-1">
                        No badges unlocked on record for this date yet.
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* RIGHT COLUMN: Exercises Performed */}
              <div className="md:col-span-7 space-y-3">
                <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-3 progress-report-card">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-cyan-400" />
                      <div>
                        <h3 className="text-sm font-display font-black text-white">Exercises Performed</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Weight Unit Toggle */}
                      <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-0.5 rounded-lg no-print">
                        <button
                          type="button"
                          onClick={() => setExerciseWeightUnit('lbs')}
                          className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all cursor-pointer",
                            exerciseWeightUnit === 'lbs' ? "bg-emerald-500 text-black font-bold" : "text-gray-400"
                          )}
                        >
                          lbs
                        </button>
                        <button
                          type="button"
                          onClick={() => setExerciseWeightUnit('kg')}
                          className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all cursor-pointer",
                            exerciseWeightUnit === 'kg' ? "bg-emerald-500 text-black font-bold" : "text-gray-400"
                          )}
                        >
                          kg
                        </button>
                      </div>

                      {totalDayExercises > 0 && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                          <span className="text-[10px] font-mono font-bold text-emerald-400">
                            {completedDayExercises}/{totalDayExercises} Done
                          </span>
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-display font-black text-xs rounded">
                            {dayExerciseCompletionPct}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {dayExercisesList.length > 0 ? (
                    <div className="space-y-2">
                      {dayExercisesList.map((ex, idx) => (
                        <div key={idx} className="p-2.5 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <Dumbbell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              {ex.name}
                            </span>
                            <span className={cn(
                              "text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0",
                              ex.completed 
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            )}>
                              {ex.completed ? 'Completed ✓' : 'In Progress'}
                            </span>
                          </div>

                          {ex.setRows && ex.setRows.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {ex.setRows.map((sr, sIdx) => {
                                const showWeight = hasValidWeight(sr.weight, ex.name);
                                return (
                                  <div key={sIdx} className="bg-white/5 px-2 py-1 rounded-md border border-white/5 text-[10px] font-mono">
                                    <span className="text-gray-400">Set {sIdx + 1}: </span>
                                    <span className="text-white font-bold">
                                      {formatRepsLabel(sr.reps)}
                                      {showWeight ? ` @ ${formatExerciseWeight(sr.weight, exerciseWeightUnit)}` : ''}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-300 font-mono">
                              {ex.sets || '3'} sets × {ex.reps || '10'} reps
                              {hasValidWeight(ex.weight, ex.name) ? ` · ${formatExerciseWeight(ex.weight, exerciseWeightUnit)}` : ''}
                            </p>
                          )}

                          {ex.notes && (
                            <p className="text-[10px] text-gray-400 italic bg-white/5 px-2 py-1 rounded border border-white/5">
                              "{ex.notes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-black/20 border border-white/5 rounded-xl text-center space-y-1">
                      <p className="text-xs font-bold text-gray-300">Rest / Recovery Day</p>
                      <p className="text-[10px] text-gray-500 font-mono">No exercises recorded or scheduled for this date.</p>
                    </div>
                  )}
                </Card>
              </div>

            </div>
          </div>
        ) : (
          /* MULTI-DAY / FULL TIMEFRAME HIGH-DENSITY 2-COLUMN VIEW */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 progress-report-grid">
            
            {/* LEFT COLUMN: Physical Profile, Measurements, Habits, Badges */}
            <div className="md:col-span-5 space-y-3">
              
              {/* Physical Profile & Net Weight */}
              <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-3 progress-report-card">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h2 className="text-sm font-display font-black text-white">Physical Profile & Weight</h2>
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    WEIGH LOG SYNCED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">HEIGHT</span>
                    <span className="text-sm font-display font-black text-white">{heightDisplay}</span>
                  </div>
                  <div className="p-2 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">AGE</span>
                    <span className="text-sm font-display font-black text-white">{ageDisplay}</span>
                  </div>
                  <div className="p-2 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">START WEIGHT</span>
                    <span className="text-xs font-display font-black text-gray-300">{startWeightDisplay}</span>
                  </div>
                  <div className="p-2 bg-black/30 rounded-xl border border-white/5">
                    <span className="text-[9px] font-black uppercase text-gray-400 block mb-0.5">CURRENT WEIGHT</span>
                    <span className="text-xs font-display font-black text-white">{currentWeightDisplay}</span>
                  </div>
                </div>

                {/* Net Change Bar */}
                <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">NET CHANGE</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-display font-black",
                      netWeightChangeDisplay === '—' ? "text-gray-400" : isWeightDeltaPositive ? "text-emerald-400" : "text-red-400"
                    )}>
                      {netWeightChangeDisplay}
                    </span>
                    <span className="text-[10px] text-gray-400 italic">{weightTrendNote}</span>
                  </div>
                </div>
              </Card>

              {/* Body Measurements */}
              <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-2 progress-report-card">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h2 className="text-sm font-display font-black text-white">Body Measurements</h2>
                  <span className="text-[9px] font-mono text-gray-400">({unitSystem === 'metric' ? 'cm' : 'in'})</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {measurementSites.map(site => (
                    <div key={site.key} className="p-1.5 bg-black/30 border border-white/5 rounded-lg text-center">
                      <span className="text-[8px] font-black uppercase text-gray-400 block">{site.label}</span>
                      <span className="text-xs font-bold text-white block mt-0.5">{getMeasurementVal(site.key)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Habit & Compliance Summary */}
              <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-2 progress-report-card">
                <h2 className="text-sm font-display font-black text-white border-b border-white/10 pb-2">Compliance Summary</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-black/30 border border-white/5 rounded-xl space-y-1">
                    <span className="text-[9px] font-black uppercase text-gray-400 block">WORKOUTS</span>
                    <span className="text-xs font-display font-black text-white block">{workoutSetsDisplay}</span>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, workoutCompletionPct)}%` }} />
                    </div>
                  </div>
                  <div className="p-2 bg-black/30 border border-white/5 rounded-xl space-y-1">
                    <span className="text-[9px] font-black uppercase text-gray-400 block">HABITS</span>
                    <span className="text-xs font-display font-black text-white block">{habitCompliancePct}%</span>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, habitCompliancePct)}%` }} />
                    </div>
                  </div>
                  <div className="p-2 bg-black/30 border border-white/5 rounded-xl space-y-1 col-span-2">
                    <span className="text-[9px] font-black uppercase text-gray-400 block">DAILY AVERAGES</span>
                    <span className="text-xs font-bold text-white block">{avgStepsDisplay} · {avgWaterDisplay}</span>
                  </div>
                </div>
              </Card>

              {/* Badges Display */}
              <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-2 progress-report-card">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h2 className="text-sm font-display font-black text-white">Badges & XP</h2>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">Lvl {levelInfo.level}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {badgesList.length > 0 ? (
                    badgesList.map((badge, idx) => (
                      <div key={idx} className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>{badge}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-500 font-mono">No badges logged yet.</p>
                  )}
                </div>
              </Card>

            </div>

            {/* RIGHT COLUMN: Progression Tables */}
            <div className="md:col-span-7 space-y-3">
              
              {/* Main Exercise Progression */}
              <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-3 progress-report-card">
                <div>
                  <h2 className="text-sm font-display font-black text-white">Main Exercise Progression</h2>
                  <p className="text-[10px] text-gray-400">Initial vs. latest logged weight for top main lifts.</p>
                </div>

                {exerciseRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#131d30] text-gray-400 font-black uppercase text-[9px] tracking-wider border-b border-white/10">
                          <th className="py-2 px-3">EXERCISE</th>
                          <th className="py-2 px-3">START</th>
                          <th className="py-2 px-3">LATEST</th>
                          <th className="py-2 px-3">DIFF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {exerciseRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-bold text-white text-[11px]">{row.exercise}</td>
                            <td className="py-2 px-3 text-gray-300 font-mono text-[11px]">{row.start}</td>
                            <td className="py-2 px-3 text-gray-300 font-mono text-[11px]">{row.latest}</td>
                            <td className={cn(
                              "py-2 px-3 font-bold font-mono text-[11px]",
                              row.isGain ? "text-emerald-400" : "text-red-400"
                            )}>
                              {row.diffFormatted}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 py-2 font-medium italic">
                    Log weight on your main lifts to populate progress.
                  </p>
                )}
              </Card>

              {/* Weigh-In History Table */}
              {sortedWeighLogsList.length > 0 && (
                <Card className="p-4 bg-[#0d1424] border border-white/10 rounded-2xl space-y-3 progress-report-card">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-200">Weigh-In History Log</span>
                    <span className="text-[10px] font-mono text-gray-400">{sortedWeighLogsList.length} recorded</span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#131d30] text-gray-400 font-black uppercase text-[9px] tracking-wider border-b border-white/10">
                          <th className="py-2 px-3">DATE</th>
                          <th className="py-2 px-3">WEIGHT</th>
                          <th className="py-2 px-3">VS START</th>
                          <th className="py-2 px-3">SOURCE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sortedWeighLogsList.slice(0, 8).map((entry, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-mono font-bold text-gray-200 text-[11px]">{entry.date}</td>
                            <td className="py-2 px-3 font-mono font-bold text-white text-[11px]">{fmtWeight(entry.weight)}</td>
                            <td className={cn(
                              "py-2 px-3 font-mono font-bold text-[11px]",
                              entry.delta < 0 ? "text-emerald-400" : entry.delta > 0 ? "text-amber-400" : "text-gray-400"
                            )}>
                              {fmtWeightDelta(entry.delta)}
                            </td>
                            <td className="py-2 px-3 text-[9px] font-mono text-gray-400">{entry.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
