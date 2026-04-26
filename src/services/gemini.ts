import { GoogleGenAI, Type } from "@google/genai";
import { UserData, Photos, ProgressPhotos, AssessmentResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateTransformationReport(
  userData: UserData,
  photos: Photos | ProgressPhotos,
  path: string,
  isResubmit: boolean = false
): Promise<AssessmentResult> {
  const model = "gemini-3-flash-preview";

  const photoParts: any[] = [];
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

  if (path === 'progress') {
    const progress = photos as ProgressPhotos;
    // Before photos
    Object.values(progress.before).forEach(data => {
      const part = processPhoto(data);
      if (part) photoParts.push(part);
    });
    // After photos
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

  const prompt = `
    Analyze the following user data and physique photos to create a comprehensive transformation report.
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    ${isResubmit ? `
    RESUBMIT / RE-EVALUATION MODE ENABLED:
    - The previous version of this report had output issues (e.g., missing 12 weeks, broken links, or incomplete analysis).
    - You MUST be extra diligent in following ALL instructions, especially for the 12-week completeness and video link accuracy.
    - Ensure EVERY exercise has a valid YouTube link in markdown format.
    ` : ''}

    Requested Path: ${path}
    
    ${path === 'progress' ? `
    PROGRESS PHOTO ENGINE MODE:
    - You have been provided with up to 8 photos. The first set are "BEFORE" (Front, Back, Left, Right) from ${userData.name}'s assessment on ${(photos as ProgressPhotos).beforeDate} at a weight of ${(photos as ProgressPhotos).beforeWeight}${userData.weightUnit}.
    - The next set are "AFTER" (Front, Back, Left, Right) from the assessment on ${(photos as ProgressPhotos).afterDate} at a weight of ${(photos as ProgressPhotos).afterWeight}${userData.weightUnit}.
    - Compare these sets of photos meticulously. Identify visible changes in muscle density, body fat distribution, posture, and overall composition.
    - Factor in the weight change of ${Number((photos as ProgressPhotos).afterWeight) - Number((photos as ProgressPhotos).beforeWeight)}${userData.weightUnit} into your analysis.
    - Provide feedback similar to a standard assessment but focused on the DELTA (the change) between before and after.
    ` : ''}

    CURRENT WORKOUT ANALYSIS:
    - User's Current Workout: ${userData.currentWorkout || 'None provided'}.
    - If a current workout is provided, analyze its effectiveness for their goals (${userData.goals || 'Not specified'}) and suggest refinements.
    - If NO current workout is provided, you MUST recommend a full 12-week workout plan to help them achieve their goals.
    - The plan should be progressive, divided into phases or weeks.
    
    User Profile:
    - Name: ${userData.name}
    - Location: ${userData.location}
    - Occupation: ${userData.occupation}
    - Age: ${userData.age || 'Not provided'}
    - Height: ${userData.height ? `${userData.height} ${userData.heightUnit}` : 'Not provided'}
    - Weight: ${userData.weight ? `${userData.weight} ${userData.weightUnit}` : 'Not provided'}
    - Physical Activity Level: ${userData.physicalActivity}
    - Calorie Preference: ${userData.caloriePreference}
    - Injuries: ${userData.injuries || 'None reported'}
    - Food Preferences/Dietary Considerations: ${userData.allergies || 'None reported'}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          ...photoParts,
        ],
      },
      config: {
        systemInstruction: `
          You are a world-class premium fitness coach and physique assessor for "UNLCKD Pro Trainer".
          Your goal is to provide evidence-led, professional, and encouraging feedback.
          
          CORE RULES:
          1. NEVER include image data, base64 strings, or photo references in the JSON response.
          2. KEEP EVALUATIONS CONCISE: Each "evaluation" or "summary" field must be under 300 characters.
          3. KEEP PLANS ACTIONABLE BUT BRIEF: Workout and meal descriptions should be clear but not overly verbose.
          4. PATH-SPECIFIC GENERATION (CRITICAL):
             - If path is "full": You MUST provide ALL sections: 
               a) Physique Assessments: Detailed summaries and at least 3 ratings for Front, Back, Left, and Right views.
               b) Final Summary: A coaching-oriented overview with a clear "nextSteps" list.
               c) 12-Week Workout Plan: Exactly 12 weeks of training with video links.
               d) 12-Week Meal Plan: Exactly 12 weeks of structured meals with macros and Pinterest links.
               e) Support: Grocery list, recommended store, sleep advice, recovery schedule, hydration targets, and water schedule.
             - If path is "workout": Provide ONLY 12-week workout plan, sleep, hydration, and recovery. Return empty objects/arrays for physique assessments and meal plans.
             - If path is "meal": Provide ONLY 12-week meal plan, grocery list, and hydration. Return empty objects/arrays for physique assessments and workout plans.
             - If path is "assessment": Provide ONLY physique assessment and topline ratings.
             - If path is "progress": Provide ONLY physique comparison analysis between the provided before/after sets.
          5. COMPLETE 12-WEEK PLANS: If "full", "workout", or "meal" is requested, you MUST provide exactly 12 weekly blocks. Each week must have a specific phase/focus.
          6. EXERCISE FORMATTING (CRITICAL):
             - For every exercise in "mainWork" and "warmUp" (in workoutPlan), you MUST use markdown links for exercises.
             - Format: "[Exercise Name (Sets x Reps)](YouTube URL)".
             - The URL must be a valid direct YouTube video link.
             - Example: "- [Dumbbell Bench Press (4x10-12)](https://www.youtube.com/watch?v=...)".
             - For each training day, the "mainWork" field MUST contain between 7 to 10 specific, effective exercises.
          7. MOTIVATIONAL QUOTE: Generate a unique, powerful motivational quote specifically for this user's situation. The quote MUST be followed by the text "Unlock your greatness."
          8. SLEEP RECOMMENDATION: Provide deep research on sleep requirements tailored to support this user's specific workout routine, occupation, and goals. 
          9. DIET STRATEGY: Strictly adhere to the user's calorie preference (${userData.caloriePreference}). Calculate estimated TDEE and provide an exact daily calorie target.
             - UNIT CONSISTENCY: If the user's weight unit is "lbs" (${userData.weightUnit}), you MUST use the term "calories" or "cal" for all energy measurements (e.g., daily target, meal macros) and "ounces (fl oz)" or "gallons" for water intake. If "kg", you MAY use "kcal" for energy and "liters (L)" for water.
          10. VISUAL ANALYSIS: For each photo provided, conduct a thorough assessment of muscle definition, symmetry, and areas for improvement.
          11. WORKOUT VIDEOS (QUALITY VERIFICATION): 
              - For each exercise, you MUST provide a direct YouTube video URL (e.g., https://www.youtube.com/watch?v=...).
              - CRITICAL: You MUST conduct a mental verification that the video actually exists and shows the correct exercise.
              - NO BROKEN LINKS: Avoid private or deleted videos. Prefer well-known fitness channels (e.g., ScottHermanFitness, RenaissancePeriodization, BuffDudes, or specialized equipment channels like Tonal) to ensure stability.
              - EQUIPMENT SPECIFICITY: If smart equipment is used, the video MUST demonstrate on that equipment.
          12. QUALITY CONTROL & COMPLETENESS PROTOCOL: Before finalizing the JSON, you MUST verify:
              - CHECK 1: Are there exactly 12 weeks of plans?
              - CHECK 2: Do all views (Front, Back, Left, Right) have summaries and ratings?
              - CHECK 3: Is there a coaching-oriented "nextSteps" list in finalSummary?
              - CHECK 4: Are macro estimates present for all meals in the 12-week plan?
              - CHECK 5: Are hydration targets and recovery schedules populated?
          13. FINAL VALIDATION: You are FORBIDDEN from ending the generation until you have manually verified all checks pass. If data is too large, prioritize conciseness in descriptions to ensure all 12 weeks fit in the output.
          14. Return ONLY valid JSON matching the provided schema.
        `,
        responseMimeType: "application/json",
        maxOutputTokens: 65536,
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
                ratings: {
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
                summary: { type: Type.STRING },
              },
            },
            leftViewAnalysis: {
              type: Type.OBJECT,
              properties: {
                ratings: {
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
                summary: { type: Type.STRING },
              },
            },
            rightViewAnalysis: {
              type: Type.OBJECT,
              properties: {
                ratings: {
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
                summary: { type: Type.STRING },
              },
            },
            backViewAnalysis: {
              type: Type.OBJECT,
              properties: {
                ratings: {
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
                summary: { type: Type.STRING },
              },
            },
            finalSummary: {
              type: Type.OBJECT,
              properties: {
                ratings: {
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
                nextSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
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
                        videoUrl: { type: Type.STRING, description: "A general workout video link for the day if applicable" },
                        notes: { type: Type.STRING },
                      },
                    },
                  },
                },
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
                tips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
            nutritionStrategy: { type: Type.STRING },
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
                        breakfastMacros: {
                          type: Type.OBJECT,
                          properties: {
                            calories: { type: Type.STRING },
                            protein: { type: Type.STRING },
                            fat: { type: Type.STRING },
                            carbs: { type: Type.STRING },
                          },
                        },
                        lunch: { type: Type.STRING },
                        lunchUrl: { type: Type.STRING },
                        lunchMacros: {
                          type: Type.OBJECT,
                          properties: {
                            calories: { type: Type.STRING },
                            protein: { type: Type.STRING },
                            fat: { type: Type.STRING },
                            carbs: { type: Type.STRING },
                          },
                        },
                        dinner: { type: Type.STRING },
                        dinnerUrl: { type: Type.STRING },
                        dinnerMacros: {
                          type: Type.OBJECT,
                          properties: {
                            calories: { type: Type.STRING },
                            protein: { type: Type.STRING },
                            fat: { type: Type.STRING },
                            carbs: { type: Type.STRING },
                          },
                        },
                        snack: { type: Type.STRING },
                        snackUrl: { type: Type.STRING },
                        snackMacros: {
                          type: Type.OBJECT,
                          properties: {
                            calories: { type: Type.STRING },
                            protein: { type: Type.STRING },
                            fat: { type: Type.STRING },
                            carbs: { type: Type.STRING },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            groceryList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  items: { type: Type.STRING },
                },
              },
            },
            recommendedGroceryStore: { type: Type.STRING },
            recoverySchedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  focus: { type: Type.STRING },
                },
              },
            },
            waterSchedule: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            stepGoals: { type: Type.STRING },
            hydrationTargets: { type: Type.STRING },
            goalAlignmentSummary: { type: Type.STRING },
            trainerSummary: { type: Type.STRING },
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
                  },
                },
              },
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
                  },
                },
              },
            },
          },
        },
      },
    });
 
    const text = response.text || "{}";
    try {
      // Clean potential markdown wrapping and any leading/trailing whitespace
      let cleanedText = text.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      }
      
      // Final check for common truncation patterns (e.g., missing closing brace)
      if (cleanedText.endsWith(",") || (cleanedText.match(/{/g) || []).length > (cleanedText.match(/}/g) || []).length) {
        console.warn("Detected potentially truncated JSON, attempting to close it...");
        if (!cleanedText.endsWith("}")) cleanedText += "}";
      }
 
      const result = JSON.parse(cleanedText) as AssessmentResult;

      // MULTI-CHECK VALIDATION LOGIC
      const checks: { name: string; pass: boolean; error: string }[] = [];

      if (['full', 'workout'].includes(path)) {
        checks.push({
          name: "12-Week Workout Plan Completeness",
          pass: (result.workoutPlan?.length || 0) >= 12,
          error: `Workout plan contains only ${result.workoutPlan?.length || 0} weeks. All 12 weeks are required.`
        });
      }

      if (['full', 'meal'].includes(path)) {
        checks.push({
          name: "12-Week Meal Plan Completeness",
          pass: (result.mealPlan?.length || 0) >= 12,
          error: `Meal plan contains only ${result.mealPlan?.length || 0} weeks. All 12 weeks are required.`
        });
      }

      if (['assessment', 'full', 'progress'].includes(path)) {
        checks.push({
          name: "Physique Analysis Completeness",
          pass: !!result.frontViewAnalysis?.summary && (result.frontViewAnalysis.ratings?.length || 0) > 0,
          error: "Front view analysis is missing or incomplete."
        });
        checks.push({
          name: "Health Metrics Evaluation",
          pass: !!result.healthMetrics && !!result.healthMetrics.bmi && !!result.healthMetrics.estimatedBodyFat,
          error: "Health metrics (BMI, Body Fat) are missing or incomplete."
        });
      }

      if (path === 'full') {
        checks.push({
          name: "Grocery List Completeness",
          pass: (result.groceryList?.length || 0) > 0 && !!result.recommendedGroceryStore,
          error: "Grocery list or recommended store is missing."
        });
        checks.push({
          name: "Coaching Next Steps",
          pass: (result.finalSummary?.nextSteps?.length || 0) > 0,
          error: "Coaching-oriented next steps are missing."
        });
        checks.push({
          name: "Recovery & Hydration",
          pass: (result.recoverySchedule?.length || 0) > 0 && !!result.hydrationTargets && (result.waterSchedule?.length || 0) > 0,
          error: "Recovery schedule or hydration targets are missing."
        });
      }

      const failedChecks = checks.filter(c => !c.pass);
      if (failedChecks.length > 0) {
        throw new Error(`The transformation report failed completeness checks: ${failedChecks.map(c => c.error).join(' ')}`);
      }

      return result;
    } catch (e: any) {
      console.error("Validation Error:", e.message);
      if (e instanceof SyntaxError) {
        throw new Error("The AI response was not valid JSON. Please try again.");
      }
      throw e;
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("The Gemini API key is invalid. Please check your configuration.");
    }
    if (error.message?.includes("safety")) {
      throw new Error("The content was flagged by safety filters. Please ensure your photos are appropriate.");
    }
    throw new Error(error.message || "An unexpected error occurred while communicating with the AI.");
  }
}
