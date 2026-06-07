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
    minXp: 2000,
    title: "ACTIVATED",
    badge: "🔋",
    description: "The engine is warm. Consistency is becoming a protocol.",
    perks: ["Expanded Analytics", "Streak Tracker"]
  },
  {
    level: 3,
    minXp: 5000,
    title: "DRIVEN OPERATIVE",
    badge: "🦾",
    description: "Momentum is a weapon. You're no longer just showing up.",
    perks: ["Mastery Progress", "Custom Patterns"]
  },
  {
    level: 4,
    minXp: 10000,
    title: "KINETIC FORCE",
    badge: "⚡",
    description: "Energy in motion. Your output is starting to defy the average.",
    perks: ["Advanced Heatmaps", "Priority Sync"]
  },
  {
    level: 5,
    minXp: 20000,
    title: "IRON VANGUARD",
    badge: "🛡️",
    description: "Resilience is reinforced. You are the frontline of your own change.",
    perks: ["Iron Will Badge", "Beta Access"]
  },
  {
    level: 6,
    minXp: 35000,
    title: "CORE ARCHITECT",
    badge: "📐",
    description: "You don't just follow the program; you embody the structure.",
    perks: ["Profile Customization"]
  },
  {
    level: 7,
    minXp: 55000,
    title: "ELITE UNLCKD PRO",
    badge: "💎",
    description: "Performance is optimized. Limitations have been overridden.",
    perks: ["Pro Status Icon"]
  },
  {
    level: 8,
    minXp: 80000,
    title: "TITAN OPERATOR",
    badge: "🏛️",
    description: "Weight moves at your command. Sovereignty over the iron.",
    perks: ["Legacy Theme"]
  },
  {
    level: 9,
    minXp: 110000,
    title: "SUPREME MASTER",
    badge: "🔱",
    description: "Total mastery of mind and muscle. A system in perfect harmony.",
    perks: ["Hall of Fame"]
  },
  {
    level: 10,
    minXp: 150000,
    title: "UNLCKD LEGACY",
    badge: "👑",
    description: "You are the benchmark. The system is complete. Legend achieved.",
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
