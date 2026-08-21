/**
 * Body Fat Percentage Utilities & Biometric Calculations
 * 
 * Supports:
 * - Robust parsing of AI outputs (e.g., "28-30%", "28.5%", "~24%", or legacy corrupted "2830")
 * - US Navy Circumference Method (DoD Standard)
 * - Deurenberg Adult BMI-Based Body Fat Formula
 * - Composite Athlete Body Fat estimation with intelligent fallback
 */

export interface BodyFatCalculationInputs {
  weight?: number | string; // in lbs or kg
  weightUnit?: 'lbs' | 'kg';
  heightInches?: number; // total height in inches
  heightCm?: number; // total height in cm
  age?: number | string;
  sex?: 'male' | 'female' | string;
  waist?: number | string; // waist circumference
  neck?: number | string; // neck circumference
  hips?: number | string; // hip circumference (mainly females)
  measurementUnit?: 'in' | 'cm';
  manualBodyFat?: number | string;
  latestLoggedBodyFat?: number | string;
}

/**
 * Parses and sanitizes a raw body fat value (string or number).
 * Handles strings like "28-30%", "28.5%", "~24%", "28 - 30%", or corrupted concatenated strings like "2830"
 * Returns a clean numeric percentage with 1 decimal place (e.g. 28.3), or null if invalid.
 */
export function parseBodyFatPercentage(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;

  // If already a number
  if (typeof raw === 'number') {
    if (isNaN(raw) || raw <= 0) return null;

    // Handle legacy corrupted numbers like 2830 created by stripping hyphen from "28-30%" or 28.30 * 100
    if (raw >= 1000 && raw <= 9999) {
      const firstTwo = Math.floor(raw / 100);
      const lastTwo = raw % 100;
      if (firstTwo >= 4 && firstTwo <= 70 && lastTwo >= 4 && lastTwo <= 70) {
        // Average the range, e.g. 28 and 30 -> 29.0
        return Math.round(((firstTwo + lastTwo) / 2) * 10) / 10;
      }
      // Or 2830 -> 28.3
      const divided = raw / 100;
      if (divided >= 4 && divided <= 70) {
        return Math.round(divided * 10) / 10;
      }
      return null;
    }

    // Handle numbers multiplied by 10 e.g. 283 -> 28.3
    if (raw >= 100 && raw <= 700) {
      const divided = raw / 10;
      if (divided >= 4 && divided <= 70) {
        return Math.round(divided * 10) / 10;
      }
      return null;
    }

    // Clamped realistic range: 3% to 70%
    if (raw >= 3 && raw <= 70) {
      return Math.round(raw * 10) / 10;
    }

    return null;
  }

  const str = String(raw).trim();
  if (!str || str.toLowerCase() === 'tbd' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'none') {
    return null;
  }

  // Check for range patterns: "28-30%", "28 - 30%", "28 to 32%"
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (!isNaN(low) && !isNaN(high) && low > 0 && high > 0) {
      const avg = (low + high) / 2;
      if (avg >= 3 && avg <= 70) {
        return Math.round(avg * 10) / 10;
      }
    }
  }

  // Single number match e.g. "28.5%", "~28%", "28.3"
  const singleMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    if (!isNaN(val)) {
      return parseBodyFatPercentage(val);
    }
  }

  return null;
}

/**
 * Calculates Body Fat % using the standard US Navy Circumference Method
 * 
 * Men:
 * BF% = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76 (in inches)
 * 
 * Women:
 * BF% = 163.205 × log10(waist + hip - neck) - 97.684 × log10(height) - 78.387 (in inches)
 */
export function calculateNavyBodyFat(params: {
  sex?: 'male' | 'female' | string;
  heightInches: number;
  waistInches: number;
  neckInches: number;
  hipsInches?: number;
}): number | null {
  const { heightInches, waistInches, neckInches, hipsInches } = params;
  const isFemale = (params.sex || '').toLowerCase().includes('fem') || (params.sex || '').toLowerCase() === 'f';

  if (!heightInches || heightInches <= 30 || heightInches > 100) return null;
  if (!waistInches || waistInches <= 15 || waistInches > 80) return null;
  if (!neckInches || neckInches <= 8 || neckInches > 35) return null;

  try {
    if (isFemale) {
      const hips = hipsInches && hipsInches > 20 ? hipsInches : waistInches * 1.15;
      const waistHipNeckDiff = waistInches + hips - neckInches;
      if (waistHipNeckDiff <= 0) return null;

      const bf = 163.205 * Math.log10(waistHipNeckDiff) - 97.684 * Math.log10(heightInches) - 78.387;
      if (!isNaN(bf) && bf >= 4 && bf <= 65) {
        return Math.round(bf * 10) / 10;
      }
    } else {
      const waistNeckDiff = waistInches - neckInches;
      if (waistNeckDiff <= 0) return null;

      const bf = 86.010 * Math.log10(waistNeckDiff) - 70.041 * Math.log10(heightInches) + 36.76;
      if (!isNaN(bf) && bf >= 3 && bf <= 65) {
        return Math.round(bf * 10) / 10;
      }
    }
  } catch (err) {
    console.error('Error calculating US Navy body fat:', err);
  }

  return null;
}

