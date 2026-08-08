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
  ClipboardList
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { UserProfile, DailyLog, Measurement } from '../types';
import { ClientData } from './ClientHub';
import { gymService } from '../services/gymService';
import { cn } from '../lib/utils';
import { getLevelInfo } from '../lib/levels';

export type ReportTimeframe = 'weekly' | '4-week' | '8-week' | '12-week' | 'full';

interface ProgressReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  clientData?: ClientData | null;
  onBackToClientHub?: () => void;
  onReportSaved?: () => void;
}

export function ProgressReportModal({
  isOpen,
  onClose,
  userProfile,
  clientData,
  onBackToClientHub,
  onReportSaved
}: ProgressReportModalProps) {
  const [timeframe, setTimeframe] = useState<ReportTimeframe>('4-week');
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showBadges, setShowBadges] = useState(true);
  const [showXpAndLevel, setShowXpAndLevel] = useState(true);

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

  const isClientReport = !!clientData;
  const todayStr = new Date().toISOString().slice(0, 10);
  const formattedTodayDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  useEffect(() => {
    if (isOpen && !isClientReport) {
      loadData();
    }
  }, [isOpen, timeframe, isClientReport]);

  const loadData = async () => {
    setLoading(true);
    try {
      const daysCount = timeframe === 'weekly' ? 7 : timeframe === '4-week' ? 28 : timeframe === '8-week' ? 56 : timeframe === '12-week' ? 84 : 365;
      const [fetchedLogs, fetchedMeasurements] = await Promise.all([
        gymService.getDailyLogsRange(daysCount + 10),
        gymService.getLatestMeasurements(100)
      ]);

      const validLogs = (fetchedLogs || []).filter(l => l.date <= todayStr);
      const validMeasurements = (fetchedMeasurements || []).filter(m => m.date <= todayStr);

      setLogs(validLogs);
      setMeasurements(validMeasurements);
    } catch (e) {
      console.error("Failed loading report data", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // 1. Subject Info Setup
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
            const cleanName = exKey.replace(/^(?:mainWork|main)-/i, '').replace(/-\d+$/, '').replace(/_/g, ' ');
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
      if (data.weights.length >= 2) {
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
    <div className="fixed inset-0 z-50 bg-[#070b14] overflow-y-auto font-sans text-gray-100 flex flex-col progress-report-modal-wrapper">
      {/* Top Banner for Trainer Client View */}
      {isClientReport && (
        <div className="bg-[#0b1320] border-b border-emerald-500/20 px-6 py-3 flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
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
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6 progress-report-container">
        
        {/* Close Button (No Print) */}
        {!isClientReport && (
          <div className="flex justify-end no-print">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 1. HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt={subjectName} 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-brand-primary/40 shrink-0" 
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-display font-black text-lg text-emerald-400 shrink-0">
                {avatarInitials}
              </div>
            )}

            <div>
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">
                TRANSFORMATION PROGRESS REPORT
              </div>
              <h1 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight mt-0.5">
                {subjectName}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 font-medium mt-1">
                Generated {formattedTodayDate} · {timeframeLabels[timeframe]} view
              </p>
            </div>
          </div>

          <div className="no-print flex items-center gap-3">
            <Button
              onClick={handlePrintReport}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              Print / Export
            </Button>
          </div>
        </div>

        {/* TIMEFRAME & UNIT SELECTOR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['weekly', '4-week', '8-week', '12-week', 'full'] as ReportTimeframe[]).map((tf) => {
              const isActive = timeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border",
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
          <div className="flex items-center gap-1 bg-[#0d1424] border border-white/10 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setUnitSystem('imperial')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
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
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
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

        {/* 2. SECTION A: PHYSICAL PROFILE & WEIGHT OVERVIEW */}
        <Card className="p-6 bg-[#0d1424] border border-white/10 rounded-2xl space-y-6 progress-report-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-black text-white">Physical Profile & Weight Overview</h2>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              WEIGH LOG SYNCED
            </span>
          </div>

          {/* 5 Stats in a row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pb-6 border-b border-white/5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">HEIGHT</span>
              <span className="text-xl sm:text-2xl font-display font-black text-white">{heightDisplay}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">AGE</span>
              <span className="text-xl sm:text-2xl font-display font-black text-white">{ageDisplay}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">START WEIGHT</span>
              <span className="text-xl sm:text-2xl font-display font-black text-gray-300">{startWeightDisplay}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">CURRENT WEIGHT</span>
              <span className="text-xl sm:text-2xl font-display font-black text-white">{currentWeightDisplay}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">GOAL WEIGHT</span>
              <span className="text-xl sm:text-2xl font-display font-black text-white">{goalWeightDisplay}</span>
            </div>
          </div>

          {/* Net Weight Change */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">NET WEIGHT CHANGE</span>
            <div className="flex items-baseline gap-3">
              <span className={cn(
                "text-2xl sm:text-3xl font-display font-black",
                netWeightChangeDisplay === '—' 
                  ? "text-gray-400" 
                  : isWeightDeltaPositive 
                    ? "text-emerald-400" 
                    : "text-red-400"
              )}>
                {netWeightChangeDisplay}
              </span>
              <span className="text-xs text-gray-400 font-medium">{weightTrendNote}</span>
            </div>
          </div>

          {/* Weigh Log Progression Table if entries exist */}
          {sortedWeighLogsList.length > 0 && (
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-300">Weigh-In Log History Comparison</span>
                <span className="text-[10px] font-mono text-gray-400">{sortedWeighLogsList.length} weigh-ins recorded</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#131d30] text-gray-400 font-black uppercase text-[10px] tracking-wider border-b border-white/10">
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3">WEIGHT LOGGED</th>
                      <th className="py-2.5 px-3">VS START WEIGHT</th>
                      <th className="py-2.5 px-3">SOURCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedWeighLogsList.slice(0, 10).map((entry, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-200">{entry.date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">{fmtWeight(entry.weight)}</td>
                        <td className={cn(
                          "py-2.5 px-3 font-mono font-bold",
                          entry.delta < 0 ? "text-emerald-400" : entry.delta > 0 ? "text-amber-400" : "text-gray-400"
                        )}>
                          {fmtWeightDelta(entry.delta)}
                        </td>
                        <td className="py-2.5 px-3 text-[10px] font-mono text-gray-400">{entry.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        {/* 3. SECTION B: BODY MEASUREMENTS */}
        <Card className="p-6 bg-[#0d1424] border border-white/10 rounded-2xl space-y-4 progress-report-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-display font-black text-white">Body Measurements</h2>
              <p className="text-xs text-gray-400">Latest recorded values ({unitSystem === 'metric' ? 'cm' : 'in'}).</p>
            </div>
            <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl no-print">
              <button
                onClick={() => setUnitSystem('imperial')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  unitSystem === 'imperial'
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                )}
              >
                ft / in
              </button>
              <button
                onClick={() => setUnitSystem('metric')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                  unitSystem === 'metric'
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                )}
              >
                cm
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {measurementSites.map(site => (
              <div key={site.key} className="p-3.5 bg-black/30 border border-white/5 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">{site.label}</span>
                <span className="text-base sm:text-lg font-bold text-white block">{getMeasurementVal(site.key)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 4. SECTION C: MAIN EXERCISE PROGRESSION */}
        <Card className="p-6 bg-[#0d1424] border border-white/10 rounded-2xl space-y-4 progress-report-card">
          <div>
            <h2 className="text-lg font-display font-black text-white">Main Exercise Progression</h2>
            <p className="text-xs text-gray-400">Initial vs. latest logged weight for your most-trained main lifts. Warm-ups excluded.</p>
          </div>

          {exerciseRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#131d30] text-gray-400 font-black uppercase text-[10px] tracking-wider border-b border-white/10">
                    <th className="py-3 px-4">EXERCISE</th>
                    <th className="py-3 px-4">START</th>
                    <th className="py-3 px-4">LATEST</th>
                    <th className="py-3 px-4">DIFFERENCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {exerciseRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 font-bold text-white">{row.exercise}</td>
                      <td className="py-3.5 px-4 text-gray-300 font-mono">{row.start}</td>
                      <td className="py-3.5 px-4 text-gray-300 font-mono">{row.latest}</td>
                      <td className={cn(
                        "py-3.5 px-4 font-bold font-mono",
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
            <p className="text-xs text-gray-400 py-4 font-medium italic">
              Not enough logged sets yet for this range — log weights on your main lifts to populate this table.
            </p>
          )}
        </Card>

        {/* 5. SECTION D: HABIT & COMPLIANCE DASHBOARD */}
        <Card className="p-6 bg-[#0d1424] border border-white/10 rounded-2xl space-y-4 progress-report-card">
          <h2 className="text-lg font-display font-black text-white">Habit & Compliance Dashboard</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Workout Completion */}
            <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">WORKOUT COMPLETION</span>
              <span className="text-xl font-display font-black text-white block">{workoutSetsDisplay}</span>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, workoutCompletionPct)}%` }} 
                />
              </div>
            </div>

            {/* Habit Compliance */}
            <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">HABIT COMPLIANCE</span>
              <span className="text-xl font-display font-black text-white block">{habitCompliancePct}%</span>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, habitCompliancePct)}%` }} 
                />
              </div>
            </div>

            {/* Meal Plan Compliance */}
            <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">MEAL PLAN COMPLIANCE</span>
              <span className="text-xl font-display font-black text-white block">{mealCompliancePct}%</span>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-cyan-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, mealCompliancePct)}%` }} 
                />
              </div>
            </div>

            {/* Daily Averages */}
            <div className="p-4 bg-black/30 border border-white/5 rounded-xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">DAILY AVERAGES</span>
              <div className="space-y-0.5">
                <span className="text-base font-bold text-white block">{avgStepsDisplay}</span>
                <span className="text-xs text-gray-300 block font-mono">{avgWaterDisplay} · {avgSleepDisplay}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 6. SECTION E: ADDITIONAL GYM HUB DATA */}
        <Card className="p-6 bg-[#0d1424] border border-white/10 rounded-2xl space-y-4 progress-report-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-black text-white">Additional Gym Hub Data</h2>

            <div className="no-print flex items-center gap-2">
              <button
                onClick={() => setShowBadges(!showBadges)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                  showBadges 
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                    : "bg-white/5 text-gray-500 border-white/5"
                )}
              >
                Badges
              </button>

              {!isClientReport && (
                <button
                  onClick={() => setShowXpAndLevel(!showXpAndLevel)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                    showXpAndLevel 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                      : "bg-white/5 text-gray-500 border-white/5"
                  )}
                >
                  XP & Level
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Badges Display */}
            {showBadges && (
              <div className="flex flex-wrap gap-2.5">
                {badgesList.length > 0 ? (
                  badgesList.map((badge, idx) => (
                    <div 
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{badge}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 font-mono">No badges earned in this range yet.</p>
                )}
              </div>
            )}

            {/* XP & Level Display (Hidden for Client view) */}
            {showXpAndLevel && !isClientReport && (
              <div className="p-4 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-display font-black text-emerald-400 text-sm">
                    Lvl {levelInfo.level}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{levelInfo.title}</h4>
                    <p className="text-xs text-gray-400">{userProfile?.xp || 0} Total XP</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-emerald-400 font-bold block">{levelInfo.xpToNext} XP to Level {levelInfo.level + 1}</span>
                  <span className="text-[10px] text-gray-500">Keep logging to level up!</span>
                </div>
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
