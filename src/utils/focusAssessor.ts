/**
 * Assesses the primary muscular or training focus of a workout based on its Main Exercises.
 */
export function assessWorkoutFocus(mainWork: any, defaultFocus?: string): string {
  let exerciseNames: string[] = [];

  if (Array.isArray(mainWork)) {
    exerciseNames = mainWork.map(ex => {
      if (typeof ex === 'string') return ex;
      if (ex && typeof ex === 'object') return ex.name || '';
      return String(ex || '');
    });
  } else if (typeof mainWork === 'string' && mainWork.trim()) {
    exerciseNames = mainWork.split(/\n|,/).map(s => s.trim()).filter(Boolean);
  }

  // Filter out empty lines or header notes
  exerciseNames = exerciseNames
    .map(name => name.replace(/^[-*•]\s*/, '').replace(/https?:\/\/[^\s\)]+/gi, '').trim())
    .filter(name => name.length > 0 && !name.toLowerCase().startsWith('notes:') && !name.toLowerCase().startsWith('coach:'));

  if (exerciseNames.length === 0) {
    if (defaultFocus && defaultFocus.trim() && defaultFocus !== 'Chest' && defaultFocus !== 'Custom Session') {
      return defaultFocus;
    }
    return defaultFocus || 'Rest & Recovery';
  }

  const scores: Record<string, number> = {
    Chest: 0,
    Back: 0,
    Legs: 0,
    Shoulders: 0,
    Arms: 0,
    Core: 0,
    Cardio: 0
  };

  const chestRegex = /\b(bench|incline|decline|chest|fly|flye|pushup|push-up|dip|pec|crossover|chest press)\b/i;
  const backRegex = /\b(row|pulldown|pullup|pull-up|chinup|chin-up|lat|deadlift|rack pull|facepull|face pull|rear delt|back extension|shrug|t-bar|hyperextension|pullover)\b/i;
  const legsRegex = /\b(squat|lunge|leg press|leg extension|leg curl|romanian|rdl|calf|calves|hip thrust|bulgarian|split squat|hamstring|quad|glute|adductor|abductor)\b/i;
  const shouldersRegex = /\b(overhead|ohp|shoulder|lateral raise|front raise|military press|arnold|delt|upright row)\b/i;
  const armsRegex = /\b(bicep|tricep|curl|pushdown|skullcrusher|hammer|preacher|concentration|overhead extension|triceps|biceps)\b/i;
  const coreRegex = /\b(plank|crunch|leg raise|ab wheel|russian twist|woodchopper|hanging knee|situp|sit-up|abs|core|pallof press)\b/i;
  const cardioRegex = /\b(run|sprint|rower|bike|assault bike|burpee|jump rope|kettlebell|swing|sled|prowler|hiit|treadmill|stairmaster|cardio)\b/i;

  exerciseNames.forEach(ex => {
    const name = ex.toLowerCase();
    if (chestRegex.test(name)) scores.Chest += 2;
    if (backRegex.test(name)) scores.Back += 2;
    if (legsRegex.test(name)) scores.Legs += 2;
    if (shouldersRegex.test(name)) scores.Shoulders += 2;
    if (armsRegex.test(name)) scores.Arms += 1.5;
    if (coreRegex.test(name)) scores.Core += 1;
    if (cardioRegex.test(name)) scores.Cardio += 2;
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topGroup, topScore] = sorted[0];
  const [secondGroup, secondScore] = sorted[1];

  if (topScore === 0) {
    if (defaultFocus && defaultFocus.trim() && defaultFocus !== 'Custom Session' && defaultFocus !== 'Chest') {
      return defaultFocus;
    }
    return defaultFocus || 'Full Body';
  }

  // Check if multiple groups are closely balanced
  if (topScore > 0 && secondScore >= topScore * 0.65 && secondScore >= 2) {
    if ((topGroup === 'Chest' && secondGroup === 'Shoulders') || (topGroup === 'Shoulders' && secondGroup === 'Chest')) {
      return 'Chest & Shoulders';
    }
    if ((topGroup === 'Chest' && secondGroup === 'Arms') || (topGroup === 'Arms' && secondGroup === 'Chest')) {
      return 'Chest & Arms';
    }
    if ((topGroup === 'Back' && secondGroup === 'Arms') || (topGroup === 'Arms' && secondGroup === 'Back')) {
      return 'Back & Biceps';
    }
    if ((topGroup === 'Back' && secondGroup === 'Shoulders') || (topGroup === 'Shoulders' && secondGroup === 'Back')) {
      return 'Back & Shoulders';
    }
    if ((topGroup === 'Legs' && secondGroup === 'Core') || (topGroup === 'Core' && secondGroup === 'Legs')) {
      return 'Legs & Core';
    }
    if ((topGroup === 'Chest' && secondGroup === 'Back') || (topGroup === 'Legs' && (secondGroup === 'Chest' || secondGroup === 'Back'))) {
      return 'Full Body Focus';
    }
    return `${topGroup} & ${secondGroup}`;
  }

  switch (topGroup) {
    case 'Chest': return 'Chest';
    case 'Back': return 'Back';
    case 'Legs': return 'Legs & Lower Body';
    case 'Shoulders': return 'Shoulders & Delts';
    case 'Arms': return 'Arms Focus';
    case 'Core': return 'Core & Abs';
    case 'Cardio': return 'Cardio & Conditioning';
    default: return topGroup;
  }
}
