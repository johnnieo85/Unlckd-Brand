export interface LevelDefinition {
  level: number;
  minXp: number;
  title: string;
  badge: string;
  description: string;
  perks: string[];
}

export const LEVELS: LevelDefinition[] = [
  {
    level: 1,
    minXp: 0,
    title: "RAW DATA",
    badge: "📡",
    description: "System initialized. The baseline has been established.",
    perks: ["Baseline Tracking", "Hub Access"]
  },
  {
    level: 2,
    minXp: 1000,
    title: "FIRST SIGNAL",
    badge: "📡",
    description: "The first readings are in. Momentum starts here.",
    perks: ["Expanded Analytics", "Streak Tracker"]
  },
  {
    level: 3,
    minXp: 2000,
    title: "ACTIVATED",
    badge: "🔋",
    description: "The engine is warm. Consistency is becoming a protocol.",
    perks: ["Mastery Progress", "Custom Patterns"]
  },
  {
    level: 4,
    minXp: 3500,
    title: "IGNITION",
    badge: "🔥",
    description: "Habits are catching. The grind is starting to compound.",
    perks: ["Advanced Heatmaps", "Priority Sync"]
  },
  {
    level: 5,
    minXp: 5000,
    title: "DRIVEN OPERATIVE",
    badge: "🦾",
    description: "Momentum is a weapon. You're no longer just showing up.",
    perks: ["Iron Will Badge", "Beta Access"]
  },
  {
    level: 6,
    minXp: 7000,
    title: "STEADY HAND",
    badge: "🎯",
    description: "Precision is forming. Fewer missed days, sharper focus.",
    perks: ["Profile Customization"]
  },
  {
    level: 7,
    minXp: 10000,
    title: "KINETIC FORCE",
    badge: "⚡",
    description: "Energy in motion. Your output is starting to defy the average.",
    perks: ["Pro Status Icon"]
  },
  {
    level: 8,
    minXp: 14000,
    title: "MOMENTUM ENGINE",
    badge: "⚙️",
    description: "Progress compounds. The plan is starting to run itself.",
    perks: ["Legacy Theme"]
  },
  {
    level: 9,
    minXp: 18500,
    title: "IRON VANGUARD",
    badge: "🛡️",
    description: "Resilience is reinforced. You are the frontline of your own change.",
    perks: ["Hall of Fame"]
  },
  {
    level: 10,
    minXp: 24000,
    title: "FORGED",
    badge: "👑",
    description: "Six months of pressure has reshaped the baseline.",
    perks: ["Infinite Legend Status"]
  }
];

export const getLevelInfo = (xp: number) => {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }

  const xpInCurrentRange = xp - currentLevel.minXp;
  const rangeTotal = nextLevel === currentLevel ? 1 : nextLevel.minXp - currentLevel.minXp;
  const progress = Math.min(Math.round((xpInCurrentRange / rangeTotal) * 100), 100);

  return {
    ...currentLevel,
    progress,
    xpToNext: nextLevel.minXp - xp,
    isMaxLevel: nextLevel === currentLevel
  };
};
