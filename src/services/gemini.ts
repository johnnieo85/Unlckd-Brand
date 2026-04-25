import { GoogleGenAI, Type } from "@google/genai";
import { UserData, Photos, ProgressPhotos, AssessmentResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateTransformationReport(
  userData: UserData,
  photos: Photos | ProgressPhotos,
  path: string
): Promise<AssessmentResult> {
  const model = "gemini-3.1-pro-preview";

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
      contents: [
        {
          parts: [
            { text: prompt },
            ...photoParts,
          ],
        },
      ],
      config: {
        systemInstruction: `
          You are a world-class premium fitness coach and physique assessor for "UNLCKD Pro Trainer".
          Your goal is to provide evidence-led, professional, and encouraging feedback.
          
          CORE RULES:
          1. NEVER include image data, base64 strings, or photo references in the JSON response.
          2. KEEP EVALUATIONS CONCISE: Each "evaluation" or "summary" field must be under 300 characters.
          3. KEEP PLANS ACTIONABLE BUT BRIEF: Workout and meal descriptions should be clear but not overly verbose.
          4. PATH-SPECIFIC GENERATION:
             - If path is "workout" or "meal": You MUST return empty objects/arrays for "toplineRatings", "frontViewAnalysis", "leftViewAnalysis", "backViewAnalysis", "rightViewAnalysis", and "finalSummary".
             - If path is "assessment": You MUST return empty arrays for "workoutPlan", "mealPlan", and "groceryList", and an empty string for "nutritionStrategy".
             - If path is "progress": You MUST return empty arrays for "workoutPlan", "mealPlan", "groceryList", "recoverySchedule", "waterSchedule", and empty strings for "nutritionStrategy", "stepGoals", "hydrationTargets", "trainerSummary". You MUST provide "healthMetrics", "recommendedWorkout", and "additionalActivities".
             - If path is "workout", "meal", or "full": You MUST provide a plan for the duration requested by the user (${userData.planDuration || '12-week'}).
             - Structure the response into weeks for relevant paths. If "7-day" is requested, return a single week with 7 days. If "2-week", "4-week", or "12-week" is requested, return the corresponding number of weeks.
             - Each week should have a specific focus or phase.
             - Ensure progressive overload in the workout plan.
             - AVOID REPETITION: If certain days or meals are similar across weeks, keep the descriptions extremely short to save tokens.
             - PRIORITY: Completing the entire requested duration is more important than detailed prose.
          5. DIET STRATEGY (CALORIE PREFERENCE): Strictly adhere to the user's calorie preference (${userData.caloriePreference}).
             - If "deficit": prioritize a sustainable energy deficit for fat loss (Lose Weight).
             - If "maintain": prioritize body recomposition and maintenance calories (Maintain Weight).
             - If "surplus": prioritize muscle gain and a energy surplus (Gain Weight).
          5. FAT LOSS: If in deficit, prioritize high protein (1.6-2.2g/kg), and resistance training 2-4x/week.
          6. VISCERAL FAT: Emphasize HIIT and moderate-to-vigorous aerobic work.
          7. MOBILITY: Integrate dynamic mobility in warm-ups and static stretching for recovery.
          8. TRAINING MODALITIES: Utilize Kettlebells, Resistance Bands, and Bodyweight where appropriate.
          9. If NO photos are provided, provide a text-only assessment based on the user's data (age, weight, height, goals, calorie preference).
          10. WORKOUT VIDEOS: For each exercise in the "mainWork" and "warmUp" fields, you MUST provide a direct YouTube video URL (e.g., https://www.youtube.com/watch?v=...) that shows how to perform the exercise. CRITICAL: The links MUST point to a single video player page, never to a search results page (e.g., /results?search_query=) or a channel page. Use markdown format: [Exercise Name](Direct YouTube URL). Ensure the link is for the specific exercise mentioned.
          11. MEAL RECIPES: For each meal in the meal plan, provide a direct Pinterest recipe link in the corresponding "Url" field (e.g., breakfastUrl).
          12. GROCERY STORE: Recommend a specific grocery store (e.g., Whole Foods, Trader Joe's, Tesco, etc.) where the user can find the majority of their grocery list items based on their location (${userData.location}) and the generated list.
          13. HYDRATION UNITS: If the user's weight unit is "lbs" (${userData.weightUnit}), provide all hydration targets and water schedules in imperial units (ounces/oz). If "kg", use metric (liters/L).
          14. GOAL ALIGNMENT SUMMARY: Provide a "goalAlignmentSummary" (under 500 characters) that conducts a short overview of what will help the person reach their desired goal. This must convey that deep research was conducted on their specific goals (${userData.goals}) and their occupation (${userData.occupation}), explaining why the generated workout plan is the optimal fit for them.
          15. HYDRATION RESEARCH: Conduct deep research on water consumption specifically for this user. The "hydrationTargets" and "waterSchedule" MUST be tailored to:
              - Their workout desire and intensity.
              - Recommended daily intake based on weight (${userData.weight} ${userData.weightUnit}) and activity level (${userData.physicalActivity}).
              - Any reported health conditions or injuries (${userData.injuries || 'None'}).
              Explain the logic behind these targets in the "hydrationTargets" field.
          16. OCCUPATION-CENTERED TRAINING: The workout plan MUST be centered around deep research on their occupation (${userData.occupation}). For example, if they have a sedentary desk job, prioritize posture, hip mobility, and metabolic conditioning. If they have a physically demanding job, prioritize recovery, structural balance, and injury prevention.
          17. EXTREME CONCISENESS: To prevent JSON truncation, you MUST keep all descriptions, evaluations, and notes extremely brief (under 150 characters per field).
          18. HEALTH METRICS & RECOMMENDED WORKOUT (PROGRESS PATH ONLY):
              - If path is "progress", you MUST calculate:
                - BMI: (weight in kg) / (height in m)^2.
                - BMI Category: (Underweight, Healthy, Overweight, Obese).
                - Estimated Body Fat %: Based on visual analysis of photos and user data.
                - Health Status: A summary of their current physical health based on BMI and body fat.
                - Focus: What they should prioritize (e.g., "Focus on a slight calorie deficit to reach a healthy BMI range").
              - Recommended Workout: Provide a single, deeply researched workout routine (title, description, and 4-6 specific exercises) tailored to address the "concerning areas" identified in the physique comparison. For each exercise, include a direct YouTube video URL (not a search link or channel link) in the "videoUrl" field. Ensure the link points specifically to a single video showing that exercise.
              - Additional Activities: Conduct deep research and provide a section about additional activities to help reach goals, such as sauna, massages, swimming, or any other activity that may assist with becoming healthy. Include a title, description, and a list of 3-4 specific activities with their benefits and recommended frequency.
          19. Return ONLY valid JSON matching the provided schema.
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
                        lunch: { type: Type.STRING },
                        lunchUrl: { type: Type.STRING },
                        dinner: { type: Type.STRING },
                        dinnerUrl: { type: Type.STRING },
                        snack: { type: Type.STRING },
                        snackUrl: { type: Type.STRING },
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

      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse Gemini response. Length:", text.length);
      console.error("Response preview:", text.substring(0, 500) + "...");
      throw new Error("The AI response was invalid or truncated. Please try again with a more specific goal.");
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
