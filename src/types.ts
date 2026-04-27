export type Path = 'assessment' | 'workout' | 'meal' | 'full' | 'progress';
export type PlanDuration = '7-day' | '2-week' | '4-week' | '12-week';

export interface UserData {
  name: string;
  age: string;
  sex: string;
  height: string;
  heightUnit: 'cm' | 'ftin';
  weight: string;
  weightUnit: 'kg' | 'lbs';
  location: string;
  occupation: string;
  gymAccess: string;
  goals: string;
  eventFocus: string;
  physiqueStyle: string;
  injuries: string;
  allergies: string;
  currentWorkout: string;
  caloriePreference: 'deficit' | 'maintain' | 'surplus';
  physicalActivity: string;
  desiredPhysicalActivity: string;
  planDuration?: PlanDuration;
}

export interface Photos {
  front: string | null;
  back: string | null;
  left: string | null;
  right: string | null;
}

export interface ProgressPhotos {
  before: Photos;
  after: Photos;
  beforeDate: string;
  afterDate: string;
  beforeWeight: string;
  afterWeight: string;
}

export interface Rating {
  category: string;
  rating: number;
  evaluation: string;
}

export interface AssessmentResult {
  toplineSummary: string;
  toplineRatings: Rating[];
  frontViewAnalysis: {
    ratings: Rating[];
    summary: string;
  };
  leftViewAnalysis: {
    ratings: Rating[];
    summary: string;
  };
  backViewAnalysis: {
    ratings: Rating[];
    summary: string;
  };
  rightViewAnalysis: {
    ratings: Rating[];
    summary: string;
  };
  finalSummary: {
    ratings: Rating[];
    nextSteps: string[];
  };
  workoutPlan: {
    week: number;
    phase: string;
    days: {
      day: string;
      focus: string;
      warmUp: string;
      mainWork: string;
      videoUrl: string;
      notes: string;
    }[];
  }[];
  motivationalQuote: {
    text: string;
    author: string;
  };
  sleepRecommendation: {
    duration: string;
    rationale: string;
    tips: string[];
  };
  nutritionStrategy: string;
  mealPlan: {
    week: number;
    days: {
      day: string;
      breakfast: string;
      breakfastUrl: string;
      breakfastMacros: { calories: string; protein: string; fat: string; carbs: string };
      lunch: string;
      lunchUrl: string;
      lunchMacros: { calories: string; protein: string; fat: string; carbs: string };
      dinner: string;
      dinnerUrl: string;
      dinnerMacros: { calories: string; protein: string; fat: string; carbs: string };
      snack: string;
      snackUrl: string;
      snackMacros: { calories: string; protein: string; fat: string; carbs: string };
    }[];
  }[];
  groceryList: {
    category: string;
    items: string;
  }[];
  recommendedGroceryStore: string;
  recoverySchedule: {
    day: string;
    focus: string;
  }[];
  waterSchedule: string[];
  stepGoals: string;
  hydrationTargets: string;
  goalAlignmentSummary: string;
  trainerSummary: string;
  healthMetrics: {
    bmi: number;
    bmiCategory: string;
    estimatedBodyFat: string;
    healthStatus: string;
    focus: string;
    recommendedCalorieLevel: 'maintain' | 'deficit' | 'surplus';
    dailyCalorieTarget: string;
  };
  recommendedWorkout: {
    title: string;
    description: string;
    exercises: {
      name: string;
      sets: string;
      reps: string;
      focus: string;
      videoUrl: string;
    }[];
  };
  additionalActivities: {
    title: string;
    description: string;
    activities: {
      name: string;
      benefit: string;
      frequency: string;
    }[];
  };
}

export interface SavedReport {
  id: string;
  timestamp: any;
  path: Path;
  userData: UserData;
  report: AssessmentResult;
  photos: Photos;
  progressPhotos?: ProgressPhotos;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  hasAccess: boolean;
  isPremium: boolean;
  createdAt: any;
  badges: Badge[];
  gymPin?: string;
  habitList?: string[];
  monthlyGoal?: {
    title: string;
    description: string;
    deadline: string;
    completed: boolean;
    badgeId: string;
  };
}

export interface DailyLog {
  id: string;
  date: string;
  steps: number;
  stepGoal: number;
  water: number;
  waterGoal: number;
  waterUnit: 'ml' | 'oz';
  meals?: {
    name: string;
    completed: boolean;
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    calories?: string;
    protein?: string;
    fat?: string;
    carbs?: string;
    url?: string;
  }[];
  habits?: {
    [key: string]: boolean;
  };
  completedWorkouts: number;
  workoutData?: Record<string, { weight: string; sets: string; reps: string; notes: string }>;
  generalNotes?: string;
  lastUpdated?: any;
  useManualWorkout?: boolean;
  manualWorkout?: {
    warmUp: string;
    mainWork: string;
    focus: string;
  };
}

export interface Measurement {
  id: string;
  date: string;
  timestamp: string;
  weight: number;
  bodyFat?: number;
  waist?: number;
  chest?: number;
  arms?: number; // legacy/general
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  neck?: number;
  units: {
    weight: 'kg' | 'lbs';
    length: 'cm' | 'in';
  };
}