/**
 * Calculates Body Fat % using Deurenberg's BMI formula
 * % Body Fat = (1.20 × BMI) + (0.23 × Age) - (10.8 × Sex) - 5.4
 * (Sex: 1 for male, 0 for female)
 */
export function calculateBmiBodyFat(params: {
  weightKg: number;
  heightCm: number;
  age?: number | string;
  sex?: 'male' | 'female' | string;
}): number | null {
  const { weightKg, heightCm } = params;
  if (!weightKg || weightKg <= 20 || !heightCm || heightCm <= 90) return null;

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (isNaN(bmi) || bmi <= 10 || bmi > 80) return null;

  const ageNum = Number(params.age) || 28;
  const isFemale = (params.sex || '').toLowerCase().includes('fem') || (params.sex || '').toLowerCase() === 'f';
  const sexFactor = isFemale ? 0 : 1;

  const bf = (1.20 * bmi) + (0.23 * ageNum) - (10.8 * sexFactor) - 5.4;
  if (!isNaN(bf) && bf >= 4 && bf <= 65) {
    return Math.round(bf * 10) / 10;
  }

  return null;
}

/**
 * Smart Composite Resolver for Athlete Body Fat
 * 
 * Precedence:
 * 1. Cleaned manual body fat input (if user provided a valid % e.g. Dexa scan)
 * 2. Cleaned latest logged body fat measurement
 * 3. US Navy Circumference Method (if waist, neck, and height are recorded)
 * 4. BMI-based Deurenberg Estimation (if height and weight are available)
 * 5. Default athletic baseline fallback (18.5%)
 */
export function resolveAthleteBodyFat(inputs: BodyFatCalculationInputs): {
  bodyFatPercentage: number;
  formatted: string;
  source: 'manual' | 'logged' | 'navy_method' | 'bmi_estimation' | 'baseline';
} {
  // 1. Manual user override
  const manualParsed = parseBodyFatPercentage(inputs.manualBodyFat);
  if (manualParsed !== null) {
    return {
      bodyFatPercentage: manualParsed,
      formatted: `${manualParsed.toFixed(1)}%`,
      source: 'manual'
    };
  }

  // 2. Latest logged body fat (sanitized to avoid 2830 corruption)
  const loggedParsed = parseBodyFatPercentage(inputs.latestLoggedBodyFat);
  if (loggedParsed !== null) {
    return {
      bodyFatPercentage: loggedParsed,
      formatted: `${loggedParsed.toFixed(1)}%`,
      source: 'logged'
    };
  }

  // Convert inputs to standard units (inches and cm, lbs and kg)
  let heightInches = inputs.heightInches || 0;
  let heightCm = inputs.heightCm || 0;
  if (heightInches > 0 && !heightCm) heightCm = Math.round(heightInches * 2.54);
  if (heightCm > 0 && !heightInches) heightInches = Math.round(heightCm / 2.54);

  let weightKg = 0;
  const rawWeight = Number(inputs.weight) || 0;
  if (rawWeight > 0) {
    weightKg = inputs.weightUnit === 'kg' ? rawWeight : rawWeight * 0.453592;
  }

  const measurementUnit = inputs.measurementUnit || 'in';
  const waistVal = Number(inputs.waist) || 0;
  const neckVal = Number(inputs.neck) || 0;
  const hipsVal = Number(inputs.hips) || 0;

  const waistInches = measurementUnit === 'cm' ? waistVal / 2.54 : waistVal;
  const neckInches = measurementUnit === 'cm' ? neckVal / 2.54 : neckVal;
  const hipsInches = measurementUnit === 'cm' ? hipsVal / 2.54 : hipsVal;

  // 3. US Navy method (if measurements are valid)
  if (heightInches > 0 && waistInches > 0 && neckInches > 0) {
    const navyBf = calculateNavyBodyFat({
      sex: inputs.sex,
      heightInches,
      waistInches,
      neckInches,
      hipsInches: hipsInches > 0 ? hipsInches : undefined
    });
    if (navyBf !== null) {
      return {
        bodyFatPercentage: navyBf,
        formatted: `${navyBf.toFixed(1)}%`,
        source: 'navy_method'
      };
    }
  }

  // 4. BMI-based estimation
  if (weightKg > 0 && heightCm > 0) {
    const bmiBf = calculateBmiBodyFat({
      weightKg,
      heightCm,
      age: inputs.age,
      sex: inputs.sex
    });
    if (bmiBf !== null) {
      return {
        bodyFatPercentage: bmiBf,
        formatted: `${bmiBf.toFixed(1)}%`,
        source: 'bmi_estimation'
      };
    }
  }

  // 5. Default baseline
  return {
    bodyFatPercentage: 18.5,
    formatted: '18.5%',
    source: 'baseline'
  };
}
