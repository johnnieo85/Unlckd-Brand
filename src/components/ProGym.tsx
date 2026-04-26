import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Zap,
  Check,
  Footprints, 
  CheckCircle2, 
  Plus, 
  Minus, 
  TrendingUp, 
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
  GripVertical
} from 'lucide-react';
import { Card, Badge } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { gymService } from '../services/gymService';
import { DailyLog, SavedReport, Measurement, UserProfile, Badge as UserBadge } from '../types';
import { cn } from '../lib/utils';
import { updateGymPin, updateUserProfile } from '../services/accessService';

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
        className="absolute top-4 right-4 p-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <GripVertical className="w-4 h-4 text-gray-500" />
      </div>
      {children}
    </div>
  );
};

const Ring = ({ 
  progress, 
  color, 
  size = 120, 
  strokeWidth = 12, 
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
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative" style={{ width: size, height: size }}>
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
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{label}</span>
        <div className="text-sm font-mono font-bold text-gray-200">{Math.round(progress * 100)}%</div>
      </div>
    </div>
  );
};

export const ProGym = ({ 
  latestReport, 
  userProfile, 
  onProfileUpdate,
  onHomeClick 
}: { 
  latestReport: SavedReport | null; 
  userProfile: UserProfile | null; 
  onProfileUpdate?: () => void;
  onHomeClick?: () => void 
}) => {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [isMeasurementsExpanded, setIsMeasurementsExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [unlockedDates, setUnlockedDates] = useState<Set<string>>(new Set([new Date().toISOString().split('T')[0]]));
  const [isHubUnlocked, setIsHubUnlocked] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [pinSetup, setPinSetup] = useState({ pin: '', confirm: '' });
  const [error, setError] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [calendarDates, setCalendarDates] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'hub' | 'report'>('hub');
  const [trackerOrder, setTrackerOrder] = useState<string[]>(['hydration', 'movement']);

  useEffect(() => {
    if (userProfile?.userId) {
      const unlocked = sessionStorage.getItem(`gym_hub_unlocked_${userProfile.userId}`) === 'true';
      if (unlocked) setIsHubUnlocked(true);
    }
  }, [userProfile?.userId]);
  
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
    neck: 0
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const count = latestReport ? 84 : 7;
    // Initialize or adjust length
    if (calendarDates.length !== count) {
      const startDate = latestReport 
        ? (latestReport.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date(latestReport.timestamp))
        : new Date();
      
      if (!latestReport) {
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Sunday
      }
      startDate.setHours(0, 0, 0, 0);

      const initial = Array.from({ length: count }).map((_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
      });
      setCalendarDates(initial);
    }
  }, [latestReport, calendarDates.length]);

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

  const dayOfWeek = new Date(selectedDate).getDay();
  const dailyMessage = motivationalMessages[dayOfWeek] || "Consistency is the key to transformation.";

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
    
    // Calculate current week of 12
    let currentWeekIndex = 0;
    if (latestReport.timestamp) {
      try {
        const reportDate = latestReport.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date(latestReport.timestamp);
        const startDate = new Date(reportDate);
        startDate.setHours(0, 0, 0, 0);
        const targetDate = new Date(selectedDate);
        targetDate.setHours(0, 0, 0, 0);
        
        const diffTime = targetDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        currentWeekIndex = Math.max(0, Math.min(Math.floor(diffDays / 7), 11)); // 0-11 for 12 weeks
      } catch (e) {
        console.error("Error calculating week index", e);
      }
    }

    const weekData = latestReport.report.workoutPlan[currentWeekIndex] || latestReport.report.workoutPlan[0];
    if (!weekData?.days) return null;
    
    const planDays = weekData.days;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[dayOfWeek];

    // Try to find by name match first
    const byName = planDays.find(d => 
      d.day.toLowerCase().includes(currentDayName.toLowerCase()) || 
      currentDayName.toLowerCase().includes(d.day.toLowerCase())
    );
    if (byName) return byName;

    // Try to find by "Day X" where X matches day index (1-7)
    const byDayNumber = planDays.find(d => {
      const match = d.day.match(/Day\s*(\d+)/i);
      if (match) {
        const num = parseInt(match[1]);
        // Map 1-7 (Mon-Sun) to dayOfWeek (0=Sun, 1=Mon...)
        const targetDayOfWeek = num === 7 ? 0 : num;
        return targetDayOfWeek === dayOfWeek;
      }
      return false;
    });
    if (byDayNumber) return byDayNumber;

    // Fallback to cycling through available days
    return planDays[dayOfWeek % planDays.length];
  };

  const getMealsForSelectedDate = () => {
    if (!latestReport?.report.mealPlan) return null;
    
    let currentWeekIndex = 0;
    if (latestReport.timestamp) {
      try {
        const reportDate = latestReport.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date(latestReport.timestamp);
        const startDate = new Date(reportDate);
        startDate.setHours(0, 0, 0, 0);
        const targetDate = new Date(selectedDate);
        targetDate.setHours(0, 0, 0, 0);
        
        const diffTime = targetDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        currentWeekIndex = Math.max(0, Math.min(Math.floor(diffDays / 7), 11));
      } catch (e) {}
    }

    const weekData = latestReport.report.mealPlan[currentWeekIndex] || latestReport.report.mealPlan[0];
    if (!weekData?.days) return null;
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[dayOfWeek];

    return weekData.days.find(d => 
      d.day.toLowerCase().includes(currentDayName.toLowerCase()) || 
      currentDayName.toLowerCase().includes(d.day.toLowerCase())
    ) || weekData.days[dayOfWeek % weekData.days.length];
  };

  const toggleManualMode = () => {
    if (!log) return;
    const updatedLog = { ...log, useManualWorkout: !log.useManualWorkout };
    setLog(updatedLog);
    gymService.updateDailyLog(selectedDate, updatedLog);
  };

  const updateManualWorkout = (field: 'warmUp' | 'mainWork' | 'focus', value: string) => {
    if (!log) return;
    const updatedManual = {
      ...(log.manualWorkout || { warmUp: '', mainWork: '', focus: '' }),
      [field]: value
    };
    const updatedLog = { ...log, manualWorkout: updatedManual };
    setLog(updatedLog);
    gymService.updateDailyLog(selectedDate, updatedLog);
  };

  const addManualExercise = (section: 'warmUp' | 'mainWork') => {
    if (!log) return;
    const current = log.manualWorkout?.[section] || '';
    const updatedValue = current ? `${current}\nNew Exercise` : 'New Exercise';
    updateManualWorkout(section, updatedValue);
  };

  const updateManualExerciseName = (section: 'warmUp' | 'mainWork', index: number, newName: string) => {
    if (!log) return;
    const lines = (log.manualWorkout?.[section] || '').split('\n');
    lines[index] = newName;
    updateManualWorkout(section, lines.join('\n'));
  };

  const removeManualExercise = (section: 'warmUp' | 'mainWork', index: number) => {
    if (!log) return;
    const lines = (log.manualWorkout?.[section] || '').split('\n');
    lines.splice(index, 1);
    updateManualWorkout(section, lines.join('\n'));
  };

  const updateMealMacro = (index: number, field: 'calories' | 'protein' | 'fat' | 'carbs' | 'name', value: string) => {
    if (!log || !log.meals) return;
    const updatedMeals = [...log.meals];
    updatedMeals[index] = { ...updatedMeals[index], [field]: value };
    const updatedLog = { ...log, meals: updatedMeals };
    setLog(updatedLog);
    gymService.updateDailyLog(selectedDate, { meals: updatedMeals });
  };

  const toggleMealCompletion = (index: number) => {
    if (!log || !log.meals) return;
    const updatedMeals = [...log.meals];
    updatedMeals[index] = { ...updatedMeals[index], completed: !updatedMeals[index].completed };
    const updatedLog = { ...log, meals: updatedMeals };
    setLog(updatedLog);
    gymService.updateDailyLog(selectedDate, { meals: updatedMeals });
  };

  const handleAddManualMeal = async () => {
    if (!log) return;
    const currentMeals = log.meals || [];
    const newMeal = { name: 'New Meal', type: 'snack' as any, completed: false };
    const updatedMeals = [...currentMeals, newMeal];
    const updatedLog = { ...log, meals: updatedMeals, useManualWorkout: true };
    setLog(updatedLog);
    await gymService.updateDailyLog(selectedDate, { meals: updatedMeals, useManualWorkout: true });
  };

  const handleRemoveMeal = async (index: number) => {
    if (!log || !log.meals) return;
    const updatedMeals = log.meals.filter((_, i) => i !== index);
    const updatedLog = { ...log, meals: updatedMeals };
    setLog(updatedLog);
    await gymService.updateDailyLog(selectedDate, { meals: updatedMeals });
  };

  const workoutDay = getWorkoutForSelectedDate();
  const mealDay = getMealsForSelectedDate();

  // Helper to parse exercise name, sets, and reps
  const parseExercise = (rawEx: string) => {
    const rawText = rawEx.trim().replace(/^[-*]\s*/, '');
    
    // Extract URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatch = rawText.match(urlRegex);
    const textWithoutUrl = rawText.replace(urlRegex, '').replace(/[\[\]]/g, '').trim();

    // Extract sets/reps: looking for patterns like (3x10), 3 sets of 10, 3x10-12
    const setsRepsRegex = /(\d+)\s*(?:sets?\s*(?:of|x|—|\*|-)\s*)(\d+(?:-\d+)?)|(?:(\d+)\s*x\s*(\d+(?:-\d+)?))/i;
    const setsRepsMatch = textWithoutUrl.match(setsRepsRegex);
    
    let sets = '3-4';
    let reps = '8-12';
    let cleanName = textWithoutUrl;

    if (setsRepsMatch) {
      sets = setsRepsMatch[1] || setsRepsMatch[3];
      reps = setsRepsMatch[2] || setsRepsMatch[4];
      cleanName = textWithoutUrl.replace(setsRepsMatch[0], '').replace(/[()]/g, '').trim();
    } else {
      // Fallback for just name if no sets/reps detected
      cleanName = textWithoutUrl.replace(/[()]/g, '').trim();
    }

    return {
      name: cleanName,
      sets,
      reps,
      url: urlMatch ? urlMatch[0] : null
    };
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [latestReport, selectedDate]);

  const handleTrainingUpdate = (exerciseId: string, field: 'weight' | 'sets' | 'reps' | 'notes', value: string) => {
    if (!log) return;
    const currentData = log.workoutData || {};
    const exerciseData = currentData[exerciseId] || { weight: '', sets: '', reps: '', notes: '' };
    
    const updatedWorkoutData = {
      ...currentData,
      [exerciseId]: {
        ...exerciseData,
        [field]: value
      }
    };
    
    setLog({ ...log, workoutData: updatedWorkoutData });
    gymService.updateDailyLog(selectedDate, { workoutData: updatedWorkoutData });
  };

  const handleGeneralNotesUpdate = (notes: string) => {
    if (!log) return;
    setLog({ ...log, generalNotes: notes });
    gymService.updateDailyLog(selectedDate, { generalNotes: notes });
  };

  const loadData = async (date: string) => {
    setLoading(true);
    const [logData, measurementData] = await Promise.all([
      gymService.getDailyLog(date),
      gymService.getLatestMeasurements(5)
    ]);

    setMeasurements(measurementData);

    if (logData) {
      // Sync habits with profile master list (ensure new habits appear in old logs)
      const masterHabits = getHabitList();
      const currentHabits = logData.habits || {};
      const updatedHabits: Record<string, boolean> = {};
      let hasChanges = false;
      
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
        gymService.updateDailyLog(date, { habits: updatedHabits });
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
      const stepGoal = latestReport ? Math.max(10000, parseInt(latestReport.report.stepGoals.replace(/\D/g, '')) || 10000) : 10000;
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

      const initialLog: DailyLog = {
        id: selectedDate,
        date: selectedDate,
        steps: 0,
        stepGoal,
        water: 0,
        waterGoal,
        waterUnit,
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
        useManualWorkout: !latestReport
      };
      setLog(initialLog);
      await gymService.updateDailyLog(selectedDate, initialLog);
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
      // We rely on the parent updating the userProfile prop, or we just use local state if we had it.
      // But since userProfile is a prop, we should ideally trigger a refresh in App.tsx
      // For now, let's assume we want to see it immediately
    } catch (e) {
      setError('Failed to update habits');
    }
  };

  const calculateXP = () => {
    if (!log) return 0;
    let xp = 0;
    xp += Math.min(log.steps / log.stepGoal, 1) * 500;
    xp += Math.min(log.water / log.waterGoal, 1) * 300;
    xp += log.completedWorkouts * 1000;
    const completedMeals = (log.meals || []).filter(m => m.completed).length;
    xp += completedMeals * 100;
    const completedHabits = habitList.filter(habit => log.habits?.[habit]).length;
    xp += completedHabits * 200;
    return Math.round(xp);
  };

  const handleAddMeasurement = async () => {
    if (!newMeasurement.weight) return;
    const measurement: Omit<Measurement, 'id' | 'timestamp'> = {
      date: today,
      weight: Number(newMeasurement.weight),
      bodyFat: Number(newMeasurement.bodyFat),
      waist: Number(newMeasurement.waist),
      chest: Number(newMeasurement.chest),
      leftArm: Number(newMeasurement.leftArm),
      rightArm: Number(newMeasurement.rightArm),
      leftThigh: Number(newMeasurement.leftThigh),
      rightThigh: Number(newMeasurement.rightThigh),
      neck: Number(newMeasurement.neck),
      units: measurementUnits
    };
    await gymService.addMeasurement(measurement);
    setIsAddingMeasurement(false);
    loadData(selectedDate);
  };

  const toggleWaterUnit = async () => {
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
    await gymService.updateDailyLog(today, updated);
  };

  const updateWater = async (amount: number) => {
    if (!log) return;
    const newWater = Math.max(0, log.water + amount);
    setLog({ ...log, water: newWater });
    await gymService.updateDailyLog(today, { water: newWater });
  };

  const updateSteps = async (amount: number) => {
    if (!log) return;
    const newSteps = Math.max(0, log.steps + amount);
    setLog({ ...log, steps: newSteps });
    await gymService.updateDailyLog(today, { steps: newSteps });
  };

  const toggleHabit = async (habit: string) => {
    if (!log) return;
    const newHabits = { ...log.habits, [habit]: !log.habits?.[habit] };
    setLog({ ...log, habits: newHabits });
    await gymService.updateDailyLog(today, { habits: newHabits });
  };

  const handlePinSubmit = () => {
    if (!userProfile) return;
    if (pinEntry.trim() === userProfile.gymPin?.toString().trim()) {
      setIsHubUnlocked(true);
      sessionStorage.setItem(`gym_hub_unlocked_${userProfile.userId}`, 'true');
      setError('');
    } else {
      setError('Incorrect PIN. Please try again.');
      setPinEntry('');
    }
  };

  const handlePinSetup = async () => {
    if (!userProfile) return;
    if (pinSetup.pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }
    if (pinSetup.pin !== pinSetup.confirm) {
      setError('PINs do not match.');
      return;
    }
    
    try {
      await updateGymPin(userProfile.userId, pinSetup.pin.trim());
      setIsHubUnlocked(true);
      setIsSettingPin(false);
      sessionStorage.setItem(`gym_hub_unlocked_${userProfile.userId}`, 'true');
      setError('');
      if (onProfileUpdate) onProfileUpdate();
      // In a real app, you might want to refresh the profile state here
      // But for now, we set the unlock state directly
    } catch (e) {
      setError('Failed to save PIN. Please try again.');
    }
  };

  const loadReportData = async () => {
    setIsReportLoading(true);
    // Get all dates for the specific month in reportDate
    const year = reportDate.getFullYear();
    const month = reportDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const logs = await gymService.getLogsInRange(firstDay, lastDay);
    setReportLogs(logs);
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

  if (!isHubUnlocked) {
    const hasPin = !!userProfile?.gymPin;
    const isFirstTime = !hasPin && !isSettingPin;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 space-y-8 bg-brand-surface border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-primary/0 via-brand-primary to-brand-primary/0" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-brand-primary/10 rounded-3xl">
                {isFirstTime ? <Lock className="w-8 h-8 text-red-500" /> : (isSettingPin ? <Sparkles className="w-8 h-8 text-brand-primary" /> : <Lock className="w-8 h-8 text-brand-primary" />)}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-display font-black text-white">
                  {isFirstTime ? "Access Restricted" : (isSettingPin ? "Update Your PIN" : "Gym Hub Locked")}
                </h2>
                <p className="text-gray-500 text-sm">
                  {isFirstTime 
                    ? "Your Hub access has not been granted. Please contact your UNLCKD instructor for your personal PIN." 
                    : (isSettingPin ? "Enter your new personal PIN below." : "Enter your secure PIN to access your optimization hub.")}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {isFirstTime ? (
                <div className="pt-4 flex flex-col items-center">
                   <div className="p-4 bg-white/5 rounded-2xl text-center">
                     <p className="text-xs text-gray-400 font-medium">Once your instructor provides your PIN, you will be able to unlock your personalized training environment.</p>
                   </div>
                </div>
              ) : isSettingPin ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">New 4-6 Digit PIN</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="••••"
                      value={pinSetup.pin}
                      onChange={(e) => setPinSetup(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                      className="text-center text-2xl tracking-[1em] font-mono bg-white/5 border-white/10"
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Confirm PIN</label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="••••"
                      value={pinSetup.confirm}
                      onChange={(e) => setPinSetup(prev => ({ ...prev, confirm: e.target.value.replace(/\D/g, '') }))}
                      className="text-center text-2xl tracking-[1em] font-mono bg-white/5 border-white/10"
                      maxLength={6}
                    />
                  </div>
                  <Button 
                    className="w-full h-12 rounded-xl text-brand-dark" 
                    onClick={handlePinSetup}
                  >
                    Update PIN
                  </Button>
                  <Button 
                    variant="ghost"
                    className="w-full text-gray-500 text-xs hover:text-white" 
                    onClick={() => {
                      setIsSettingPin(false);
                      setIsHubUnlocked(true);
                      setError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="••••"
                    value={pinEntry}
                    onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                    className="text-center text-3xl tracking-[1em] font-mono bg-white/5 border-white/10 h-16"
                    maxLength={6}
                    autoFocus
                  />
                  <Button 
                    className="w-full h-14 rounded-2xl text-brand-dark font-black text-lg" 
                    onClick={handlePinSubmit}
                  >
                    Unlock Hub
                  </Button>
                </div>
              )}

              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-xs font-bold text-center"
                >
                  {error}
                </motion.p>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Privacy & Security Focus</span>
              <p className="text-[10px] text-center text-gray-600 px-4">
                Your data is encrypted and only accessible via your personal device and account.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* Hero Header - Refined for mobile */}
      <div className="relative min-h-[140px] md:h-48 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden group">
        <div className="absolute inset-0 bg-brand-primary opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent)]" />
        <div className="relative h-full flex flex-col md:flex-row items-center justify-between p-6 md:px-10 gap-6">
          <div className="flex flex-col justify-center text-center md:text-left">
            <Badge className="w-fit mb-3 bg-brand-primary/20 text-brand-primary border-brand-primary/20 mx-auto md:mx-0 text-[9px] md:text-xs">PREMIUM EXPERIENCE</Badge>
            <h1 
              className={cn(
                "text-2xl md:text-5xl font-display font-black text-white tracking-tighter",
                onHomeClick && "cursor-pointer hover:text-brand-primary transition-colors"
              )}
              onClick={onHomeClick}
            >
              UNLCKD <span className="text-brand-primary">PRO GYM</span>
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
              <button 
                onClick={() => setActiveView('hub')}
                className={cn(
                  "text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all",
                  activeView === 'hub' ? "text-brand-primary" : "text-gray-500 hover:text-gray-300"
                )}
              >
                Dashboard
              </button>
              <div className="w-1 h-1 rounded-full bg-gray-800" />
              <button 
                onClick={() => setActiveView('report')}
                className={cn(
                  "text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all",
                  activeView === 'report' ? "text-brand-primary" : "text-gray-500 hover:text-gray-300"
                )}
              >
                Consistency
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 md:h-11 md:w-11 bg-white/5 border-white/10 hover:bg-white/10 rounded-xl md:rounded-2xl shrink-0"
              onClick={() => {
                setIsHubUnlocked(false);
                sessionStorage.removeItem(`gym_hub_unlocked_${userProfile?.userId}`);
              }}
              title="Lock Hub"
            >
              <Lock className="w-4 h-4 text-gray-400" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 md:h-11 md:w-11 bg-white/5 border-white/10 hover:bg-white/10 rounded-xl md:rounded-2xl shrink-0"
              onClick={() => {
                setIsSettingPin(true);
                setIsHubUnlocked(false);
                setPinSetup({ pin: '', confirm: '' });
                setError('');
              }}
              title="Change PIN"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        </div>
      </div>

      {activeView === 'hub' ? (
        <>
      {/* Daily Navigation */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <div className="relative group/header-date">
            <input 
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setUnlockedDates(prev => new Set([...prev, e.target.value]));
              }}
            />
            <div className="flex items-center gap-2 cursor-pointer">
              <Calendar className="w-4 h-4 text-brand-primary group-hover/header-date:scale-110 transition-all" />
              <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover/header-date:text-white transition-colors">
                {latestReport ? `Report Schedule • Week ${Math.floor((new Date(selectedDate).getTime() - (latestReport.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date(latestReport.timestamp)).setHours(0,0,0,0)) / (7 * 24 * 60 * 60 * 1000)) + 1}` : 'Weekly Activity'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {latestReport && (
              <div className="relative group/week">
                <select 
                  onChange={(e) => {
                    const week = parseInt(e.target.value);
                    const startDate = latestReport.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date(latestReport.timestamp);
                    startDate.setHours(0,0,0,0);
                    const targetDate = new Date(startDate);
                    targetDate.setDate(targetDate.getDate() + (week - 1) * 7);
                    setSelectedDate(targetDate.toISOString().split('T')[0]);
                    setUnlockedDates(prev => new Set([...prev, targetDate.toISOString().split('T')[0]]));
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                  value={Math.floor((new Date(selectedDate).getTime() - (latestReport.timestamp?.toDate ? latestReport.timestamp.toDate() : new Date(latestReport.timestamp)).setHours(0,0,0,0)) / (7 * 24 * 60 * 60 * 1000)) + 1}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i + 1}>Week {i + 1}</option>
                  ))}
                </select>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-3 text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 group-hover/week:text-brand-primary border border-white/5"
                >
                  Jump to Week
                </Button>
              </div>
            )}
            {selectedDate !== today && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDate(today)}
                className="h-7 px-3 text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 rounded-lg text-brand-primary"
              >
                Back to Today
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">
          {calendarDates.map((iso, i) => {
            const d = new Date(iso + 'T12:00:00'); // Use noon to avoid TZ issues
            const isSelected = selectedDate === iso;
            const isUnlocked = unlockedDates.has(iso);
            const isToday = iso === today;
            const weekNum = Math.floor(i / 7) + 1;
            const isFirstDayOfWeek = i % 7 === 0;

            return (
              <React.Fragment key={`${iso}-${i}`}>
                {latestReport && isFirstDayOfWeek && i > 0 && (
                  <div className="flex items-center px-4 self-stretch">
                    <div className="h-full w-px bg-white/10" />
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedDate(iso);
                    setUnlockedDates(prev => new Set([...prev, iso]));
                  }}
                  className={cn(
                    "flex flex-col items-center min-w-[70px] p-4 rounded-2xl border transition-all relative group shadow-sm",
                    isSelected 
                      ? "bg-brand-primary border-brand-primary text-brand-dark" 
                      : "bg-brand-surface border-white/5 text-gray-500 hover:border-white/10"
                  )}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <div className="relative">
                    <span className="text-lg font-bold font-mono">{d.getDate()}</span>
                    <input 
                      type="date"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      value={iso}
                      onChange={(e) => {
                        const newIso = e.target.value;
                        const newDates = [...calendarDates];
                        newDates[i] = newIso;
                        setCalendarDates(newDates);
                        setSelectedDate(newIso);
                        setUnlockedDates(prev => new Set([...prev, newIso]));
                      }}
                      title="Change Date"
                    />
                  </div>
                  
                  <div className="mt-2">
                    {isUnlocked || isSelected ? (
                      <LockOpen className={cn("w-3 h-3", isSelected ? "text-brand-dark" : "text-brand-primary")} />
                    ) : (
                      <Lock className="w-3 h-3 text-gray-600" />
                    )}
                  </div>
                  
                  {isToday && !isSelected && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  )}

                  {latestReport && isFirstDayOfWeek && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-[7px] font-black text-brand-primary uppercase tracking-tighter">W{weekNum}</span>
                    </div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Rings & Main Stats */}
        <div className="lg:col-span-2 space-y-8">
          {latestReport?.report.motivationalQuote && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-3xl"
            >
              <p className="text-xl font-display font-medium text-brand-primary italic">
                "{latestReport.report.motivationalQuote.text}"
              </p>
              <p className="text-xs text-brand-primary/60 mt-2 uppercase tracking-widest font-bold">
                — Daily Fuel • Unlock your greatness.
              </p>
            </motion.div>
          )}

          <Card className="p-6 md:p-10 bg-brand-surface border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 hidden md:block">
              <Activity className="w-32 h-32 text-brand-primary" />
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
              <div className="grid grid-cols-3 gap-4 md:flex md:gap-8 w-full md:w-auto">
                <div className="flex justify-center">
                  <Ring 
                    progress={log.steps / log.stepGoal} 
                    color="#10b981" 
                    icon={Footprints} 
                    label="Steps" 
                  />
                </div>
                <div className="flex justify-center">
                  <Ring 
                    progress={log.water / log.waterGoal} 
                    color="#3b82f6" 
                    icon={Droplets} 
                    label="Hydration" 
                  />
                </div>
                <div className="flex justify-center">
                  <Ring 
                    progress={log.completedWorkouts > 0 ? 1 : 0} 
                    color="#fbbf24" 
                    icon={Dumbbell} 
                    label="Workout" 
                  />
                </div>
              </div>
              
              <div className="flex-1 space-y-4 md:space-y-6 w-full text-center md:text-left">
                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-display font-bold text-white">Daily Consistency</h3>
                  <p className="text-xs md:text-sm text-gray-500 italic px-4 md:px-0">{dailyMessage}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-brand-primary" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Streak</span>
                    </div>
                    <div className="text-xl font-mono font-bold text-white">4 Days</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-brand-primary" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase">XP Earned</span>
                    </div>
                    <div className="text-xl font-mono font-bold text-white">{calculateXP().toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Logs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={trackerOrder}
                strategy={verticalListSortingStrategy}
              >
                {trackerOrder.map((id) => (
                  <SortableTracker key={id} id={id}>
                    {id === 'hydration' ? (
                      <Card className="p-8 space-y-6 bg-brand-surface border-white/5 h-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                              <Droplets className="w-5 h-5 text-blue-500" />
                            </div>
                            <h3 className="font-bold text-gray-200">Hydration</h3>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={toggleWaterUnit}
                              className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md hover:bg-white/10 active:scale-95 transition-all text-gray-500 hover:text-blue-400"
                            >
                              {log.waterUnit}
                            </button>
                            <span className="font-mono text-sm text-gray-400">{log.water}/{log.waterGoal} {log.waterUnit}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            {(() => {
                              const increments = log.waterUnit === 'oz' ? [8, 16, 24] : [250, 500, 750];
                              const baseMinus = log.waterUnit === 'oz' ? -8 : -250;
                              return (
                                <>
                                  <Button 
                                    variant="outline"
                                    className="flex-none w-10 border-white/5 hover:border-red-500/30 hover:bg-red-500/5 transition-all p-0"
                                    onClick={() => updateWater(baseMinus)}
                                  >
                                    <Minus className="w-3 h-3 text-red-400" />
                                  </Button>
                                  <div className="flex-1 flex gap-2">
                                    {increments.map((amount) => (
                                      <Button 
                                        key={amount}
                                        variant="outline"
                                        className="flex-1 border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-xs"
                                        onClick={() => updateWater(amount)}
                                      >
                                        +{amount}
                                      </Button>
                                    ))}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((log.water / log.waterGoal) * 100, 100)}%` }}
                          />
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-8 space-y-6 bg-brand-surface border-white/5 h-full">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                              <Footprints className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h3 className="font-bold text-gray-200">Movement</h3>
                          </div>
                          <span className="font-mono text-sm text-gray-400">{log.steps}/{log.stepGoal}</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-none w-10 border-white/5 hover:border-red-500/30 p-0"
                            onClick={() => updateSteps(-1000)}
                          >
                            <Minus className="w-3 h-3 text-red-400" />
                          </Button>
                          <div className="flex-1 flex gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1 border-white/5 text-xs"
                              onClick={() => updateSteps(1000)}
                            >
                              +1k Steps
                            </Button>
                            <Button 
                              variant="outline" 
                              className="flex-1 border-white/5 text-xs"
                              onClick={() => updateSteps(5000)}
                            >
                              +5k Steps
                            </Button>
                          </div>
                        </div>

                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((log.steps / log.stepGoal) * 100, 100)}%` }}
                          />
                        </div>
                      </Card>
                    )}
                  </SortableTracker>
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Workout Details */}
          <Card className="p-8 bg-brand-surface border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-lg">
                  <Dumbbell className="w-5 h-5 text-brand-primary" />
                </div>
                <h3 className="font-bold text-gray-100">
                  {log?.useManualWorkout ? 'Manual Training Log' : 'Prescribed Training'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {latestReport && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3 h-7",
                      log?.useManualWorkout ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary" : "border-white/5 opacity-60"
                    )}
                    onClick={toggleManualMode}
                  >
                    {log?.useManualWorkout ? 'Using Manual Mode' : 'Switch to Manual'}
                  </Button>
                )}
                {!latestReport && (
                  <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/20 font-black text-[10px]">MANUAL MODE</Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {(log?.useManualWorkout || !latestReport) && (
                <div className="space-y-4 mb-4">
                  <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
                    <p className="text-xs font-bold text-brand-primary mb-2">Manual Entry Mode</p>
                    <p className="text-[10px] text-brand-primary/60">Customize your training focus below. Add exercises directly in the tables below.</p>
                  </div>
                  <Input 
                    label="Today's Training Focus"
                    placeholder="e.g. Hypertrophy: Chest & Back"
                    value={log.manualWorkout?.focus || ''}
                    onChange={(e) => updateManualWorkout('focus', e.target.value)}
                  />
                </div>
              )}

              {!(log?.useManualWorkout || !latestReport) && (
                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-brand-primary" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Focus & Objectives</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {latestReport?.report.goalAlignmentSummary}
                  </p>
                </div>
              )}

                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest block">Warm-Up Sequence</span>
                        {(log?.useManualWorkout || !latestReport) && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => addManualExercise('warmUp')}
                            className="h-6 px-2 text-[9px] font-black uppercase bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
                        <button 
                          onClick={() => setMeasurementUnits(prev => ({ ...prev, weight: 'kg' }))}
                          className={cn("text-[9px] font-black px-2 py-1 rounded transition-all", measurementUnits.weight === 'kg' ? "bg-brand-primary text-brand-dark" : "text-gray-500")}
                        >
                          KG
                        </button>
                        <button 
                          onClick={() => setMeasurementUnits(prev => ({ ...prev, weight: 'lbs' }))}
                          className={cn("text-[9px] font-black px-2 py-1 rounded transition-all", measurementUnits.weight === 'lbs' ? "bg-brand-primary text-brand-dark" : "text-gray-500")}
                        >
                          LBS
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                      <table className="w-full text-left min-w-[500px]">
                        <thead className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-white/5">
                          <tr>
                            <th className="pb-2 font-bold w-1/2">Exercise</th>
                            <th className="pb-2 font-bold px-4 text-center">Sets</th>
                            <th className="pb-2 font-bold px-4 text-center">Reps</th>
                            <th className="pb-2 font-bold min-w-[100px] text-center">Weight ({measurementUnits.weight})</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {(workoutDay?.warmUp || 'Dynamic mobility flow, Walking lunges').split(/,|\n/).filter(line => line.trim()).map((ex, i) => {
                            const { name, sets, reps, url } = parseExercise(ex);
                            const exerciseId = `warmup-${i}`;
                            return (
                              <tr key={i} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                                <td className="py-3 text-brand-primary font-bold">
                                  {(log?.useManualWorkout || !latestReport) ? (
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="text"
                                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-brand-primary outline-none focus:border-brand-primary w-full"
                                        value={name}
                                        onChange={(e) => updateManualExerciseName('warmUp', i, e.target.value)}
                                      />
                                      <button 
                                        onClick={() => removeManualExercise('warmUp', i)}
                                        className="text-red-500/50 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : url ? (
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                      {name}
                                    </a>
                                  ) : (
                                    name
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <input 
                                    type="text" 
                                    placeholder={sets || '2-3'}
                                    className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white focus:border-brand-primary outline-none transition-colors"
                                    value={log?.workoutData?.[exerciseId]?.sets || ''}
                                    onChange={(e) => handleTrainingUpdate(exerciseId, 'sets', e.target.value)}
                                  />
                                </td>
                                <td className="py-3 px-4">
                                  <input 
                                    type="text" 
                                    placeholder={reps || '12-15'}
                                    className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white focus:border-brand-primary outline-none transition-colors"
                                    value={log?.workoutData?.[exerciseId]?.reps || ''}
                                    onChange={(e) => handleTrainingUpdate(exerciseId, 'reps', e.target.value)}
                                  />
                                </td>
                                <td className="py-3 pr-2">
                                  <input 
                                    type="text" 
                                    placeholder="0"
                                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white focus:border-brand-primary outline-none transition-colors"
                                    value={log?.workoutData?.[exerciseId]?.weight || ''}
                                    onChange={(e) => handleTrainingUpdate(exerciseId, 'weight', e.target.value)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between pl-1">
                    <span className="text-[10px] font-black uppercase text-brand-primary tracking-widest block">{workoutDay?.focus || 'Primary Training Grid'}</span>
                    {(log?.useManualWorkout || !latestReport) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => addManualExercise('mainWork')}
                        className="h-6 px-2 text-[9px] font-black uppercase bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Exercise
                      </Button>
                    )}
                  </div>
                  <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                    <table className="w-full text-left min-w-[500px]">
                      <thead className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-brand-primary/10">
                        <tr>
                          <th className="pb-2 font-bold w-1/2">Exercise Pattern</th>
                          <th className="pb-2 font-bold px-4 text-center">Sets</th>
                          <th className="pb-2 font-bold px-4 text-center">Reps</th>
                          <th className="pb-2 font-bold min-w-[100px] text-center">Weight ({measurementUnits.weight})</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {(workoutDay?.mainWork || '').split('\n').filter(line => line.trim()).map((ex, i) => {
                          const { name, sets, reps, url } = parseExercise(ex);
                          const exerciseId = `main-${i}`;
                          
                          return (
                            <tr key={i} className="border-b border-white/[0.02] last:border-0 hover:bg-brand-primary/[0.02] transition-colors group">
                               <td className="py-4 text-brand-primary font-bold">
                                  {(log?.useManualWorkout || !latestReport) ? (
                                    <div className="flex items-center gap-2">
                                      <input 
                                        type="text"
                                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-brand-primary outline-none focus:border-brand-primary w-full font-bold"
                                        value={name}
                                        onChange={(e) => updateManualExerciseName('mainWork', i, e.target.value)}
                                      />
                                      <button 
                                        onClick={() => removeManualExercise('mainWork', i)}
                                        className="text-red-500/50 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
                                        <Dumbbell className="w-3 h-3 text-gray-600" />
                                      </div>
                                      {url ? (
                                        <a 
                                          href={url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-brand-primary font-bold hover:underline"
                                        >
                                          {name}
                                        </a>
                                      ) : (
                                        <span className="font-bold text-brand-primary">{name}</span>
                                      )}
                                    </div>
                                  )}
                               </td>
                              <td className="py-4 px-4">
                                <input 
                                  type="text" 
                                  placeholder={sets || '3-4'}
                                  className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white focus:border-brand-primary outline-none transition-colors"
                                  value={log?.workoutData?.[exerciseId]?.sets || ''}
                                  onChange={(e) => handleTrainingUpdate(exerciseId, 'sets', e.target.value)}
                                />
                              </td>
                               <td className="py-4 px-4">
                                 <input 
                                  type="text" 
                                  placeholder={reps || '8-12'}
                                  className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white focus:border-brand-primary outline-none transition-colors"
                                  value={log?.workoutData?.[exerciseId]?.reps || ''}
                                  onChange={(e) => handleTrainingUpdate(exerciseId, 'reps', e.target.value)}
                                />
                               </td>
                               <td className="py-4 pr-2">
                                <input 
                                  type="text" 
                                  placeholder="0"
                                  className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white focus:border-brand-primary outline-none transition-colors"
                                  value={log?.workoutData?.[exerciseId]?.weight || ''}
                                  onChange={(e) => handleTrainingUpdate(exerciseId, 'weight', e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
              </div>
            </Card>

          {/* Meal Log */}
          <Card className="p-8 bg-brand-surface border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-lg">
                  <Utensils className="w-5 h-5 text-brand-primary" />
                </div>
                <h3 className="font-bold text-gray-100">Daily Nutrition Log</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddManualMeal}
                  className="border-brand-primary/20 hover:bg-brand-primary/10 text-brand-primary h-7 px-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Meal
                </Button>
                {latestReport && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={importMealsFromPlan}
                    className="border-brand-primary/20 hover:bg-brand-primary/10 text-brand-primary h-7 px-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    Sync from Plan
                  </Button>
                )}
                <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/20 font-black text-[10px]">
                  {log?.useManualWorkout ? 'MANUAL EDITS ENABLED' : 'GUIDED PLAN'}
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-brand-primary/10">
                  <tr>
                    <th className="pb-2 font-bold w-1/3">Meal</th>
                    <th className="pb-2 font-bold px-4 text-center">Cal</th>
                    <th className="pb-2 font-bold px-4 text-center">Prot</th>
                    <th className="pb-2 font-bold px-4 text-center">Fat</th>
                    <th className="pb-2 font-bold px-4 text-center">Carbs</th>
                    <th className="pb-2 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {log.meals?.map((meal, i) => (
                    <tr key={i} className="border-b border-white/[0.02] last:border-0 hover:bg-brand-primary/[0.02] transition-colors group">
                      <td className="py-4">
                        <div className="flex flex-col">
                          {log.useManualWorkout ? (
                            <div className="flex flex-col gap-1 mb-1">
                              <select 
                                className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[9px] uppercase font-black text-gray-400 outline-none focus:border-brand-primary w-fit"
                                value={meal.type}
                                onChange={(e) => updateMealMacro(i, 'type' as any, e.target.value)}
                              >
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                                <option value="snack">Snack</option>
                                <option value="other">Other</option>
                              </select>
                              <input 
                                type="text"
                                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-brand-primary outline-none focus:border-brand-primary w-full font-bold"
                                value={meal.name}
                                onChange={(e) => updateMealMacro(i, 'name', e.target.value)}
                              />
                            </div>
                          ) : (
                            <>
                              <span className="text-[10px] uppercase font-black text-gray-500 mb-1">{meal.type}</span>
                              {meal.url ? (
                                <a href={meal.url} target="_blank" rel="noopener noreferrer" className="text-brand-primary font-bold hover:underline">
                                  {meal.name}
                                </a>
                              ) : (
                                <span className="text-brand-primary font-bold">{meal.name}</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <input 
                          type="text" 
                          placeholder="-"
                          disabled={!log.useManualWorkout}
                          className={cn(
                            "w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white outline-none transition-colors",
                            log.useManualWorkout ? "focus:border-brand-primary" : "opacity-50"
                          )}
                          value={meal.calories || ''}
                          onChange={(e) => updateMealMacro(i, 'calories', e.target.value)}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <input 
                          type="text" 
                          placeholder="-"
                          disabled={!log.useManualWorkout}
                          className={cn(
                            "w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white outline-none transition-colors",
                            log.useManualWorkout ? "focus:border-brand-primary" : "opacity-50"
                          )}
                          value={meal.protein || ''}
                          onChange={(e) => updateMealMacro(i, 'protein', e.target.value)}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <input 
                          type="text" 
                          placeholder="-"
                          disabled={!log.useManualWorkout}
                          className={cn(
                            "w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white outline-none transition-colors",
                            log.useManualWorkout ? "focus:border-brand-primary" : "opacity-50"
                          )}
                          value={meal.fat || ''}
                          onChange={(e) => updateMealMacro(i, 'fat', e.target.value)}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <input 
                          type="text" 
                          placeholder="-"
                          disabled={!log.useManualWorkout}
                          className={cn(
                            "w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-center font-mono text-white outline-none transition-colors",
                            log.useManualWorkout ? "focus:border-brand-primary" : "opacity-50"
                          )}
                          value={meal.carbs || ''}
                          onChange={(e) => updateMealMacro(i, 'carbs', e.target.value)}
                        />
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {log.useManualWorkout && (
                            <button 
                              onClick={() => handleRemoveMeal(i)}
                              className="p-2 text-red-500/50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => toggleMealCompletion(i)}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              meal.completed ? "bg-brand-primary/20 text-brand-primary" : "bg-white/5 text-gray-500 hover:bg-white/10"
                            )}
                          >
                            {meal.completed ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Measurements */}
          <Card className="p-8 bg-brand-surface border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Ruler className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="font-bold text-gray-100">Body Measurements</h3>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsMeasurementsExpanded(!isMeasurementsExpanded)}
                  className="text-gray-500 hover:text-white"
                >
                  {isMeasurementsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddingMeasurement(true)}
                  className="border-white/10 hover:bg-white/5"
                >
                  Log New
                </Button>
              </div>
            </div>

            {isAddingMeasurement ? (
              <div className="space-y-6 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                <div className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                   <div className="flex-1 space-y-2">
                     <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest pl-1">Weight Unit</span>
                     <div className="flex gap-1 p-1 bg-brand-dark rounded-lg">
                       {(['kg', 'lbs'] as const).map(u => (
                         <button 
                           key={u}
                           onClick={() => setMeasurementUnits({...measurementUnits, weight: u})}
                           className={cn(
                             "flex-1 py-1 rounded text-[10px] uppercase font-black tracking-widest transition-all",
                             measurementUnits.weight === u ? "bg-brand-primary text-brand-dark" : "text-gray-500 hover:text-gray-300"
                           )}
                         >
                           {u}
                         </button>
                       ))}
                     </div>
                   </div>
                   <div className="flex-1 space-y-2">
                     <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest pl-1">Length Unit</span>
                     <div className="flex gap-1 p-1 bg-brand-dark rounded-lg">
                       {(['cm', 'in'] as const).map(u => (
                         <button 
                           key={u}
                           onClick={() => setMeasurementUnits({...measurementUnits, length: u})}
                           className={cn(
                             "flex-1 py-1 rounded text-[10px] uppercase font-black tracking-widest transition-all",
                             measurementUnits.length === u ? "bg-brand-primary text-brand-dark" : "text-gray-500 hover:text-gray-300"
                           )}
                         >
                           {u}
                         </button>
                       ))}
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Input 
                    label={`Weight (${measurementUnits.weight})`} 
                    type="number" 
                    value={newMeasurement.weight || ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, weight: Number(e.target.value)})}
                  />
                  <Input 
                    label="Body Fat (%)" 
                    type="number" 
                    value={newMeasurement.bodyFat || ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, bodyFat: Number(e.target.value)})}
                  />
                  <Input 
                    label={`Neck (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.neck || ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, neck: Number(e.target.value)})}
                  />
                  <Input 
                    label={`Chest (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.chest || ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, chest: Number(e.target.value)})}
                  />
                  <Input 
                    label={`Waist (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.waist || ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, waist: Number(e.target.value)})}
                  />
                   <Input 
                    label={`L.Arm (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.leftArm || ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, leftArm: Number(e.target.value)})}
                  />
                   <Input 
                    label={`R.Arm (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.rightArm || ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, rightArm: Number(e.target.value)})}
                  />
                   <Input 
                    label={`L.Thigh (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.leftThigh || ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, leftThigh: Number(e.target.value)})}
                  />
                   <Input 
                    label={`R.Thigh (${measurementUnits.length})`} 
                    type="number" 
                    value={newMeasurement.rightThigh || ''} 
                    onChange={e => setNewMeasurement({...newMeasurement, rightThigh: Number(e.target.value)})}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <Button variant="ghost" onClick={() => setIsAddingMeasurement(false)}>Cancel</Button>
                  <Button className="bg-brand-primary text-brand-dark px-10" onClick={handleAddMeasurement}>Save Log</Button>
                </div>
              </div>
            ) : isMeasurementsExpanded && measurements.length > 0 ? (
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
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {measurements.map((m) => (
                      <tr key={m.id} className="border-b border-white/[0.02] last:border-0">
                        <td className="py-4 text-gray-400">{new Date(m.date).toLocaleDateString()}</td>
                        <td className="py-4 font-mono text-gray-200">{m.weight}{m.units?.weight || 'kg'}</td>
                        <td className="py-4 font-mono text-gray-200">{m.bodyFat || 0}%</td>
                        <td className="py-4 font-mono text-gray-200">
                          {m.waist || '-'}{m.units?.length || 'cm'} / {m.neck || '-'}{m.units?.length || 'cm'}
                        </td>
                        <td className="py-4 font-mono text-gray-200">
                          {m.leftArm || '-'}/{m.rightArm || '-'}{m.units?.length || 'cm'}
                        </td>
                        <td className="py-4 font-mono text-gray-200">
                          {m.leftThigh || '-'}/{m.rightThigh || '-'}{m.units?.length || 'cm'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          <Card className="p-8 bg-brand-surface border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                </div>
                <h3 className="font-bold text-gray-100">Daily Habits</h3>
              </div>
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
            </div>
            
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
                        {(habit.toLowerCase().includes('stretching') || habit.toLowerCase().includes('mobility')) && <Zap className="w-4 h-4" />}
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
          </Card>

          <Card className="p-8 bg-brand-primary border-none text-brand-dark">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Level 4</h4>
                <h3 className="text-2xl font-display font-black tracking-tighter">ELITE ATHLETE</h3>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span>Progress to Level 5</span>
                  <span>75%</span>
                </div>
                <div className="h-2 bg-brand-dark/10 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-dark w-3/4" />
                </div>
              </div>
              <p className="text-[10px] uppercase font-bold opacity-70">Unlock "Legendary Physique" Badge at Level 10</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Monthly Goal & Badges Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 bg-brand-surface border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Target className="w-40 h-40 text-brand-primary" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-brand-primary" />
              </div>
              <h3 className="font-bold text-gray-100 uppercase tracking-widest text-sm">Monthly Objective</h3>
            </div>
            
            {userProfile?.monthlyGoal ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-2xl font-display font-black text-white">{userProfile.monthlyGoal.title}</h4>
                  <p className="text-gray-400 mt-2 text-sm leading-relaxed">{userProfile.monthlyGoal.description}</p>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Deadline</span>
                    <p className="text-gray-200 text-sm font-mono">{new Date(userProfile.monthlyGoal.deadline).toLocaleDateString()}</p>
                  </div>
                  <Badge className={cn(
                    "px-4 py-2 rounded-xl border-none font-black uppercase tracking-tighter",
                    userProfile.monthlyGoal.completed ? "bg-brand-primary text-brand-dark" : "bg-white/5 text-gray-500"
                  )}>
                    {userProfile.monthlyGoal.completed ? "Mission Complete" : "In Progress"}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 italic">No monthly goal set for this period.</p>
            )}
          </div>
          
          <div className="mt-8 p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl flex items-center gap-4">
             <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Footprints className="w-8 h-8 text-brand-primary" />
             </div>
             <div>
                <p className="text-[10px] text-brand-primary font-black uppercase tracking-widest">Victory Reward</p>
                <h5 className="text-lg font-display font-bold text-white tracking-tight">The "Stepper" Elite Badge</h5>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Achieve 10,000 steps daily for at least 75% of the month</p>
             </div>
          </div>
        </Card>

        <Card className="p-8 bg-brand-surface border-white/5 space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-brand-primary" />
                </div>
                <h3 className="font-bold text-gray-100 uppercase tracking-widest text-sm">Accomplishment Badges</h3>
              </div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{userProfile?.badges?.length || 0} Unlocked</span>
           </div>

           <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {/* Stepper Badge (Static for now if not unlocked) */}
              <div className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-help group",
                userProfile?.badges?.find(b => b.id === 'stepper') 
                  ? "bg-brand-primary/10 border-brand-primary/40" 
                  : "bg-white/5 border-white/5 opacity-40 grayscale"
              )} title="Complete 10,000 steps for 75% of the month">
                 <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <Footprints className="w-6 h-6 text-brand-primary" />
                 </div>
                 <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-none">Stepper</span>
              </div>

              {/* Placeholder Badges */}
              {[
                { id: 'early-bird', name: 'Early Bird', icon: Moon, desc: 'Complete a workout before 6:00 AM' },
                { id: 'iron-will', name: 'Iron Will', icon: Dumbbell, desc: 'Maintain a 7-day workout streak' },
                { id: 'aqua-king', name: 'Aqua King', icon: Droplets, desc: 'Achieve hydration targets for 30 consecutive days' }
              ].map(badge => {
                const isUnlocked = userProfile?.badges?.find(b => b.id === badge.id);
                return (
                  <div key={badge.id} className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-help group",
                    isUnlocked 
                      ? "bg-brand-primary/10 border-brand-primary/40" 
                      : "bg-white/5 border-white/5 opacity-40 grayscale"
                  )} title={badge.desc}>
                    <div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <badge.icon className="w-6 h-6 text-brand-primary" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter text-center leading-none">{badge.name}</span>
                  </div>
                );
              })}
           </div>

           <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">Every accomplishment starts with the decision to try.</p>
           </div>
        </Card>
      </div>
      </>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(() => {
              const daysInMonth = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate();
              const isCurrentMonth = reportDate.getMonth() === new Date().getMonth() && reportDate.getFullYear() === new Date().getFullYear();
              const daysToConsider = isCurrentMonth ? new Date().getDate() : daysInMonth;
              
              const stepCompliance = reportLogs.filter(l => l.steps >= l.stepGoal).length;
              const waterCompliance = reportLogs.reduce((acc, l) => acc + (l.water >= l.waterGoal ? 1 : 0), 0);
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
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-primary" /> Completed</div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-white/10" /> Missed</div>
              </div>
            </div>

            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[240px_repeat(31,minmax(24px,1fr))] gap-y-4 items-center relative">
                  {/* Calendar Days Header */}
                  <div className="sticky left-0 z-30 bg-brand-surface text-[10px] font-black text-gray-600 uppercase tracking-widest p-2 border-r border-white/5">Habit & Accuracy</div>
                  {Array.from({ length: new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate() }).map((_, i) => (
                    <div key={i} className="text-[10px] font-mono text-gray-600 text-center sticky top-0 bg-brand-surface z-10 py-2 border-b border-white/5">{i + 1}</div>
                  ))}

                  {/* Habit Rows */}
                  {habitList.map((habit) => {
                    const daysInMonth = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate();
                    const isCurrentMonth = reportDate.getMonth() === new Date().getMonth() && reportDate.getFullYear() === new Date().getFullYear();
                    const daysToConsider = isCurrentMonth ? new Date().getDate() : daysInMonth;
                    
                    const completions = reportLogs.filter(l => l.habits?.[habit]).length;
                    const percentage = Math.round((completions / Math.max(1, daysToConsider)) * 100);

                    return (
                      <React.Fragment key={habit}>
                        <div className="sticky left-0 z-20 bg-brand-surface flex items-center gap-2 pr-4 min-w-0 py-1 border-r border-white/5 shadow-sm w-[240px]">
                          <span className="text-[11px] font-bold text-gray-100 truncate">{habit}</span>
                          <span className="text-[10px] font-mono font-black text-brand-primary shrink-0 bg-brand-primary/10 px-1 rounded">{percentage}%</span>
                        </div>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const logAtDate = reportLogs.find(l => l.date === dateStr);
                          const isDone = logAtDate?.habits?.[habit] || false;
                          const isFuture = new Date(dateStr) > new Date();

                          return (
                            <div key={i} className="flex justify-center h-8 items-center bg-white/[0.01]">
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
                  <div className="col-span-full border-t border-white/10 my-4" />
                  
                  {(() => {
                    const daysInMonth = new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate();
                    const isCurrentMonth = reportDate.getMonth() === new Date().getMonth() && reportDate.getFullYear() === new Date().getFullYear();
                    const daysToConsider = isCurrentMonth ? new Date().getDate() : daysInMonth;
                    
                    const stepCompletions = reportLogs.filter(l => l.steps >= l.stepGoal).length;
                    const stepPercentage = Math.round((stepCompletions / Math.max(1, daysToConsider)) * 100);
                    
                    const waterCompletions = reportLogs.filter(l => l.water >= l.waterGoal).length;
                    const waterPercentage = Math.round((waterCompletions / Math.max(1, daysToConsider)) * 100);

                    return (
                      <>
                        <div className="sticky left-0 z-20 bg-brand-surface flex items-center gap-2 pr-4 min-w-0 py-1 border-r border-white/5 shadow-sm w-[240px]">
                          <span className="text-[11px] font-bold text-gray-100 truncate">10K Step Goal</span>
                          <span className="text-[10px] font-mono font-black text-emerald-500 shrink-0 bg-emerald-500/10 px-1 rounded">{stepPercentage}%</span>
                        </div>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const logAtDate = reportLogs.find(l => l.date === dateStr);
                          const isDone = logAtDate && logAtDate.steps >= logAtDate.stepGoal;
                          const isFuture = new Date(dateStr) > new Date();

                          return (
                            <div key={i} className="flex justify-center h-8 items-center bg-white/[0.01]">
                              {isFuture ? <div className="w-2 h-2 rounded-full bg-white/[0.03]" /> :
                               isDone ? <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> :
                               <div className="w-2 h-2 rounded-full border border-white/10" />
                              }
                            </div>
                          );
                        })}

                        <div className="sticky left-0 z-20 bg-brand-surface flex items-center gap-2 pr-4 min-w-0 py-1 border-r border-white/5 shadow-sm w-[240px]">
                          <span className="text-[11px] font-bold text-gray-100 truncate">Hydration Target</span>
                          <span className="text-[10px] font-mono font-black text-blue-500 shrink-0 bg-blue-500/10 px-1 rounded">{waterPercentage}%</span>
                        </div>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const logAtDate = reportLogs.find(l => l.date === dateStr);
                          const isDone = logAtDate && logAtDate.water >= logAtDate.waterGoal;
                          const isFuture = new Date(dateStr) > new Date();

                          return (
                            <div key={i} className="flex justify-center h-8 items-center bg-white/[0.01]">
                              {isFuture ? <div className="w-2 h-2 rounded-full bg-white/[0.03]" /> :
                               isDone ? <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" /> :
                               <div className="w-2 h-2 rounded-full border border-white/10" />
                              }
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
