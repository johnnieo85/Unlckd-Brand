import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Award, 
  Dumbbell, 
  Ruler, 
  Activity, 
  X, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  Droplets,
  Footprints,
  Moon,
  Utensils,
  Flame,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { 
  Button, 
  Card, 
  Badge, 
  DisplayHeading, 
  SectionHeading, 
  ContentHeading, 
  MetricDisplay, 
  MetadataLabel, 
  Divider 
} from './ui';
import { UnitToggle } from './UnitToggle';
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
  const fmtWeightNumber = (lbs: number | null | undefined): string => {
    if (lbs === null || lbs === undefined || isNaN(lbs)) return '—';
    if (unitSystem === 'metric') {
      return (lbs * 0.453592).toFixed(1);
    }
    return Number(lbs.toFixed(1)).toString();
  };

  const fmtWeight = (lbs: number | null | undefined): string => {
    if (lbs === null || lbs === undefined || isNaN(lbs)) return '—';
    const unit = unitSystem === 'metric' ? 'KG' : 'LB';
    return `${fmtWeightNumber(lbs)} ${unit}`;
  };

  const fmtWeightDelta = (lbsDelta: number | null | undefined): string => {
    if (lbsDelta === null || lbsDelta === undefined || isNaN(lbsDelta)) return '—';
    const unit = unitSystem === 'metric' ? 'kg' : 'lbs';
    if (unitSystem === 'metric') {
      const kg = Number((lbsDelta * 0.453592).toFixed(1));
      return kg > 0 ? `+${kg} ${unit}` : `${kg} ${unit}`;
    }
    return lbsDelta > 0 ? `+${lbsDelta} ${unit}` : `${lbsDelta} ${unit}`;
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
      return `${Math.round(rawInches * 2.54)} CM`;
    }
    const feet = Math.floor(rawInches / 12);
    const remInches = Math.round(rawInches % 12);
    if (feet > 0) {
      return `${feet}' ${remInches}"`;
    }
    return `${Math.round(rawInches)}"`;
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

  const parsedDateObj = (() => {
    try {
      const [y, m, d] = reportDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    } catch {
      return new Date();
    }
  })();

  const formattedReportDateDayName = parsedDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const formattedReportDateFull = parsedDateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();

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

  // Physical Profile & Weight Calculation
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
      isWeightDeltaPositive = rawNetWeightDelta <= 0;
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

    const daysWindow = timeframe === 'weekly' ? 7 : timeframe === '4-week' ? 28 : timeframe === '8-week' ? 56 : timeframe === '12-week' ? 84 : 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysWindow);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

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

      sortedWeighLogsList = weighLogsInRange.map(item => ({
        date: item.date,
        weight: item.weight,
        delta: Number((item.weight - baseWeight).toFixed(1)),
        source: item.source
      })).reverse();
    } else if (allWeighLogs.length > 0) {
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
      weightTrendNote = 'Log weigh-ins in Gym Hub to track progress over time.';
    }
  }

  const heightDisplay = fmtHeight(rawHeightInches);
  const currentWeightDisplay = fmtWeight(rawCurrentWeight);
  const goalWeightDisplay = fmtWeight(rawGoalWeight);
  const netWeightChangeDisplay = fmtWeightDelta(rawNetWeightDelta);

  // Body Measurements Setup
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
    if (data) {
      const candidate = data.name || data.exerciseName || data.exercise || data.title;
      if (candidate && typeof candidate === 'string') {
        const cleaned = cleanExerciseTitle(candidate);
        if (cleaned && !/^\d+$/.test(cleaned)) {
          return cleaned;
        }
      }
    }

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

    const keyCleaned = cleanExerciseTitle(
      exKey.replace(/^(?:mainWork|main|warmUp|warmup)-/i, '').replace(/-\d+$/, '').replace(/_/g, ' ')
    );
    if (keyCleaned && !/^\d+$/.test(keyCleaned)) {
      return keyCleaned;
    }

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
    const matchNum = exKey.match(/\d+/);
    const num = matchNum ? parseInt(matchNum[0], 10) : 0;
    return fallbackList[num % fallbackList.length];
  };

  // Main Exercise Progression Setup
  let rawExerciseRows: { exercise: string; startLbs: number; latestLbs: number }[] = [];

  if (isClientReport && clientData.lifts) {
    rawExerciseRows = clientData.lifts.map(l => ({
      exercise: l.exercise,
      startLbs: l.start,
      latestLbs: l.latest
    }));
  } else if (!isClientReport && logs.length > 0) {
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

  // Compliance & Habit Data Setup
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

  const levelInfo = getLevelInfo(userProfile?.xp || 0);

  // Single Day Report Data Calculations
  const targetDayLog = singleLog || logs.find(l => l.date === reportDate) || null;
  const latestDayWeight = targetDayLog?.weight || (measurements.find(m => m.date <= reportDate)?.weight) || userProfile?.weight || null;

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
    if (weightDeltaFromPrevious === 0) return 'NO CHANGE';
    const unit = unitSystem === 'metric' ? 'KG' : 'LB';
    const val = unitSystem === 'metric' ? (weightDeltaFromPrevious * 0.45359237).toFixed(1) : Math.abs(weightDeltaFromPrevious).toFixed(1);
    if (weightDeltaFromPrevious < 0) {
      return `-${val} ${unit} FROM PREVIOUS`;
    }
    return `+${val} ${unit} FROM PREVIOUS`;
  })();

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

  const defaultHabitNames = ['Water Goal', 'Protein Goal', 'Sleep 7h+', '10k Steps', 'Stretch / Mobility', 'Cardio Walk'];
  const activeHabitKeys = userProfile?.habitList && userProfile.habitList.length > 0 ? userProfile.habitList : defaultHabitNames;
  const dayHabitItems = activeHabitKeys.map(hKey => ({
    name: hKey,
    completed: !!(targetDayLog?.habits?.[hKey])
  }));

  const completedHabitsCount = dayHabitItems.filter(h => h.completed).length;
  const dayHabitsCompliancePct = dayHabitItems.length > 0 ? Math.round((completedHabitsCount / dayHabitItems.length) * 100) : 0;

  // Chart data for historical views
  const chartData = [...measurements]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => {
      let val = Number(m.weight) || 0;
      const loggedUnit = m.units?.weight || 'lbs';
      if (unitSystem === 'metric' && loggedUnit === 'lbs') {
        val = val * 0.453592;
      } else if (unitSystem === 'imperial' && loggedUnit === 'kg') {
        val = val / 0.453592;
      }
      const dObj = new Date(m.date + 'T00:00:00');
      return {
        date: dObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        value: parseFloat(val.toFixed(1)),
        rawDate: m.date
      };
    })
    .filter(d => !isNaN(d.value) && d.value > 0);

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
    <div className="fixed inset-0 z-50 bg-[#080808] overflow-y-auto text-white flex flex-col font-sans select-text touch-pan-y no-scrollbar">
      
      {/* Top Trainer Banner if Client View */}
      {isClientReport && (
        <div className="bg-[#111111] border-b border-[#292929] px-4 sm:px-8 py-3 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-[#A1A1A1]">
            <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
            <span>TRAINER VIEW · CLIENT REPORT</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (onBackToClientHub) onBackToClientHub();
              onClose();
            }}
            className="text-xs font-mono font-bold tracking-wider uppercase text-[#A1A1A1] hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> BACK TO CLIENT HUB
          </Button>
        </div>
      )}

      {/* Main Page Shell organizing the report on the page background */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        
        {/* ============================================================ */}
        {/* 1. REPORT HEADER (Same title treatment as Profile / Gym Hub) */}
        {/* ============================================================ */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#292929]">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            {/* Standard Avatar Frame */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[6px] overflow-hidden border border-[#292929] bg-[#111111] flex items-center justify-center font-display font-black text-xl text-brand-primary shrink-0">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={subjectName} 
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span>{avatarInitials}</span>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <MetadataLabel className="text-brand-primary">PROGRESS REPORT</MetadataLabel>
                <span className="text-[#444444] font-mono text-[10px]">•</span>
                <span className="text-[10px] font-mono text-[#A1A1A1] uppercase tracking-wider">
                  {timeframeLabels[timeframe]} VIEW
                </span>
              </div>
              <DisplayHeading className="truncate">
                {subjectName}
              </DisplayHeading>
              <p className="text-xs font-mono text-[#A1A1A1]">
                Generated {formattedTodayDate}
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3 no-print shrink-0 self-start sm:self-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrintReport}
              className="text-xs font-mono font-bold tracking-wider uppercase gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-brand-primary" />
              <span>PRINT / EXPORT</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#6C6C6C]" />
            </Button>

            {!isClientReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs font-mono font-bold tracking-wider uppercase gap-1"
                title="Close Report"
              >
                <X className="w-3.5 h-3.5" />
                <span>CLOSE</span>
              </Button>
            )}
          </div>
        </header>

        {/* ============================================================ */}
        {/* 2. RANGE CONTROLS (Simple Text Tabs & Unit Switcher)         */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-[#292929] pb-3">
          {/* Simple Text Tabs */}
          <nav aria-label="Report Timeframes" className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none py-1">
            {(['daily', 'weekly', '4-week', '8-week', '12-week', 'full'] as ReportTimeframe[]).map((tf) => {
              const isActive = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "font-display font-bold uppercase tracking-wider text-sm sm:text-base pb-1.5 transition-colors whitespace-nowrap cursor-pointer relative",
                    isActive
                      ? "text-brand-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-primary"
                      : "text-[#6C6C6C] hover:text-[#A1A1A1]"
                  )}
                >
                  {timeframeLabels[tf]}
                </button>
              );
            })}
          </nav>

          {/* Secondary Unit Switcher */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <UnitToggle<'imperial' | 'metric'>
              unitA="imperial"
              unitB="metric"
              labelA="[IMPERIAL]"
              labelB="[METRIC]"
              value={unitSystem}
              onChange={(u) => setUnitSystem(u)}
              size="sm"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. REPORT CONTENT: SELECTED DAY VS MULTI-DAY VIEWS           */}
        {/* ============================================================ */}
        {timeframe === 'daily' ? (
          /* ========================================================= */
          /* SELECTED DAY VIEW                                         */
          /* ========================================================= */
          <div className="space-y-8">
            
            {/* A. SELECTED DATE (Typography Driven, Not Inside Green Card) */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#292929] pb-6">
              <div className="space-y-1">
                <MetadataLabel>SELECTED DATE</MetadataLabel>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-tight leading-none">
                  {formattedReportDateDayName}
                </div>
                <div className="text-xs sm:text-sm font-mono text-[#A1A1A1] font-bold">
                  {formattedReportDateFull}
                </div>
              </div>

              {/* Day Navigation Buttons */}
              <div className="flex items-center gap-2 no-print self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevDay}
                  className="px-2.5 py-1.5 h-8 text-[#A1A1A1] hover:text-white"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="relative">
                  <input 
                    type="date"
                    value={reportDate}
                    onChange={(e) => {
                      if (e.target.value) setReportDate(e.target.value);
                    }}
                    className="bg-[#111111] border border-[#292929] rounded-[4px] text-white text-xs font-mono font-bold px-3 py-1.5 h-8 focus:border-brand-primary outline-none cursor-pointer [color-scheme:dark]"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextDay}
                  className="px-2.5 py-1.5 h-8 text-[#A1A1A1] hover:text-white"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setReportDate(todayStr)}
                  className="text-xs font-mono font-bold tracking-wider uppercase h-8 px-3"
                >
                  TODAY
                </Button>
              </div>
            </div>

            {/* B. PHYSICAL SNAPSHOT (Large Display Typography Grid) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <SectionHeading>PHYSICAL SNAPSHOT</SectionHeading>
                <MetadataLabel>PERFORMANCE BIOMETRICS</MetadataLabel>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 bg-[#111111] border border-[#292929] rounded-[6px] divide-y sm:divide-y-0 sm:divide-x divide-[#292929] overflow-hidden shadow-lg">
                {/* 1. Current Weight */}
                <div className="p-5 sm:p-6 space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-white tracking-tight">
                      {targetDayLog?.weight || latestDayWeight ? fmtWeightNumber(targetDayLog?.weight || latestDayWeight) : '—'}
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-brand-primary uppercase">
                      {unitSystem === 'metric' ? 'KG' : 'LB'}
                    </span>
                  </div>
                  <MetadataLabel>CURRENT WEIGHT</MetadataLabel>
                </div>

                {/* 2. Height */}
                <div className="p-5 sm:p-6 space-y-1">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-white tracking-tight">
                    {heightDisplay}
                  </div>
                  <MetadataLabel>HEIGHT</MetadataLabel>
                </div>

                {/* 3. Goal Weight */}
                <div className="p-5 sm:p-6 space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-white tracking-tight">
                      {rawGoalWeight ? fmtWeightNumber(rawGoalWeight) : '—'}
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-brand-primary uppercase">
                      {unitSystem === 'metric' ? 'KG' : 'LB'}
                    </span>
                  </div>
                  <MetadataLabel>GOAL WEIGHT</MetadataLabel>
                </div>

                {/* 4. From Previous Delta */}
                <div className="p-5 sm:p-6 space-y-1">
                  <div className={cn(
                    "text-xl sm:text-2xl lg:text-3xl font-mono font-black tracking-tight",
                    (weightDeltaFromPrevious || 0) <= 0 ? "text-brand-primary" : "text-white"
                  )}>
                    {weightDeltaText || 'NO CHANGE'}
                  </div>
                  <MetadataLabel>FROM PREVIOUS</MetadataLabel>
                </div>
              </div>
            </section>

            <Divider />

            {/* C. TWO-COLUMN MAIN WORK & COMPLIANCE SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT COLUMN: Training Activity (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-[#292929] pb-3 flex-wrap gap-3">
                  <div className="space-y-0.5">
                    <SectionHeading>TRAINING ACTIVITY</SectionHeading>
                    <p className="text-[11px] font-mono text-[#A1A1A1]">Prescribed & Logged Workout Session</p>
                  </div>

                  <div className="flex items-center gap-2 no-print">
                    <UnitToggle<'lbs' | 'kg'>
                      unitA="lbs"
                      unitB="kg"
                      labelA="LBS"
                      labelB="KG"
                      value={exerciseWeightUnit}
                      onChange={(u) => setExerciseWeightUnit(u)}
                      size="sm"
                    />
                    {totalDayExercises > 0 && (
                      <Badge variant="active" className="text-[10px] font-mono">
                        {completedDayExercises} / {totalDayExercises} COMPLETE
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Exercise List / Rest Day State */}
                {dayExercisesList.length > 0 ? (
                  <div className="space-y-4 pt-1">
                    {dayExercisesList.map((ex, idx) => (
                      <div key={idx} className="pb-4 border-b border-[#292929] space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm sm:text-base font-bold text-white uppercase flex items-center gap-2 font-display tracking-wide">
                            <Dumbbell className="w-4 h-4 text-brand-primary shrink-0" />
                            {ex.name}
                          </span>
                          <span className={cn(
                            "text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-[3px] border shrink-0",
                            ex.completed 
                              ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary" 
                              : "border-[#292929] bg-[#171717] text-[#A1A1A1]"
                          )}>
                            {ex.completed ? 'COMPLETED' : 'IN PROGRESS'}
                          </span>
                        </div>

                        {ex.setRows && ex.setRows.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {ex.setRows.map((sr, sIdx) => {
                              const showWeight = hasValidWeight(sr.weight, ex.name);
                              return (
                                <div key={sIdx} className="border border-[#292929] bg-[#111111] px-2.5 py-1 rounded-[3px] text-xs font-mono">
                                  <span className="text-[#6C6C6C]">SET {sIdx + 1}: </span>
                                  <span className="text-white font-bold">
                                    {formatRepsLabel(sr.reps)}
                                    {showWeight ? ` @ ${formatExerciseWeight(sr.weight, exerciseWeightUnit)}` : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#A1A1A1] font-mono">
                            {ex.sets || '3'} sets × {ex.reps || '10'} reps
                            {hasValidWeight(ex.weight, ex.name) ? ` · ${formatExerciseWeight(ex.weight, exerciseWeightUnit)}` : ''}
                          </p>
                        )}

                        {ex.notes && (
                          <p className="text-xs text-[#A1A1A1] italic bg-[#111111] border-l-2 border-brand-primary/60 pl-3 py-1.5 rounded-r-[3px]">
                            "{ex.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Clean Rest / Recovery Day State without small bordered cards */
                  <div className="py-12 px-4 text-center space-y-2">
                    <div className="text-xs font-mono font-bold uppercase tracking-widest text-brand-primary">
                      REST / RECOVERY DAY
                    </div>
                    <div className="text-base sm:text-lg font-display font-bold text-white uppercase tracking-wide">
                      No training was recorded for this date.
                    </div>
                    <p className="text-xs font-mono text-[#6C6C6C] uppercase tracking-wider">
                      Physiological recovery and adaptation are essential to physical progression.
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Daily Compliance (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-4">
                  <div className="border-b border-[#292929] pb-3">
                    <SectionHeading>DAILY COMPLIANCE</SectionHeading>
                    <p className="text-[11px] font-mono text-[#A1A1A1]">Behavioral & Nutrition Targets</p>
                  </div>

                  {/* Dominant Overall Compliance Metric */}
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl sm:text-6xl font-display font-black text-brand-primary leading-none">
                        {dayHabitsCompliancePct}%
                      </span>
                      <div className="space-y-0.5">
                        <MetadataLabel>DAILY COMPLIANCE</MetadataLabel>
                        <div className="text-xs font-mono font-bold text-white uppercase">
                          {completedHabitsCount} / {dayHabitItems.length} TARGETS COMPLETE
                        </div>
                      </div>
                    </div>

                    <div className="w-full bg-[#171717] h-2 rounded-full overflow-hidden border border-[#292929]">
                      <div 
                        className="bg-brand-primary h-full rounded-full transition-all" 
                        style={{ width: `${dayHabitsCompliancePct}%` }} 
                      />
                    </div>
                  </div>

                  {/* Simple Rows with Dividers */}
                  <div className="space-y-3 pt-2">
                    {/* Water */}
                    <div className="pb-3 border-b border-[#292929] space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#A1A1A1] uppercase font-bold flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-brand-primary" /> WATER
                        </span>
                        <span className="font-bold text-white">
                          {targetDayLog?.water || 0} / {targetDayLog?.waterGoal || 3000} ml
                        </span>
                      </div>
                      <div className="w-full bg-[#171717] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-primary h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round(((targetDayLog?.water || 0) / Math.max(1, targetDayLog?.waterGoal || 3000)) * 100))}%` }} 
                        />
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="pb-3 border-b border-[#292929] space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#A1A1A1] uppercase font-bold flex items-center gap-1.5">
                          <Footprints className="w-3.5 h-3.5 text-brand-primary" /> STEPS
                        </span>
                        <span className="font-bold text-white">
                          {(targetDayLog?.steps || 0).toLocaleString()} / {(targetDayLog?.stepGoal || 10000).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-[#171717] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-primary h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round(((targetDayLog?.steps || 0) / Math.max(1, targetDayLog?.stepGoal || 10000)) * 100))}%` }} 
                        />
                      </div>
                    </div>

                    {/* Sleep */}
                    <div className="pb-3 border-b border-[#292929] space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#A1A1A1] uppercase font-bold flex items-center gap-1.5">
                          <Moon className="w-3.5 h-3.5 text-brand-primary" /> SLEEP
                        </span>
                        <span className="font-bold text-white">
                          {targetDayLog?.sleepHours || 0} / {targetDayLog?.sleepGoal || 8} hrs
                        </span>
                      </div>
                      <div className="w-full bg-[#171717] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-primary h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.round(((targetDayLog?.sleepHours || 0) / Math.max(1, targetDayLog?.sleepGoal || 8)) * 100))}%` }} 
                        />
                      </div>
                    </div>

                    {/* Meals */}
                    <div className="pb-3 border-b border-[#292929] space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#A1A1A1] uppercase font-bold flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-brand-primary" /> MEALS
                        </span>
                        <span className="font-bold text-white">
                          {(targetDayLog?.meals || []).filter(m => m.completed).length} / {(targetDayLog?.meals || []).length || 4} COMPLIANT
                        </span>
                      </div>
                      <div className="w-full bg-[#171717] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-primary h-full rounded-full" 
                          style={{ 
                            width: `${Math.min(100, Math.round((((targetDayLog?.meals || []).filter(m => m.completed).length) / Math.max(1, (targetDayLog?.meals || []).length || 4)) * 100))}%` 
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Athlete Level & Badges */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <MetadataLabel>ATHLETE LEVEL & XP</MetadataLabel>
                    <span className="text-xs font-mono font-bold text-brand-primary">
                      LVL {levelInfo.level} · {levelInfo.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {earnedBadgesList.length > 0 ? (
                      earnedBadgesList.map((badge, idx) => (
                        <div 
                          key={idx}
                          className="px-3 py-1.5 bg-[#111111] border border-[#292929] rounded-[4px] flex items-center gap-2 text-xs font-mono"
                        >
                          <Award className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                          <span className="font-bold text-white">{badge.title}</span>
                          <span className="text-[10px] text-brand-primary uppercase font-bold">{badge.tier}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#6C6C6C] font-mono italic">
                        No milestone badges logged on this date.
                      </p>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        ) : (
          /* ========================================================= */
          /* MULTI-DAY / HISTORICAL TIMEFRAME VIEWS                    */
          /* ========================================================= */
          <div className="space-y-8">
            
            {/* A. PHYSICAL BASELINE & NET PROGRESSION HERO */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <SectionHeading>PHYSICAL PROGRESSION</SectionHeading>
                <MetadataLabel>{timeframeLabels[timeframe].toUpperCase()} SNAPSHOT</MetadataLabel>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 bg-[#111111] border border-[#292929] rounded-[6px] divide-y sm:divide-y-0 sm:divide-x divide-[#292929] overflow-hidden shadow-lg">
                {/* 1. Net Delta */}
                <div className="p-5 sm:p-6 space-y-1">
                  <div className={cn(
                    "text-3xl sm:text-4xl lg:text-5xl font-mono font-black tracking-tight",
                    netWeightChangeDisplay === '—' ? "text-white" : isWeightDeltaPositive ? "text-brand-primary" : "text-white"
                  )}>
                    {netWeightChangeDisplay}
                  </div>
                  <MetadataLabel>NET WEIGHT CHANGE</MetadataLabel>
                </div>

                {/* 2. Start Weight */}
                <div className="p-5 sm:p-6 space-y-1">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-white tracking-tight">
                    {rawStartWeight ? fmtWeightNumber(rawStartWeight) : '—'}
                  </div>
                  <MetadataLabel>START WEIGHT ({unitSystem === 'metric' ? 'KG' : 'LB'})</MetadataLabel>
                </div>

                {/* 3. Current Weight */}
                <div className="p-5 sm:p-6 space-y-1">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-white tracking-tight">
                    {rawCurrentWeight ? fmtWeightNumber(rawCurrentWeight) : '—'}
                  </div>
                  <MetadataLabel>CURRENT WEIGHT ({unitSystem === 'metric' ? 'KG' : 'LB'})</MetadataLabel>
                </div>

                {/* 4. Target Weight */}
                <div className="p-5 sm:p-6 space-y-1">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black text-brand-primary tracking-tight">
                    {rawGoalWeight ? fmtWeightNumber(rawGoalWeight) : '—'}
                  </div>
                  <MetadataLabel>TARGET WEIGHT ({unitSystem === 'metric' ? 'KG' : 'LB'})</MetadataLabel>
                </div>
              </div>
            </section>

            <Divider />

            {/* B. INTEGRATED WEIGHT PROGRESSION CHART */}
            {chartData.length >= 2 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-0.5">
                  <SectionHeading>WEIGHT PROGRESSION TREND</SectionHeading>
                  <MetadataLabel>HISTORICAL LOGGED ENTRIES</MetadataLabel>
                </div>

                <div className="h-64 sm:h-72 w-full pt-2 bg-[#111111] border border-[#292929] rounded-[6px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="reportWeightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00DFA2" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#00DFA2" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        stroke="#6C6C6C" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: '#292929' }}
                      />
                      <YAxis 
                        stroke="#6C6C6C" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: '#292929' }}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#080808] border border-[#292929] p-3 rounded-[4px] shadow-2xl">
                                <p className="text-[10px] font-bold text-[#6C6C6C] uppercase tracking-widest mb-1">{label}</p>
                                <p className="text-sm font-bold text-brand-primary">
                                  {data.value} {unitSystem === 'metric' ? 'kg' : 'lbs'}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#00DFA2" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#reportWeightGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* C. BODY MEASUREMENTS & COMPLIANCE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT: 10-Point Body Measurements (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="border-b border-[#292929] pb-3">
                  <SectionHeading>BODY MEASUREMENTS</SectionHeading>
                  <p className="text-[11px] font-mono text-[#A1A1A1]">10-Point Circumference Tracking ({unitSystem === 'metric' ? 'cm' : 'in'})</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {measurementSites.map(site => (
                    <div key={site.key} className="bg-[#111111] border border-[#292929] p-3 rounded-[4px]">
                      <MetadataLabel>{site.label}</MetadataLabel>
                      <span className="text-sm sm:text-base font-mono font-bold text-white block mt-1">
                        {getMeasurementVal(site.key)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Compliance Summary (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="border-b border-[#292929] pb-3">
                  <SectionHeading>COMPLIANCE SUMMARY</SectionHeading>
                  <p className="text-[11px] font-mono text-[#A1A1A1]">Overall Program Adherence</p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[#111111] border border-[#292929] p-5 rounded-[6px]">
                  <div>
                    <MetadataLabel>WORKOUT VOLUME</MetadataLabel>
                    <span className="text-2xl sm:text-3xl font-display font-black text-white block mt-1">
                      {workoutSetsDisplay}
                    </span>
                    <div className="w-full bg-[#171717] h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-brand-primary h-full rounded-full" style={{ width: `${Math.min(100, workoutCompletionPct)}%` }} />
                    </div>
                  </div>

                  <div>
                    <MetadataLabel>HABIT ADHERENCE</MetadataLabel>
                    <span className="text-2xl sm:text-3xl font-display font-black text-brand-primary block mt-1">
                      {habitCompliancePct}%
                    </span>
                    <div className="w-full bg-[#171717] h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-brand-primary h-full rounded-full" style={{ width: `${Math.min(100, habitCompliancePct)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#111111] border border-[#292929] rounded-[6px]">
                  <MetadataLabel>DAILY AVERAGES</MetadataLabel>
                  <span className="text-xs font-mono font-bold text-white block mt-1">
                    {avgStepsDisplay} · {avgWaterDisplay} · {avgSleepDisplay}
                  </span>
                </div>
              </div>

            </div>

            <Divider />

            {/* D. MAIN EXERCISE PROGRESSION TABLE */}
            <section className="space-y-4">
              <div className="border-b border-[#292929] pb-3">
                <SectionHeading>MAIN EXERCISE PROGRESSION</SectionHeading>
                <p className="text-[11px] font-mono text-[#A1A1A1]">Key Compound Strength Gains Over Time</p>
              </div>

              {exerciseRows.length > 0 ? (
                <div className="overflow-x-auto border border-[#292929] rounded-[6px] bg-[#111111]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#171717] text-[#A1A1A1] font-mono font-bold uppercase text-[10px] tracking-wider border-b border-[#292929]">
                        <th className="py-3 px-4">EXERCISE</th>
                        <th className="py-3 px-4">START</th>
                        <th className="py-3 px-4">LATEST</th>
                        <th className="py-3 px-4">DIFF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#292929]/60 font-mono">
                      {exerciseRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-white font-sans text-xs">{row.exercise}</td>
                          <td className="py-3 px-4 text-[#A1A1A1]">{row.start}</td>
                          <td className="py-3 px-4 text-white font-bold">{row.latest}</td>
                          <td className={cn(
                            "py-3 px-4 font-bold",
                            row.isGain ? "text-brand-primary" : "text-white"
                          )}>
                            {row.diffFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[#6C6C6C] font-mono py-4 italic">
                  Log load and reps on compound movements in Gym Hub to populate strength progress.
                </p>
              )}
            </section>

            {/* E. WEIGH-IN HISTORY LOG TABLE */}
            {sortedWeighLogsList.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                  <div>
                    <SectionHeading>WEIGH-IN HISTORY LOG</SectionHeading>
                    <p className="text-[11px] font-mono text-[#A1A1A1]">Sequential Entries</p>
                  </div>
                  <MetadataLabel>{sortedWeighLogsList.length} ENTRIES</MetadataLabel>
                </div>

                <div className="overflow-x-auto border border-[#292929] rounded-[6px] bg-[#111111]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#171717] text-[#A1A1A1] font-mono font-bold uppercase text-[10px] tracking-wider border-b border-[#292929]">
                        <th className="py-3 px-4">DATE</th>
                        <th className="py-3 px-4">WEIGHT</th>
                        <th className="py-3 px-4">VS START</th>
                        <th className="py-3 px-4">SOURCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#292929]/60 font-mono">
                      {sortedWeighLogsList.slice(0, 10).map((entry, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-white">{entry.date}</td>
                          <td className="py-3 px-4 font-bold text-brand-primary">{fmtWeight(entry.weight)}</td>
                          <td className={cn(
                            "py-3 px-4 font-bold",
                            entry.delta <= 0 ? "text-brand-primary" : "text-white"
                          )}>
                            {fmtWeightDelta(entry.delta)}
                          </td>
                          <td className="py-3 px-4 text-[10px] text-[#6C6C6C] uppercase">{entry.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
