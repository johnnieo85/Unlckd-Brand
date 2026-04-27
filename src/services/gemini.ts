import { GoogleGenAI, Type } from "@google/genai";
import { UserData, Photos, ProgressPhotos, AssessmentResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Common photo processing logic
 */
const processPhoto = (data: string | null) => {
  if (data && typeof data === 'string' && data.includes(',')) {
    const [header, base64] = data.split(",");
    const mimeType = header.split(";")[0].split(":")[1] || "image/jpeg";
    return {
      inlineData: {
        data: base64,
        mimeType,
      },
    };
  }
  return null;
};

/**
 * Gets photo parts for Gemini prompt
 */
const getPhotoParts = (path: string, photos: Photos | ProgressPhotos): any[] => {
  const photoParts: any[] = [];
  if (path === 'progress') {
    const progress = photos as ProgressPhotos;
    Object.values(progress.before).forEach(data => {
      const part = processPhoto(data);
      if (part) photoParts.push(part);
    });
    Object.values(progress.after).forEach(data => {
      const part = processPhoto(data);
      if (part) photoParts.push(part);
    });
  } else {
    const standard = photos as Photos;
    Object.values(standard).forEach(data => {
      const part = processPhoto(data);
      if (part) photoParts.push(part);
    });
  }
  return photoParts;
};

/**
 * AI CALL RETRY HELPER
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = 
      error.message?.includes('503') || 
      error.message?.includes('high demand') ||
      error.message?.includes('504') ||
      error.message?.includes('429') ||
      error.status === 'UNAVAILABLE';

    if (retries > 0 && isRetryable) {
      console.warn(`AI model busy. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

/**
 * PHYSIQUE ANALYSIS COMPONENT
 */
async function generatePhysiqueAnalysis(
  userData: UserData,
  photos: Photos | ProgressPhotos,
  path: string,
  isResubmit: boolean
): Promise<any> {
  const model = "gemini-3-flash-preview";
  const photoParts = getPhotoParts(path, photos);

  const prompt = `
    Perform a professional physique assessment for "UNLCKD Pro Trainer".
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    ${isResubmit ? "RESUBMIT MODE: Ensure maximum accuracy." : ""}
    Requested Path: ${path}
    
    ${path === 'progress' ? `
    PROGRESS PHOTO ENGINE MODE:
    Compare current photos with previous ones. Identify changes in muscle density, body fat, and posture.
    ` : ''}

    FOCUS: Detailed Ratings & Summaries for ALL views (Front, Back, Left, Right).
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: prompt }, ...photoParts],
    },
    config: {
      systemInstruction: `
        You are an elite physique assessor. Return ONLY valid JSON for the physique components.
        Each evaluation or summary field must be under 200 characters.
      `,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          toplineSummary: { type: Type.STRING },
          toplineRatings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                evaluation: { type: Type.STRING },
              },
            },
          },
          frontViewAnalysis: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } } } },
              summary: { type: Type.STRING },
            },
          },
          leftViewAnalysis: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } } } },
              summary: { type: Type.STRING },
            },
          },
          rightViewAnalysis: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } } } },
              summary: { type: Type.STRING },
            },
          },
          backViewAnalysis: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } } } },
              summary: { type: Type.STRING },
            },
          },
          finalSummary: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } } } },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      },
    },
  }));

  return JSON.parse(response.text || "{}");
}

/**
 * HEALTH & SUPPORT COMPONENT
 */
async function generateHealthAndSupport(
  userData: UserData,
  isResubmit: boolean
): Promise<any> {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Generate health metrics and supportive guidance for "UNLCKD Pro Trainer".
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    FOCUS: 
    1. Health Metrics (BMI, Body Fat, Calorie Targets).
    2. Daily Life (Sleep, Grocery store recommendation, Water, Steps).
    3. Motivation and Nutrition strategies.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      systemInstruction: `
        You are a performance nutritionist and lifestyle coach. Return ONLY valid JSON.
      `,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          healthMetrics: {
            type: Type.OBJECT,
            properties: {
              bmi: { type: Type.NUMBER },
              bmiCategory: { type: Type.STRING },
              estimatedBodyFat: { type: Type.STRING },
              healthStatus: { type: Type.STRING },
              focus: { type: Type.STRING },
              recommendedCalorieLevel: { type: Type.STRING },
              dailyCalorieTarget: { type: Type.STRING },
            },
          },
          motivationalQuote: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              author: { type: Type.STRING },
            },
          },
          sleepRecommendation: {
            type: Type.OBJECT,
            properties: {
              duration: { type: Type.STRING },
              rationale: { type: Type.STRING },
              tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
          groceryList: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, items: { type: Type.STRING } } },
          },
          recommendedGroceryStore: { type: Type.STRING },
          recoverySchedule: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, focus: { type: Type.STRING } } },
          },
          waterSchedule: { type: Type.ARRAY, items: { type: Type.STRING } },
          hydrationTargets: { type: Type.STRING },
          nutritionStrategy: { type: Type.STRING },
          stepGoals: { type: Type.STRING },
          goalAlignmentSummary: { type: Type.STRING },
          trainerSummary: { type: Type.STRING },
        },
      },
    },
  }));

  return JSON.parse(response.text || "{}");
}

/**
 * 12-WEEK WORKOUT GENERATION (Micro-Batched)
 */
async function generateWorkoutPlan(
  userData: UserData,
  isResubmit: boolean
): Promise<Partial<AssessmentResult>> {
  const fetchBatch = async (weeks: string): Promise<any[]> => {
    const prompt = `
      Design Weeks ${weeks} of an elite 12-week workout plan for "UNLCKD Pro Trainer".
      User: ${userData.name}, Goal: ${userData.goals}.
      EVERY exercise MUST be formatted as "[Name (Sets x Reps)](YouTube Link)".
    `;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: "Expert S&C Coach. JSON only. Weekly workout arrays.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            workoutPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week: { type: Type.NUMBER },
                  phase: { type: Type.STRING },
                  days: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.STRING },
                        focus: { type: Type.STRING },
                        warmUp: { type: Type.STRING },
                        mainWork: { type: Type.STRING },
                        videoUrl: { type: Type.STRING },
                        notes: { type: Type.STRING },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }));

    const data = JSON.parse(response.text || "{}");
    return data.workoutPlan || [];
  };

  const workoutPlan: any[] = [];
  const batches = ["1-2", "3-4", "5-6", "7-8", "9-10", "11-12"];
  
  for (const range of batches) {
    const batch = await fetchBatch(range);
    workoutPlan.push(...batch);
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  return { workoutPlan: workoutPlan.sort((a, b) => a.week - b.week) };
}

/**
 * 12-WEEK MEAL PLAN GENERATION (Micro-Batched)
 */
async function generateMealPlan(
  userData: UserData,
  isResubmit: boolean
): Promise<Partial<AssessmentResult>> {
  const fetchBatch = async (weeks: string): Promise<any[]> => {
    const prompt = `
      Generate Weeks ${weeks} of a personalized 12-week meal plan.
      User: ${userData.name}, Preferences: ${userData.caloriePreference}.
    `;

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: "Nutritionist. JSON only. Weekly meal arrays with full macro breakdown.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mealPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week: { type: Type.NUMBER },
                  days: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.STRING },
                        breakfast: { type: Type.STRING },
                        lunch: { type: Type.STRING },
                        dinner: { type: Type.STRING },
                        snack: { type: Type.STRING },
                        breakfastMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } } },
                        lunchMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } } },
                        dinnerMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } } },
                        snackMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }));

    const data = JSON.parse(response.text || "{}");
    return data.mealPlan || [];
  };

  const mealPlan: any[] = [];
  const batches = ["1-2", "3-4", "5-6", "7-8", "9-10", "11-12"];

  for (const range of batches) {
    const batch = await fetchBatch(range);
    mealPlan.push(...batch);
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  return { mealPlan: mealPlan.sort((a, b) => a.week - b.week) };
}

export async function generateTransformationReport(
  userData: UserData,
  photos: Photos | ProgressPhotos,
  path: string,
  isResubmit: boolean = false
): Promise<AssessmentResult> {
  try {
    let result: Partial<AssessmentResult> = {};

    // 1. GENERATE ASSESSMENT PIECES
    if (['full', 'assessment', 'progress'].includes(path)) {
      const physique = await generatePhysiqueAnalysis(userData, photos, path, isResubmit);
      const lifestyle = await generateHealthAndSupport(userData, isResubmit);
      result = { ...result, ...physique, ...lifestyle };
    }

    // 2. GENERATE WORKOUT PLAN
    if (['full', 'workout'].includes(path)) {
      const workout = await generateWorkoutPlan(userData, isResubmit);
      result = { ...result, ...workout };
    }

    // 3. GENERATE MEAL PLAN
    if (['full', 'meal'].includes(path)) {
      const meal = await generateMealPlan(userData, isResubmit);
      result = { ...result, ...meal };
    }

    // Final Validation & Cleanup
    const finalResult = result as AssessmentResult;
    
    // Ensure all required fields exist to avoid UI crashes
    finalResult.toplineRatings = finalResult.toplineRatings || [];
    finalResult.workoutPlan = finalResult.workoutPlan || [];
    finalResult.mealPlan = finalResult.mealPlan || [];
    finalResult.groceryList = finalResult.groceryList || [];
    finalResult.recoverySchedule = finalResult.recoverySchedule || [];
    finalResult.waterSchedule = finalResult.waterSchedule || [];

    // Validation checks for completeness
    const checks: { name: string; pass: boolean; error: string }[] = [];
    if (['full', 'workout'].includes(path)) {
      checks.push({
        name: "12-Week Workout Plan Completeness",
        pass: (finalResult.workoutPlan?.length || 0) >= 12,
        error: `Workout plan contains only ${finalResult.workoutPlan?.length || 0} weeks. All 12 weeks are required.`
      });
    }
    if (['full', 'meal'].includes(path)) {
      checks.push({
        name: "12-Week Meal Plan Completeness",
        pass: (finalResult.mealPlan?.length || 0) >= 12,
        error: `Meal plan contains only ${finalResult.mealPlan?.length || 0} weeks. All 12 weeks are required.`
      });
    }

    const failedChecks = checks.filter(c => !c.pass);
    if (failedChecks.length > 0) {
      throw new Error(`Completeness error: ${failedChecks.map(c => c.error).join(' ')}`);
    }

    return finalResult;
  } catch (error: any) {
    console.error("Gemini Multi-Step Error:", error);
    // Provide a clear user-facing error
    if (error instanceof SyntaxError) {
      throw new Error("The AI response was invalid. This often happens with very large reports. Please try shortening your goal description or try again.");
    }
    throw new Error(error.message || "An error occurred during report generation. Please try again.");
  }
}
