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
 * Safely parses JSON from a string, handling markdown, trailing commas, and truncated responses
 */
function safeParseJson(text: string): any {
  if (!text) return {};
  let cleaned = text.trim();
  
  // 1. Remove markdown backticks if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    cleaned = jsonMatch[1].trim();
  }

  // 2. Attempt direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 3. Attempt simple repairs (missing commas between structures)
    try {
      let repaired = cleaned
        .replace(/\}\s*\{/g, '}, {')
        .replace(/\]\s*\[/g, '], [')
        .replace(/,\s*([\]}])/g, '$1') // Trailing commas
        .replace(/(\w+)\s*:\s*([^,"'{\[][^,}\]]*)/g, '"$1": "$2"') // Wrap unquoted values
        .trim();
        
      if (!repaired.endsWith('}') && !repaired.endsWith(']')) {
         // Try to close hanging JSON
         if (repaired.lastIndexOf('{') > repaired.lastIndexOf('}')) repaired += '"}';
         else if (repaired.lastIndexOf('[') > repaired.lastIndexOf(']')) repaired += '"]';
      }

      return JSON.parse(repaired);
    } catch (innerE) {
      // 4. Last ditch: Find first '{' and last '}'
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const maybeJson = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          // One more repair attempt on the substring
          const repairedSub = maybeJson
            .replace(/\}\s*\{/g, '}, {')
            .replace(/\]\s*\[/g, '], [')
            .replace(/,\s*([\]}])/g, '$1');
          return JSON.parse(repairedSub);
        } catch (finalE) {
          console.error("Failed to repair JSON:", finalE);
          throw new SyntaxError(`AI returned malformed JSON: ${finalE.message}`);
        }
      }
      throw e;
    }
  }
}

