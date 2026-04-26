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
 * CORE ASSESSMENT GENERATION
 */
async function generateCoreAssessment(
  userData: UserData,
  photos: Photos | ProgressPhotos,
  path: string,
  isResubmit: boolean
): Promise<Partial<AssessmentResult>> {
  const model = "gemini-3-flash-preview";
  const photoParts = getPhotoParts(path, photos);

  const prompt = `
    Perform a professional physique assessment and generate core report data for "UNLCKD Pro Trainer".
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    ${isResubmit ? "RESUBMIT MODE: Ensure maximum accuracy and completeness." : ""}
    Requested Path: ${path}
    
    ${path === 'progress' ? `
    PROGRESS PHOTO ENGINE MODE:
    - You have been provided with up to 8 photos. The first set are "BEFORE" (Front, Back, Left, Right) from ${userData.name}'s assessment on ${(photos as ProgressPhotos).beforeDate} at a weight of ${(photos as ProgressPhotos).beforeWeight}${userData.weightUnit}.
    - The next set are "AFTER" (Front, Back, Left, Right) from the assessment on ${(photos as ProgressPhotos).afterDate} at a weight of ${(photos as ProgressPhotos).afterWeight}${userData.weightUnit}.
    - Compare these sets of photos meticulously. Identify visible changes in muscle density, body fat distribution, posture, and overall composition.
    - Provide feedback focused on the DELTA (the change) between before and after.
    ` : ''}

    FOCUS AREAS:
    1. Comprehensive Physique Ratings & Summaries for all views (Front, Back, Left, Right).
    2. Health Metrics (BMI, Body Fat, Calorie Targets based on current vs desired activity).
    3. Daily Support Info (Sleep, Hydration, Recovery, Grocery List).
    4. Motivational Quote.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: prompt }, ...photoParts],
    },
    config: {
      systemInstruction: `
        You are a world-class premium fitness coach and physique assessor.
        Your goal is to provide evidence-led, professional, and encouraging feedback.
        Return ONLY valid JSON for the core assessment and support components of the UNLCKD Pro Trainer report.
        Strictly adhere to the path constraint: ${path}.
        Each evaluation or summary field must be under 300 characters for conciseness.
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
  });

  return JSON.parse(response.text || "{}");
}

/**
 * 12-WEEK WORKOUT GENERATION
 */
async function generateWorkoutPlan(
  userData: UserData,
  isResubmit: boolean
): Promise<Partial<AssessmentResult>> {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Design an elite 12-week progressive workout plan for "UNLCKD Pro Trainer".
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    ${isResubmit ? "RESUBMIT MODE: Double check all exercise links and 12-week completeness." : ""}
    
    INSTRUCTIONS:
    - Exactly 12 weeks.
    - Tailor the volume and intensity progression to bridge the gap between current activity (${userData.physicalActivity}) and desired activity (${userData.desiredPhysicalActivity}).
    - 7 to 10 exercises per main session.
    - EVERY exercise must use markdown links: "[Exercise Name (Sets x Reps)](YouTube Link)".
    - Ensure video links exist and are high quality.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      systemInstruction: "You are an elite Strength & Conditioning coach. Return ONLY a JSON object containing the 'workoutPlan' array with exactly 12 weeks. Use high-quality YouTube links from established fitness channels.",
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
  });

  return JSON.parse(response.text || "{}");
}

/**
 * 12-WEEK MEAL PLAN GENERATION
 */
async function generateMealPlan(
  userData: UserData,
  isResubmit: boolean
): Promise<Partial<AssessmentResult>> {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Create a personalized 12-week meal plan for "UNLCKD Pro Trainer".
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    Preference: ${userData.caloriePreference}
    
    INSTRUCTIONS:
    - Exactly 12 weeks of structured meals.
    - Include recipe descriptions and links.
    - Include full macro details for each meal.
    - Adhere strictly to dietary considerations: ${userData.allergies || 'None'}.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      systemInstruction: "You are a performance nutritionist. Return ONLY a JSON object containing the 'mealPlan' array with exactly 12 weeks. Ensure calculations match user's goals.",
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
                      breakfastUrl: { type: Type.STRING },
                      breakfastMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } } },
                      lunch: { type: Type.STRING },
                      lunchUrl: { type: Type.STRING },
                      lunchMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } } },
                      dinner: { type: Type.STRING },
                      dinnerUrl: { type: Type.STRING },
                      dinnerMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } } },
                      snack: { type: Type.STRING },
                      snackUrl: { type: Type.STRING },
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
  });

  return JSON.parse(response.text || "{}");
}

export async function generateTransformationReport(
  userData: UserData,
  photos: Photos | ProgressPhotos,
  path: string,
  isResubmit: boolean = false
): Promise<AssessmentResult> {
  try {
    let result: Partial<AssessmentResult> = {};

    // 1. GENERATE CORE ASSESSMENT (Always if not just meal/workout)
    if (['full', 'assessment', 'progress'].includes(path)) {
      const core = await generateCoreAssessment(userData, photos, path, isResubmit);
      result = { ...result, ...core };
    }

    // 2. GENERATE WORKOUT PLAN (if requested)
    if (['full', 'workout'].includes(path)) {
      const workout = await generateWorkoutPlan(userData, isResubmit);
      result = { ...result, ...workout };
    }

    // 3. GENERATE MEAL PLAN (if requested)
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
