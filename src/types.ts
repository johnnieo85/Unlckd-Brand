export type Path = 'assessment' | 'workout' | 'meal' | 'full' | 'progress';

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
    day: string;
    focus: string;
    warmUp: string;
    mainWork: string;
    notes: string;
  }[];
  nutritionStrategy: string;
  mealPlan: {
    day: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    snack: string;
  }[];
  groceryList: {
    category: string;
    items: string;
  }[];
  recoverySchedule: {
    day: string;
    focus: string;
  }[];
  waterSchedule: string[];
  stepGoals: string;
  hydrationTargets: string;
  trainerSummary: string;
}