/**
 * AI CALL RETRY HELPER
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 8, delay = 10000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error.message?.toLowerCase() || '';
    const isRateLimit = 
      errorMsg.includes('429') || 
      errorMsg.includes('quota') || 
      errorMsg.includes('throttle') ||
      errorMsg.includes('throttled') ||
      errorMsg.includes('resource_exhausted');

    const isRetryable = 
      isRateLimit ||
      errorMsg.includes('503') || 
      errorMsg.includes('high demand') ||
      errorMsg.includes('504') ||
      errorMsg.includes('deadline exceeded') ||
      error.status === 'UNAVAILABLE' ||
      errorMsg.includes('fetch failed');

    if (retries > 0 && isRetryable) {
      // Very aggressive wait for rate limits (15-30s start, then exponential)
      const waitTime = isRateLimit ? Math.max(delay, 15000) : delay;
      console.warn(`Gemini busy, rate limited, or network error. Wait ${waitTime}ms... (${retries} left). Msg: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return withRetry(fn, retries - 1, Math.min(delay * 2, 60000)); // Max wait 60s
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
  const model = "gemini-flash-latest";
  const photoParts = getPhotoParts(path, photos);

  let progressContext = "";
  if (path === 'progress') {
    const p = photos as ProgressPhotos;
    progressContext = `
    PROGRESS PHOTO ENGINE MODE:
    Compare current photos with previous ones. Identify changes in muscle density, body fat, and posture.
    Before Weight: ${p.beforeWeight} ${userData.weightUnit} (Date: ${p.beforeDate})
    After Weight: ${p.afterWeight} ${userData.weightUnit} (Date: ${p.afterDate})
    Evaluate the weight change in relation to the physique changes seen.
    `;
  }

  const prompt = `
    Perform a professional physique assessment for "UNLCKD Pro Trainer".
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    Height: ${userData.height} ${userData.heightUnit}
    Weight: ${userData.weight} ${userData.weightUnit}
    
    ${isResubmit ? "RESUBMIT MODE: Ensure maximum accuracy." : ""}
    Requested Path: ${path}
    ${progressContext}

    1. Height/Weight Assessment: Analyze the user's weight relative to their height. Determine if their current weight is optimal, overweight, or underweight for their frame and fitness goals.
    2. Detailed Ratings & Summaries for ALL views (Front, Back, Left, Right).
    Note: The goal is ${userData.goals}.
    
    STRICT EXCLUSION: Do NOT include any grocery lists or meal plan details in this specific analysis.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }, ...photoParts] }],
    config: {
      systemInstruction: `
        You are an elite physique assessor. Return ONLY valid JSON.
        CRITICAL: Never miss commas between items in arrays or objects.
        STRICT LIMIT: Each text field must be under 100 characters. 
        Be extremely concise.
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
              required: ["category", "rating", "evaluation"],
            },
          },
          frontViewAnalysis: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } }, required: ["category", "rating", "evaluation"] } },
              summary: { type: Type.STRING },
            },
            required: ["ratings", "summary"],
          },
          leftViewAnalysis: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } }, required: ["category", "rating", "evaluation"] } },
              summary: { type: Type.STRING },
            },
            required: ["ratings", "summary"],
          },
          rightViewAnalysis: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } }, required: ["category", "rating", "evaluation"] } },
              summary: { type: Type.STRING },
            },
            required: ["ratings", "summary"],
          },
          backViewAnalysis: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } }, required: ["category", "rating", "evaluation"] } },
              summary: { type: Type.STRING },
            },
            required: ["ratings", "summary"],
          },
          finalSummary: {
            type: Type.OBJECT,
            properties: {
              ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, rating: { type: Type.NUMBER }, evaluation: { type: Type.STRING } }, required: ["category", "rating", "evaluation"] } },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["ratings", "nextSteps"],
          },
        },
        required: ["toplineSummary", "toplineRatings", "frontViewAnalysis", "leftViewAnalysis", "rightViewAnalysis", "backViewAnalysis", "finalSummary"],
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
  isResubmit: boolean,
  path: string
): Promise<any> {
  const model = "gemini-flash-latest";

  const includeGrocery = path === 'full' || path === 'meal';

  const prompt = `
    Generate health metrics and supportive guidance for "UNLCKD Pro Trainer".
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    FOCUS: 
    1. Health Metrics (BMI, Body Fat, Calorie Targets).
    2. Daily Life (Sleep, Water, Steps).
    ${includeGrocery ? "3. Nutrition strategy and specific Grocery store recommendation with checklist. CRITICAL: Address the grocery list in 2-week blocks (e.g., Weeks 1-2, Weeks 3-4, etc.) for the entire 12-week duration." : "3. Motivation and general Nutrition strategies (No grocery list needed)."}
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: `
        You are a performance nutritionist and lifestyle coach. Return ONLY valid JSON.
        CRITICAL: The grocery list must be 100% accurate and strictly aligned with the meals you recommend. 
        Every single ingredient required for the meal plan MUST be included in the grocery list.
        Include all staples and specifics.
        Never miss commas between items.
        STRICT LIMIT: Each text field must be under 120 characters. 
        Focus on extreme brevity.
      `,
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      toolConfig: { includeServerSideToolInvocations: true },
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
              heightWeightAnalysis: { type: Type.STRING },
              recommendedCalorieLevel: { type: Type.STRING },
              dailyCalorieTarget: { type: Type.STRING },
            },
            required: ["bmi", "bmiCategory", "estimatedBodyFat", "healthStatus", "focus", "heightWeightAnalysis", "recommendedCalorieLevel", "dailyCalorieTarget"],
          },
          motivationalQuote: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              author: { type: Type.STRING },
            },
            required: ["text", "author"],
          },
          sleepRecommendation: {
            type: Type.OBJECT,
            properties: {
              duration: { type: Type.STRING },
              rationale: { type: Type.STRING },
              tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["duration", "rationale", "tips"],
          },
          recommendedGroceryStore: { type: Type.STRING },
          groceryList: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { type: Type.STRING },
                category: { type: Type.STRING },
                items: { type: Type.STRING },
              },
              required: ["phase", "category", "items"],
            },
          },
          hydrationTargets: { type: Type.STRING },
          waterSchedule: { type: Type.ARRAY, items: { type: Type.STRING } },
          stepGoals: { type: Type.STRING },
          recoverySchedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                focus: { type: Type.STRING },
              },
              required: ["day", "focus"],
            },
          },
          recommendedWorkout: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    sets: { type: Type.STRING },
                    reps: { type: Type.STRING },
                    focus: { type: Type.STRING },
                    videoUrl: { type: Type.STRING },
                  },
                  required: ["name", "sets", "reps", "focus", "videoUrl"],
                },
              },
            },
            required: ["title", "description", "exercises"],
          },
          additionalActivities: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    benefit: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                  },
                  required: ["name", "benefit", "frequency"],
                },
              },
            },
            required: ["title", "description", "activities"],
          },
          goalAlignmentSummary: { type: Type.STRING },
          trainerSummary: { type: Type.STRING },
          nutritionStrategy: { type: Type.STRING },
        },
        required: [
          "healthMetrics", 
          "motivationalQuote", 
          "sleepRecommendation", 
          "groceryList", 
          "hydrationTargets", 
          "stepGoals", 
          "nutritionStrategy", 
          "recoverySchedule", 
          "waterSchedule", 
          "goalAlignmentSummary", 
          "trainerSummary",
          "recommendedGroceryStore",
          "recommendedWorkout",
          "additionalActivities"
        ],
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
      
      CRITICAL: You MUST use the search tool to find and verify active, non-broken YouTube video links.
      ONLY use videos from established, high-authority fitness channels: "Renaissance Periodization", "Jeff Nippard", "Squat University", "Athlean-X", "ScottHermanFitness", "Mind Pump TV", "Buff Dudes", "Alan Thrall", "Bodybuilding.com". 
      Avoid "Shorts", deleted videos, or private clips. Every videoUrl MUST be a high-accuracy, reliable tutorial.
      If a specific video is hard to verify, provide a high-quality link from a major fitness publication (e.g., Men's Health, Muscle & Fitness).
      Every videoUrl MUST be a direct, working link.
      
      EVERY exercise MUST be formatted as "[Name (Sets x Reps)](YouTube Link)".
      CRITICAL: Use a NEW LINE (\n) for EACH exercise in the "mainWork" and "warmUp" strings. 
      Every exercise must be on its own row. Do not group multiple exercises into a single paragraph or string without newlines.
      Return exactly ${endWeek - startWeek + 1} week objects in the workoutPlan array.
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          systemInstruction: `Expert S&C Coach. JSON only. 
          CRITICAL: Every videoUrl MUST be a verified, active YouTube tutorial from high-authority sources (e.g., "Renaissance Periodization", "Jeff Nippard", "Squat University", "Athlean-X", "ScottHermanFitness").
          Use the search tool for EVERY exercise to ensure the link works and is NOT a short or private video.
          If no perfect video exists, use a reputable fitness article with a clear demonstration.
          Ensure exact requested weeks are provided.`,
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
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
                        required: ["day", "focus", "warmUp", "mainWork", "videoUrl", "notes"],
                      },
                    },
                  },
                  required: ["week", "phase", "days"],
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

  // Process in 3 batches of 4 weeks to reduce request count and stay within search tool quotas
  const batches = [[1, 4], [5, 8], [9, 12]];
  
  for (const [start, end] of batches) {
    const batch = await fetchBatch(start, end);
    workoutPlan.push(...batch);
    // Significant cooling delay between search-heavy batches
    await new Promise(resolve => setTimeout(resolve, 8000));
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
      Generate Weeks ${startWeek} through ${endWeek} of a personalized 12-week meal plan for UNLCKD Pro Trainer.
      User: ${userData.name}, Preferences: ${userData.caloriePreference}, Allergies: ${userData.allergies}.
      
      CRITICAL: You MUST use the search tool to find and verify direct, active recipe links.
      Prefer links from verified recipe developers: "Skinnytaste", "Minimalist Baker", "EatingWell", "AllRecipes", "Food Network", "Simply Recipes", "Serious Eats".
      While Pinterest pins are okay, direct website links (e.g., https://www.skinnytaste.com/xyz) are STRONGLY PREFERRED as they are more stable.
      Avoid login-walled sites or dead Pinterest IDs. Every meal URL MUST lead to a live, readable recipe.
      
      Current Range: Weeks ${startWeek}-${endWeek}.
      Return exactly ${endWeek - startWeek + 1} week objects in the mealPlan array.
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          systemInstruction: `Elite Nutritionist. JSON only. 
          CRITICAL: Every URL MUST be a direct, active recipe link (Direct website URLs are preferred over Pinterest).
          Use the search tool to verify every link leads to a live recipe. NO broken links, NO login walls.
          NEVER guess a URL or Pin ID.
          The grocery list (generated separately) will be cross-referenced, so ensure these recipes are standard and realistic.
          Ensure exact requested weeks are provided.`,
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
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
                          lunch: { type: Type.STRING },
                          lunchUrl: { type: Type.STRING },
                          dinner: { type: Type.STRING },
                          dinnerUrl: { type: Type.STRING },
                          snack: { type: Type.STRING },
                          snackUrl: { type: Type.STRING },
                          breakfastMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } }, required: ["calories", "protein", "fat", "carbs"] },
                          lunchMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } }, required: ["calories", "protein", "fat", "carbs"] },
                          dinnerMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } }, required: ["calories", "protein", "fat", "carbs"] },
                          snackMacros: { type: Type.OBJECT, properties: { calories: { type: Type.STRING }, protein: { type: Type.STRING }, fat: { type: Type.STRING }, carbs: { type: Type.STRING } }, required: ["calories", "protein", "fat", "carbs"] },
                        },
                        required: ["day", "breakfast", "breakfastUrl", "lunch", "lunchUrl", "dinner", "dinnerUrl", "snack", "snackUrl", "breakfastMacros", "lunchMacros", "dinnerMacros", "snackMacros"],
                      },
                    },
                  },
                  required: ["week", "days"],
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

  // Process in 3 batches of 4 weeks to reduce request count
  const batches = [[1, 4], [5, 8], [9, 12]];

  for (const [start, end] of batches) {
    const batch = await fetchBatch(start, end);
    mealPlan.push(...batch);
    // Significant cooling delay between search-heavy batches
    await new Promise(resolve => setTimeout(resolve, 8000));
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
        const lifestyle = await generateHealthAndSupport(cleanUserData, isResubmit, path);
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
        // Cooldown after previous search-heavy steps
        await new Promise(resolve => setTimeout(resolve, 5000));
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
        // Cooldown after previous search-heavy steps
        await new Promise(resolve => setTimeout(resolve, 5000));
        const meal = await generateMealPlan(cleanUserData, isResubmit);
        result = { ...result, ...meal };
      } catch (e) {
        console.error("Meal generation failed:", e);
        throw new Error(`Meal plan generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // Final Validation & Cleanup
    const finalResult = result as AssessmentResult;
    
    // Add report type metadata
    (finalResult as any).reportType = path === 'progress' ? 'Progress Comparison' : 
                                    path === 'assessment' ? 'Initial Assessment' :
                                    path === 'workout' ? 'Training Split' :
                                    path === 'meal' ? 'Meal Plan' : 'Full Transformation';
    
    // Ensure all required fields exist to avoid UI crashes
    finalResult.toplineSummary = finalResult.toplineSummary || "Assessment incoming...";
    finalResult.toplineRatings = finalResult.toplineRatings || [];
    
    const baseView = { ratings: [], summary: "Consultation in progress..." };
    finalResult.frontViewAnalysis = finalResult.frontViewAnalysis || { ...baseView };
    finalResult.leftViewAnalysis = finalResult.leftViewAnalysis || { ...baseView };
    finalResult.rightViewAnalysis = finalResult.rightViewAnalysis || { ...baseView };
    finalResult.backViewAnalysis = finalResult.backViewAnalysis || { ...baseView };
    
    finalResult.finalSummary = finalResult.finalSummary || { ratings: [], nextSteps: [] };
    finalResult.workoutPlan = finalResult.workoutPlan || [];
    finalResult.mealPlan = finalResult.mealPlan || [];
    finalResult.groceryList = finalResult.groceryList || [];
    finalResult.recoverySchedule = finalResult.recoverySchedule || [];
    finalResult.waterSchedule = finalResult.waterSchedule || [];
    
    finalResult.motivationalQuote = finalResult.motivationalQuote || { text: "Believe in the process.", author: "UNLCKD" };
    finalResult.sleepRecommendation = finalResult.sleepRecommendation || { duration: "7-9 hours", rationale: "Standard recovery", tips: [] };
    finalResult.nutritionStrategy = finalResult.nutritionStrategy || "Focused on goals.";
    finalResult.recommendedGroceryStore = finalResult.recommendedGroceryStore || "Global Mart";
    finalResult.stepGoals = finalResult.stepGoals || "8,000 - 10,000 steps daily";
    finalResult.hydrationTargets = finalResult.hydrationTargets || "2.5L - 3.5L daily";
    finalResult.goalAlignmentSummary = finalResult.goalAlignmentSummary || "Plan aligned with requirements.";
    finalResult.trainerSummary = finalResult.trainerSummary || "Keep pushing forward.";
    finalResult.healthMetrics = finalResult.healthMetrics || {
      bmi: 0,
      bmiCategory: "Calculating...",
      estimatedBodyFat: "TBD",
      healthStatus: "Assessment Pending",
      focus: "General Fitness",
      heightWeightAnalysis: "TBD",
      recommendedCalorieLevel: "maintain",
      dailyCalorieTarget: "Calculated post-analysis"
    };
    finalResult.recommendedWorkout = finalResult.recommendedWorkout || {
      title: "Daily Foundation",
      description: "Fundamental movements",
      exercises: []
    };
    finalResult.additionalActivities = finalResult.additionalActivities || {
      title: "Active Recovery",
      description: "Low impact movement",
      activities: []
    };

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
