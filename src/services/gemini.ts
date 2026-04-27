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
 * Safely parses JSON from a string, handling potential markdown wrappers or prefix text
 */
function safeParseJson(text: string): any {
  if (!text) return {};
  const cleaned = text.trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (innerE) {
        // fallback to further cleaning below
      }
    }
    
    // Last ditch effort: find the first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const maybeJson = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(maybeJson);
      } catch (innerE) {
        throw new SyntaxError(`AI returned malformed JSON: ${innerE.message}`);
      }
    }
    
    throw e;
  }
}

/**
 * AI CALL RETRY HELPER
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = 
      error.message?.includes('503') || 
      error.message?.includes('high demand') ||
      error.message?.includes('504') ||
      error.message?.includes('429') ||
      error.message?.includes('deadline exceeded') ||
      error.status === 'UNAVAILABLE' ||
      error.message?.includes('fetch failed');

    if (retries > 0 && isRetryable) {
      console.warn(`Gemini busy or network error. Retrying in ${delay}ms... (${retries} attempts left)`);
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
  const model = "gemini-2.0-flash";
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
    Note: The goal is ${userData.goals}.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }, ...photoParts] }],
    config: {
      systemInstruction: `
        You are an elite physique assessor. Return ONLY valid JSON for the physique components.
        Each evaluation or summary field must be under 150 characters to ensure the response remains stable.
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

  return safeParseJson(response.text || "{}");
}

/**
 * HEALTH & SUPPORT COMPONENT
 */
async function generateHealthAndSupport(
  userData: UserData,
  isResubmit: boolean
): Promise<any> {
  const model = "gemini-2.0-flash";

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
    contents: [{ role: "user", parts: [{ text: prompt }] }],
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

  return safeParseJson(response.text || "{}");
}

/**
 * 12-WEEK WORKOUT GENERATION (Batched)
 */
async function generateWorkoutPlan(
  userData: UserData,
  isResubmit: boolean
): Promise<Partial<AssessmentResult>> {
  const workoutPlan: any[] = [];
  
  const fetchBatch = async (startWeek: number, endWeek: number): Promise<any[]> => {
    const prompt = `
      Design Weeks ${startWeek} through ${endWeek} of an elite 12-week workout plan for "UNLCKD Pro Trainer".
      User: ${userData.name}, Goal: ${userData.goals}.
      Current Range: Weeks ${startWeek}-${endWeek}.
      
      EVERY exercise MUST be formatted as "[Name (Sets x Reps)](YouTube Link)".
      Return exactly ${endWeek - startWeek + 1} week objects in the workoutPlan array.
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "Expert S&C Coach. JSON only. Weekly workout arrays. Keep descriptions concise. Ensure exact requested weeks are provided.",
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
            required: ["workoutPlan"]
          },
        },
      }));

      const data = safeParseJson(response.text || "{}");
      return data.workoutPlan || [];
    } catch (error) {
      console.error(`Error fetching workout weeks ${startWeek}-${endWeek}:`, error);
      throw error;
    }
  };

  // Process in smaller batches of 2-3 weeks for higher reliability in Flash
  const batches = [[1, 3], [4, 6], [7, 9], [10, 12]];
  
  for (const [start, end] of batches) {
    const batch = await fetchBatch(start, end);
    workoutPlan.push(...batch);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return { workoutPlan: workoutPlan.sort((a, b) => a.week - b.week) };
}

/**
 * 12-WEEK MEAL PLAN GENERATION (Batched)
 */
async function generateMealPlan(
  userData: UserData,
  isResubmit: boolean
): Promise<Partial<AssessmentResult>> {
  const mealPlan: any[] = [];

  const fetchBatch = async (startWeek: number, endWeek: number): Promise<any[]> => {
    const prompt = `
      Generate Weeks ${startWeek} through ${endWeek} of a personalized 12-week meal plan.
      User: ${userData.name}, Preferences: ${userData.caloriePreference}.
      Current Range: Weeks ${startWeek}-${endWeek}.
      Return exactly ${endWeek - startWeek + 1} week objects in the mealPlan array.
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "Nutritionist. JSON only. Weekly meal arrays with macro breakdown. Keep descriptions concise. Ensure exact requested weeks are provided.",
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
            required: ["mealPlan"]
          },
        },
      }));

      const data = safeParseJson(response.text || "{}");
      return data.mealPlan || [];
    } catch (error) {
      console.error(`Error fetching meal weeks ${startWeek}-${endWeek}:`, error);
      throw error;
    }
  };

  const batches = [[1, 3], [4, 6], [7, 9], [10, 12]];

  for (const [start, end] of batches) {
    const batch = await fetchBatch(start, end);
    mealPlan.push(...batch);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return { mealPlan: mealPlan.sort((a, b) => a.week - b.week) };
}

export async function generateTransformationReport(
  userData: UserData,
  photos: Photos | ProgressPhotos,
  path: string,
  isResubmit: boolean = false
): Promise<AssessmentResult> {
  // Truncate goals if extremely long
  const cleanUserData = {
    ...userData,
    goals: userData.goals?.length > 1000 ? userData.goals.substring(0, 1000) + '...' : userData.goals
  };

  try {
    let result: Partial<AssessmentResult> = {};

    // 1. GENERATE ASSESSMENT PIECES
    if (['full', 'assessment', 'progress'].includes(path)) {
      try {
        console.log("Generating physique analysis...");
        const physique = await generatePhysiqueAnalysis(cleanUserData, photos, path, isResubmit);
        console.log("Generating health and support...");
        const lifestyle = await generateHealthAndSupport(cleanUserData, isResubmit);
        result = { ...result, ...physique, ...lifestyle };
      } catch (e) {
        console.error("Analysis step failed:", e);
        throw new Error(`Analysis failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // 2. GENERATE WORKOUT PLAN
    if (['full', 'workout'].includes(path)) {
      try {
        console.log("Generating 12-week workout plan...");
        const workout = await generateWorkoutPlan(cleanUserData, isResubmit);
        result = { ...result, ...workout };
      } catch (e) {
        console.error("Workout generation failed:", e);
        throw new Error(`Workout plan generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // 3. GENERATE MEAL PLAN
    if (['full', 'meal'].includes(path)) {
      try {
        console.log("Generating 12-week meal plan...");
        const meal = await generateMealPlan(cleanUserData, isResubmit);
        result = { ...result, ...meal };
      } catch (e) {
        console.error("Meal generation failed:", e);
        throw new Error(`Meal plan generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
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
        name: "12-Week Workout Plan",
        pass: (finalResult.workoutPlan?.length || 0) >= 12,
        error: `Workout plan incomplete (${finalResult.workoutPlan?.length || 0}/12 weeks).`
      });
    }
    if (['full', 'meal'].includes(path)) {
      checks.push({
        name: "12-Week Meal Plan",
        pass: (finalResult.mealPlan?.length || 0) >= 12,
        error: `Meal plan incomplete (${finalResult.mealPlan?.length || 0}/12 weeks).`
      });
    }

    const failedChecks = checks.filter(c => !c.pass);
    if (failedChecks.length > 0) {
      throw new Error(`Completeness error: ${failedChecks.map(c => c.error).join(' ')}`);
    }

    return finalResult;
  } catch (error: any) {
    console.error("Gemini Multi-Step Error:", error);
    
    // Handle JSON syntax errors specifically
    if (error instanceof SyntaxError || error.message?.includes('JSON')) {
      throw new Error("The AI response format was invalid. This often happens with very detailed requests. Please try again or slightly shorten your goals.");
    }
    
    throw new Error(error.message || "An error occurred during report generation. Please try again.");
  }
}
