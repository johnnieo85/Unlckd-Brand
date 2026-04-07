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
    - You have been provided with up to 8 photos. The first set are "BEFORE" (Front, Back, Left, Right) from ${userData.name}'s assessment on ${(photos as ProgressPhotos).beforeDate}.
    - The next set are "AFTER" (Front, Back, Left, Right) from the assessment on ${(photos as ProgressPhotos).afterDate}.
    - Compare these sets of photos meticulously. Identify visible changes in muscle density, body fat distribution, posture, and overall composition.
    - Provide feedback similar to a standard assessment but focused on the DELTA (the change) between before and after.
    ` : ''}

    CURRENT WORKOUT ANALYSIS:
    - User's Current Workout: ${userData.currentWorkout || 'None provided'}.
    - If a current workout is provided, analyze its effectiveness for their goals (${userData.goals || 'Not specified'}) and suggest refinements.
    - If NO current workout is provided, you MUST recommend a full 7-day workout plan to help them achieve their goals.
    
    User Profile:
    - Name: ${userData.name}
    - Location: ${userData.location}
    - Age: ${userData.age || 'Not provided'}
    - Height: ${userData.height ? `${userData.height} ${userData.heightUnit}` : 'Not provided'}
    - Weight: ${userData.weight ? `${userData.weight} ${userData.weightUnit}` : 'Not provided'}
    - Calorie Preference: ${userData.caloriePreference}
    - Injuries: ${userData.injuries || 'None reported'}
    - Allergies/Preferences: ${userData.allergies || 'None reported'}
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
          4. CALORIE PREFERENCE: Strictly adhere to the user's calorie preference (${userData.caloriePreference}).
             - If "deficit": prioritize a sustainable energy deficit for fat loss.
             - If "maintain": prioritize body recomposition and maintenance calories.
             - If "surplus": prioritize muscle gain and a slight energy surplus.
          5. FAT LOSS: If in deficit, prioritize high protein (1.6-2.2g/kg), and resistance training 2-4x/week.
          6. VISCERAL FAT: Emphasize HIIT and moderate-to-vigorous aerobic work.
          7. MOBILITY: Integrate dynamic mobility in warm-ups and static stretching for recovery.
          8. TRAINING MODALITIES: Utilize Kettlebells, Resistance Bands, and Bodyweight where appropriate.
          9. If NO photos are provided, provide a text-only assessment based on the user's data (age, weight, height, goals, calorie preference).
          10. Return ONLY valid JSON matching the provided schema.
        `,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
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
                  day: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  warmUp: { type: Type.STRING },
                  mainWork: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
              },
            },
            nutritionStrategy: { type: Type.STRING },
            mealPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  breakfast: { type: Type.STRING },
                  lunch: { type: Type.STRING },
                  dinner: { type: Type.STRING },
                  snack: { type: Type.STRING },
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
            trainerSummary: { type: Type.STRING },
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
