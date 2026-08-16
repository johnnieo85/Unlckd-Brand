import { GoogleGenAI, Type } from "@google/genai";
import { UserData, Photos, ProgressPhotos, AssessmentResult } from "../types";
import { getPlanDurationWeeks } from "../lib/utils";

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
        .trim();

      return JSON.parse(repaired);
    } catch (innerE) {
      // 4. Robust bracket, brace, and quote balancing repair
      try {
        let repaired = cleaned
          .replace(/\}\s*\{/g, '}, {')
          .replace(/\]\s*\[/g, '], [')
          .replace(/,\s*([\]}])/g, '$1')
          .trim();

        let inString = false;
        let isEscaped = false;
        const stack: string[] = [];

        for (let i = 0; i < repaired.length; i++) {
          const char = repaired[i];
          if (isEscaped) {
            isEscaped = false;
            continue;
          }
          if (char === '\\') {
            isEscaped = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === '{' || char === '[') {
              stack.push(char === '{' ? '}' : ']');
            } else if (char === '}' || char === ']') {
              if (stack.length > 0 && stack[stack.length - 1] === char) {
                stack.pop();
              }
            }
          }
        }

        // Repair unclosed string literal if truncated
        if (inString) {
          repaired += '"';
        }

        // Close unclosed braces and brackets in correct reverse order
        while (stack.length > 0) {
          repaired += stack.pop();
        }

        return JSON.parse(repaired);
      } catch (finalE: any) {
        // Last ditch: Find first '{' and last '}'
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
          } catch (superFinalE: any) {
            console.error("Failed to repair JSON:", superFinalE);
            throw new SyntaxError(`AI returned malformed JSON: ${superFinalE.message}`);
          }
        }
        throw e;
      }
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
    const errorMsg = (error instanceof Error ? error.message : String(error)).toLowerCase();
    const isRateLimit = 
      errorMsg.includes('429') || 
      errorMsg.includes('quota') || 
      errorMsg.includes('quota_exceeded') ||
      errorMsg.includes('limit') ||
      errorMsg.includes('throttle') ||
      errorMsg.includes('throttled') ||
      errorMsg.includes('resource_exhausted');

    const isRetryable = 
      isRateLimit ||
      errorMsg.includes('503') || 
      errorMsg.includes('high demand') ||
      errorMsg.includes('504') ||
      errorMsg.includes('deadline exceeded') ||
      errorMsg.includes('rpc failed') ||
      errorMsg.includes('xhr error') ||
      errorMsg.includes('status: unknown') ||
      error.status === 'UNAVAILABLE' ||
      errorMsg.includes('load failed') ||
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
    
    CRITICAL: You are in PROGRESS ENGINE mode. This is a high-depth comparison. 
    Assess the difference between the photos, positive or negative, with absolute precision. 
    Explicitly mention what has improved or declined in each specific view (Front, Back, Side). 
    Focus on "Then vs Now" granular details: muscle separation, vascularity changes, postural shifts, subcutaneous fat distribution, and structural density.
    Don't just say what's there; say what CHANGED compared to the previous state.
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

    ${path === 'assessment' ? `EXERCISE NAMING PROTOCOL (NO WEB LINKS):
    - DO NOT include web address links, URLs, YouTube search links, or Markdown links in any summaries or evaluations.
    - Only include the clean, plain exercise name (e.g., "Seated Cable Row", "Incline Dumbbell Press", "Romanian Deadlift", "Dead Bug").
    - NEVER append URLs like "Seated Cable Row(https://...)" or "[Seated Cable Row](https://...)". Always write clean plain text: "Seated Cable Row".` : `LINK QUALITY PROTOCOL:
    - If you reference any specific exercises or movements in your summaries, you MUST hyperlink them using Markdown: [Exercise Name](VideoURL).
    - Use this YouTube search link: https://www.youtube.com/results?search_query=[EXERCISE+NAME]+exercise+tutorial
    - NEVER provide raw URLs in parentheses like "Exercise Name (URL)". ONLY use Markdown links where the name is the clickable text.`}
    
    STRICT EXCLUSION: Do NOT include any grocery lists or meal plan details in this specific analysis.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }, ...photoParts] }],
    config: {
      systemInstruction: `
        You are an elite physique assessor. Return ONLY valid JSON.
        CRITICAL: Never miss commas between items in arrays or objects.
        ${path === 'progress' ? 'STRICT LIMIT: Each analysis field must be between 150-300 characters to provide high-depth feedback.' : 'STRICT LIMIT: Each text field must be under 200 characters.'}
        Be descriptive and professional, providing specific technical observations.
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

  const result = safeParseJson(response.text || "{}");
  return result;
}

/**
 * HEALTH & SUPPORT COMPONENT
 */
async function generateHealthAndSupport(
  userData: UserData,
  isResubmit: boolean,
  path: string,
  physiqueAnalysis?: any
): Promise<any> {
  const model = "gemini-flash-latest";

  const includeGrocery = path === 'full' || path === 'meal';
  const isDietRestricted = path === 'assessment' || path === 'workout';
  const includeRecovery = path === 'full' || path === 'workout';

  const prompt = `
    Generate health metrics and supportive guidance for "UNLCKD Pro Trainer".
    
    User Data:
    ${JSON.stringify(userData, null, 2)}
    
    GYM ACCESS PROTOCOL:
    - The user has: ${userData.gymAccess === 'none' ? 'NO EQUIPMENT' : userData.gymAccess === 'home' ? 'BASIC HOME GYM' : 'FULL COMMERCIAL GYM'}.
    ${userData.gymAccess === 'none' ? '- CRITICAL: Since the user has NO EQUIPMENT, any recommended workouts or exercises MUST be 100% bodyweight-only (Calisthenics, HIIT bodyweight, plyometrics). No weights or machines.' : ''}

    INJURY PROTOCOL:
    - Review the user's injuries: ${userData.injuries || 'None reported'}.
    - If an injury is explicitly described as occurring MORE than 3 years ago (e.g., "ACL tear in 2018", "Back pain 5 years ago"), do NOT let it significantly restrict the training recommendations or health outlook. Treat the area as recovered while maintaining reasonable safety advice.
    - Only major, recent, or chronic recurring injuries should dictate strict movement exclusions.

    FOCUS: 
    1. Health Metrics (BMI, Body Fat, Calorie Targets).
    2. Daily Life (Sleep, Water, Steps).
    3. Supplement Strategy: Recommend specific fitness and nutritional supplements (e.g., Protein Powder, Creatine, Omega-3s, Multivitamins) tailored to their goals and equipment access.
    ${includeRecovery ? `4. RECOVERY & MODALITY PROTOCOL:
       Generate a 7-day "recoverySchedule" complimenting the user's workout schedule. For each day (Monday through Sunday), prescribe specific targeted recovery modalities such as:
       - Infrared Sauna (15-20 mins @ 165-175°F for GH release & CNS relaxation)
       - Steam Room (12-15 mins @ 110-115°F for moist heat & joint cartilage warmth)
       - NormaTec Compression Boots (20-30 mins level 5-7 for lactic acid & venous flush after leg/lower body training)
       - Percussive Therapy / Theragun & Foam Rolling (10 mins on trained muscle groups)
       - Contrast Therapy / Cold Plunge (3 cycles: 15m Sauna + 3m Cold Plunge @ 48°F)
       - Deep Tissue / Sports Massage or Active Spinal Decompression (on active recovery days)
       Populate "modalities" (array of strings), "duration" (string), and "notes" (string) for each day in "recoverySchedule".` : `4. RECOVERY & MODALITY PROTOCOL:
       Do NOT provide a suggested recovery protocol for this report type. Keep "recoverySchedule" as an empty array [].`}
    ${isDietRestricted ? `5. RECOMMENDED EATING STYLE (STRICT NO FULL MEAL PLAN & NO DIET FADS):
       - Do NOT offer a full meal plan, recipes, or day-by-day food menus.
       - Do NOT recommend any named diets or dietary labels (e.g. absolutely NO vegan, carnivore, keto, paleo, pescatarian, intermittent fasting, etc.).
       - Prescribe a clear "recommended eating style" strictly focused on energy balance and metabolic goals: specifically recommend whether to eat at a caloric deficit (to lose weight / body fat), caloric maintenance (to maintain weight and recomposition), or caloric surplus (to gain muscle / mass).
       - Set "recommendedCalorieLevel" in healthMetrics to strictly one of: "deficit", "maintenance", or "surplus".
       - Set "dailyCalorieTarget" in healthMetrics to a concrete daily target (e.g. "2,100 - 2,300 kcal/day").
       - In "nutritionStrategy", write 2 focused paragraphs detailing this recommended eating style (caloric deficit/maintenance/surplus), daily protein guidelines, and whole food nutrition fundamentals without full meal plans or diet fads.` : includeGrocery ? `5. Comprehensive Nutrition strategy for the full ${userData.planDuration || '12-week'} duration. This strategy MUST reference at least 5 key specific meals or ingredients that appear in the meal plan, including their names and verified links. 6. Grocery store recommendation.` : "5. Motivation and general Nutrition strategies."}
    ${path === 'assessment' ? `6. TRAINER FOLLOW-UP SUMMARY (OVERALL SUMMARY & VISUAL HEALTH EVALUATION):
       In "trainerSummary", write an extended, comprehensive multi-paragraph evaluation synthesizing the subject's entire assessment across ALL photo reviews (Front, Back, Left Side, and Right Side profiles).
       ${physiqueAnalysis ? `Here are the photo review findings:
       - Front View Summary: ${physiqueAnalysis.frontViewAnalysis?.summary || 'Evaluated'}
       - Left Side Summary: ${physiqueAnalysis.leftViewAnalysis?.summary || 'Evaluated'}
       - Right Side Summary: ${physiqueAnalysis.rightViewAnalysis?.summary || 'Evaluated'}
       - Back View Summary: ${physiqueAnalysis.backViewAnalysis?.summary || 'Evaluated'}
       - Topline Overview: ${physiqueAnalysis.toplineSummary || 'Evaluated'}
       ` : ''}
       Structure the trainer summary to clearly address:
       1. Overall Summary & Visual Health Standpoint: Explicitly explain whether the individual is viewed as healthy from a visual and physiological standpoint based on the photos (assessing body composition, muscular tone, posture, structural balance, adipose distribution, and vitality).
       2. Comparison Information: Detail key comparative insights comparing anterior vs posterior balance, bilateral symmetry (left vs right), and comparisons against normative demographic benchmarks and their stated target goals (${userData.goals || 'physique progression'}).
       3. Actionable Coaching Directives & Recommended Timeline: Clear, encouraging next-phase recommendations. Always mention the timeline as recommended (e.g., "recommended ${userData.planDuration || '12-week'} block" or "recommended ${userData.planDuration || '12-week'} training cycle", NOT a mandatory schedule).
       
       STRICT LINK RULE FOR PHYSIQUE ASSESSMENT TRAINER SUMMARY:
       - ABSOLUTELY DO NOT include any website links, YouTube search links, markdown hyperlinks [Exercise](URL), or raw URLs in the trainerSummary for this physique assessment report. Keep all exercise, movement, and coaching references strictly in clean, plain professional text without any hyperlinks or URLs.` : ''}
    
    UNIT ALIGNMENT: 
    - If user weight is in 'lbs', use US Imperial units for food: oz, lbs, cups, tsp, tbsp.
    - If user weight is in 'kg', use Metric units for food: g, kg, ml, l.
    The user's weight unit is: ${userData.weightUnit || 'lbs'}.
    
    ${path === 'assessment' ? `EXERCISE & NUTRITION NAMING (NO WEB LINKS):
    - For this assessment report, DO NOT include any web address links, URLs, YouTube search links, Pinterest links, or Markdown hyperlinks [Name](URL).
    - Only include clean, plain exercise and food names (e.g. "Seated Cable Row", "Incline Dumbbell Press", "Romanian Deadlift").
    - NEVER provide raw URLs or URLs in parentheses like "Seated Cable Row(https://...)".` : `LINK QUALITY PROTOCOL:
    - For EVERY exercise demonstration mentioned, you MUST use the appropriate link:
      https://www.youtube.com/results?search_query=[EXERCISE+NAME]+exercise+tutorial
    - For EVERY nutrition or recipe mention, you MUST use this Pinterest search link: https://www.pinterest.com/search/pins/?q=[MEAL+NAME]+healthy+recipe
    - NEVER provide raw URLs in parentheses like "(https://...)". 
    - You MUST use Markdown hyperlinks: [Exercise/Meal Name](SearchURL).
    - Only the Name should be clickable. No visible plain-text URLs on the report.`}
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: `
        You are a master performance coach and nutritionist. Return ONLY valid JSON.
        
        ${isDietRestricted ? `
        EATING STYLE PROTOCOL (NO FULL MEAL PLAN, NO DIET FADS):
        - DO NOT provide a full meal plan, day-to-day recipes, or meal tables.
        - DO NOT recommend named diets or dietary fads (e.g., absolutely NO vegan, carnivore, keto, paleo, etc.).
        - Prescribe a recommended eating style focused on caloric balance: eating at a caloric deficit to lose weight/body fat, caloric maintenance for body recomposition, or caloric surplus to gain muscle/weight.
        - Set healthMetrics.recommendedCalorieLevel to "deficit", "maintenance", or "surplus".
        ` : `
        NUTRITION PROTOCOL:
        - When recommending meals, ensure quantities align with the unit system: ${userData.weightUnit === 'lbs' ? 'oz/lbs' : 'grams/kg'}.
        - Every single meal or ingredient mentioned in your summaries/strategies MUST be a specific, individually listed item that will appear in the final plan.
        - Reference at least 5-7 specific meals by name and provide their verified search links using the pattern [Meal Name](SearchURL).
        - Use the search tool to verify every single meal link leads to a high-quality recipe.
        - NO RAW URLS as text. Only use Markdown: [Meal Name](Link).
        `}
        
        SUPPLEMENTS & VITAMINS: Provide 3-5 specific recommendations (e.g., Protein, Creatine, Omega-3, Zinc, Multivitamins) tailored to their goals and health profile.
        SAFETY: Verify recommendations do not conflict with any stated health issues or injuries.
        LINKS: For each supplement, provide a high-quality manufacturer or informational URL in the "link" field. Do NOT use markdown in the JSON "link" property, only the raw URL. Use markdown [Name](Link) format ONLY in the text summaries.
        
        WORKOUT PROTOCOL:
        - When discussing training strategy, reference specific, individual exercises (e.g., "Incorporate [Romanian Deadlifts](VideoURL) for posterior chain...").
        - Link to verified demonstrations for every exercise mentioned using Markdown: [Exercise Name](Link).
        - Ensure all references are to individual movements, NOT generic "workout focuses".
        - NO RAW URLS as text. Only use Markdown: [Exercise Name](Link).
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
                modalities: { type: Type.ARRAY, items: { type: Type.STRING } },
                duration: { type: Type.STRING },
                notes: { type: Type.STRING },
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
          supplementRecommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                dosage: { type: Type.STRING },
                timing: { type: Type.STRING },
                benefit: { type: Type.STRING },
                link: { type: Type.STRING }
              },
              required: ["name", "dosage", "timing", "benefit", "link"]
            }
          }
        },
        required: [
          "healthMetrics", 
          "motivationalQuote", 
          "sleepRecommendation", 
          "hydrationTargets", 
          "stepGoals", 
          "nutritionStrategy", 
          "recoverySchedule", 
          "waterSchedule", 
          "goalAlignmentSummary", 
          "trainerSummary",
          "recommendedGroceryStore",
          "recommendedWorkout",
          "additionalActivities",
          "supplementRecommendations"
        ],
      },
    },
  }));

  const result = safeParseJson(response.text || "{}");
  
  // Apply logic to all generated content
  return result;
}

/**
 * 12-WEEK WORKOUT GENERATION (Batched)
 */
async function generateWorkoutPlan(
  userData: UserData,
  isResubmit: boolean,
  memberStatus: 'none' | 'premium' | 'pro',
  invalidLinksContext?: string
): Promise<Partial<AssessmentResult>> {
  const workoutPlan: any[] = [];
  const numWeeks = getPlanDurationWeeks(userData.planDuration);
  
  const fetchBatch = async (startWeek: number, endWeek: number): Promise<any[]> => {
    const prompt = `
      Design Weeks ${startWeek} through ${endWeek} of an elite ${numWeeks}-week workout plan for "UNLCKD Pro Trainer".
      User: ${userData.name}, Goal: ${userData.goals}.
      Current Range: Weeks ${startWeek}-${endWeek}.
      
      GYM ACCESS PROTOCOL:
      - The user has: ${userData.gymAccess === 'none' ? 'NO EQUIPMENT' : userData.gymAccess === 'home' ? 'BASIC HOME GYM' : 'FULL COMMERCIAL GYM'}.
      ${userData.gymAccess === 'none' ? '- CRITICAL: Since the user has NO EQUIPMENT, you MUST design the entire plan using ONLY bodyweight exercises (Calisthenics, HIIT bodyweight workouts, plyometrics). Do NOT include any exercises requiring dumbbells, barbells, or machines.' : ''}

      INJURY PROTOCOL:
      - Consider User Injuries: ${userData.injuries || 'None'}.
      - EXCEPTION: If an injury is explicitly dated or described as being OLDER than 3 years, do NOT consider it a major limitation. Design a standard, high-performance plan for that area.
      - Older injuries should be seen as recovered unless stated as "chronic" or "currently active".

      ${invalidLinksContext ? `FIX MODE: The following links from a previous generation were flagged as invalid or problematic. Please search for BETTER, high-quality alternatives for these specific movements/recipes:\n${invalidLinksContext}` : ""}

      LINK QUALITY PROTOCOL:
      - For EVERY exercise (warmUp and mainWork):
        - You MUST set "videoUrl" to a YouTube search result link: https://www.youtube.com/results?search_query=[EXERCISE+NAME]+exercise+tutorial
      - Replace [EXERCISE+NAME] with the actual name of the exercise, URL-encoded where necessary.
      - NEVER provide direct URLs to specific YouTube videos or hallucinate video IDs.
      - Each exercise Name in the output will be hyperlinked by the UI. 
      
      STRUCTURE & COMPLETENESS:
      - Each week MUST contain exactly 7 day objects (Monday through Sunday).
      - EVERY single training day MUST contain ONLY individual exercises (no summary focus blocks).
      - EVERY single training day MUST have at least 3-5 warmUp exercises and 5-8 mainWork exercises.
      - NEVER use placeholders like "Repeat Week 1" or "Same as Day 1". 
      - Every exercise MUST have a unique, non-generic name (e.g., "Barbell High Bar Squat" instead of just "Squat").
      - Every single exercise object MUST have a verified, non-empty videoUrl.
      - warmUp: Array of objects { name, videoUrl }
      - mainWork: Array of objects { name, sets, reps, videoUrl }
      
      Return exactly ${endWeek - startWeek + 1} week objects in the workoutPlan array, with 7 days in each week.
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          systemInstruction: `Expert S&C Coach. JSON only. 
          QUALITY CHECK PROTOCOL: Every videoUrl MUST be formatted exactly as specified in the prompt.
          Every videoUrl MUST be a formatted YouTube search result link as specified in the prompt.
          Do NOT provide direct links to specific YouTube videos.
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
                          warmUp: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                name: { type: Type.STRING },
                                videoUrl: { type: Type.STRING }
                              },
                              required: ["name", "videoUrl"]
                            }
                          },
                          mainWork: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                name: { type: Type.STRING },
                                sets: { type: Type.STRING },
                                reps: { type: Type.STRING },
                                videoUrl: { type: Type.STRING }
                              },
                              required: ["name", "sets", "reps", "videoUrl"]
                            }
                          },
                          notes: { type: Type.STRING },
                        },
                        required: ["day", "warmUp", "mainWork", "notes"],
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
      const batchWorkoutPlan = data.workoutPlan || [];

      return batchWorkoutPlan;
    } catch (error) {
      console.error(`Error fetching workout weeks ${startWeek}-${endWeek}:`, error);
      throw error;
    }
  };

  // Process in 1-week batches to stay within search tool quotas and prevent RPC timeouts
  const batches = Array.from({ length: numWeeks }, (_, i) => [i + 1, i + 1]);
  
  for (const [start, end] of batches) {
    const batch = await fetchBatch(start, end);
    if (batch && Array.isArray(batch)) {
      workoutPlan.push(...batch);
    }
    // Significant cooling delay between search-heavy batches
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  return { workoutPlan: workoutPlan.sort((a, b) => a.week - b.week) };
}

/**
 * 12-WEEK MEAL PLAN GENERATION (Batched)
 */
async function generateMealPlan(
  userData: UserData,
  isResubmit: boolean,
  memberStatus: 'none' | 'premium' | 'pro',
  invalidLinksContext?: string
): Promise<Partial<AssessmentResult>> {
  const mealPlan: any[] = [];
  const numWeeks = getPlanDurationWeeks(userData.planDuration);

  const fetchBatch = async (startWeek: number, endWeek: number): Promise<any[]> => {
    const prompt = `
      Generate Weeks ${startWeek} through ${endWeek} of a personalized ${numWeeks}-week meal plan for UNLCKD Pro Trainer.
      User: ${userData.name}, Preferences: ${userData.caloriePreference}, Allergies: ${userData.allergies}.
      
      ${invalidLinksContext ? `FIX MODE: The following links from a previous generation were flagged as invalid or problematic. Please search for BETTER, high-quality alternatives for these specific meals:\n${invalidLinksContext}` : ""}

      LINK QUALITY PROTOCOL:
      - For EVERY meal recommendation, you MUST set the corresponding URL field (breakfastUrl, lunchUrl, dinnerUrl, snackUrl) to a Pinterest search result link: https://www.pinterest.com/search/pins/?q=[MEAL+NAME]+healthy+recipe
      - Replace [MEAL+NAME] with the actual name of the meal, URL-encoded where necessary.
      - NEVER provide direct URLs to specific recipe websites. 
      - Each meal Name in the output will be hyperlinked by the UI.
      
      COMPLETENESS & VARIETY:
      - EVERY single day MUST have unique breakfast, lunch, dinner, and snack recommendations.
      - NEVER say "Leftovers" or "Eat same as Day 1". 
      - Every meal MUST have a specific name and a corresponding verified recipe URL.
      - Macros MUST be realistic for the specific meal name provided.
      
      Current Range: Weeks ${startWeek}-${endWeek}.
      Return exactly ${endWeek - startWeek + 1} week objects in the mealPlan array.
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          systemInstruction: `Elite Nutritionist. JSON only. 
          QUALITY CHECK PROTOCOL: Every meal URL MUST be a formatted Google search result link as specified in the prompt.
          Do NOT provide direct links to specific recipe websites.
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

  // Define batches based on requested duration
  const batches: number[][] = [];
  const batchSize = numWeeks <= 4 ? 1 : 2;
  for (let i = 1; i <= numWeeks; i += batchSize) {
    batches.push([i, Math.min(i + batchSize - 1, numWeeks)]);
  }

  for (const [start, end] of batches) {
    const batch = await fetchBatch(start, end);
    mealPlan.push(...batch);
    // Significant cooling delay between search-heavy batches
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  return { mealPlan: mealPlan.sort((a, b) => a.week - b.week) };
}

async function generateBatchGroceryList(
  userData: UserData,
  mealPlan: any[],
  startWeek: number,
  endWeek: number
): Promise<any[]> {
  const model = "gemini-flash-latest";
  
  // Extract specific meals for the requested context
  const relevantWeeks = mealPlan.filter(w => w.week >= startWeek && w.week <= endWeek);
  
  const prompt = `
    Generate a high-accuracy, exhaustive Grocery Checklist for Weeks ${startWeek}-${endWeek} of the "UNLCKD Pro Trainer" program.
    
    CONTEXT (Specific Meals planned for these weeks):
    ${JSON.stringify(relevantWeeks, null, 2)}
    
    CRITICAL ACCURACY PROTOCOL:
    1. WORD-BY-WORD AUDIT: You MUST scan every single meal title in the provided context (e.g., "Greek Yogurt with Mixed Berries and Sliced Almonds"). Extract EVERY noun. In this example, "Greek Yogurt", "Mixed Berries", and "Almonds" MUST appear on the list.
    2. ZERO-MISS POLICY: Every single ingredient required to cook 100% of the meals listed in the context above MUST be included. If a meal says "Egg White Omelet with Spinach and Feta", the list MUST contain: Egg Whites, Spinach, and Feta Cheese. No exceptions.
    3. RAW INGREDIENT MAPPING: Break down every meal into its base components. For example, "Healthy Blueberry Oatmeal with Flaxseeds" must result in: Blueberries, Oats/Oatmeal, and Flaxseeds.
    4. QUANTITY CALCULATIONS: Calculate total quantities for the entire 2-week period based on serving sizes and frequencies. Sum up repeating items (e.g., if chicken is used in 4 meals across the weeks, provide the TOTAL weight needed).
    5. PRECISE MEASUREMENTS: Use ${userData.weightUnit === 'lbs' ? 'US Imperial (oz, lbs, cups, tsp, tbsp)' : 'Metric (g, kg, ml, l)'} for every item.
    6. GROUPED BY CATEGORY: Use strict categories: "Protein (Meat/Fish/Eggs)", "Produce (Vegetables & Fruits)", "Dairy & Cheese", "Grains, Nuts & Seeds", "Fats, Oils & Spices", "Pantry Staples".
    7. NO SUMMARIES: Do not skip items by grouping them as "assorted veggies". List each specific vegetable mentioned in the meal plan (e.g., "Kale, Spinach, Bell Peppers").
    8. HIDDEN INGREDIENTS: If a meal name implies a sauce (e.g., "Taco Bowls"), include the necessary spices (Cumin, Chili Powder) or toppings (Salsa, Lime).
    
    JSON STRUCTURE:
    Return an array of objects for the "groceryList" field:
    { "phase": "Weeks ${startWeek}-${endWeek}", "category": "Protein|Produce|Dairy|Grains|Staples", "items": "Exhaustive list of items with quantities" }
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: "Expert Nutritionist. Exhaustive ingredient indexing. Return valid JSON only.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
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
        },
        required: ["groceryList"],
      },
    },
  }));

  const data = safeParseJson(response.text || "{}");
  return data.groceryList || [];
}

export async function generateTransformationReport(
  userData: UserData,
  photos: Photos | ProgressPhotos,
  path: string,
  isResubmit: boolean = false,
  invalidLinksContext?: string
): Promise<AssessmentResult> {
  // Truncate goals if extremely long
  const cleanUserData = {
    ...userData,
    goals: userData.goals?.length > 1000 ? userData.goals.substring(0, 1000) + '...' : userData.goals
  };

  try {
    let result: Partial<AssessmentResult> = {};

    // 1. GENERATE ASSESSMENT PIECES
    if (['full', 'assessment', 'progress', 'workout'].includes(path)) {
      try {
        if (['full', 'assessment', 'progress'].includes(path)) {
          console.log("Generating physique analysis...");
          const physique = await generatePhysiqueAnalysis(cleanUserData, photos, path, isResubmit);
          result = { ...result, ...physique };
        }
        console.log("Generating health and support...");
        const lifestyle = await generateHealthAndSupport(cleanUserData, isResubmit, path, result);
        result = { ...result, ...lifestyle };
      } catch (e) {
        console.error("Analysis step failed:", e);
        throw new Error(`Analysis failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // 2. GENERATE WORKOUT PLAN
    if (['full', 'workout'].includes(path)) {
      try {
        const numWeeks = getPlanDurationWeeks(cleanUserData.planDuration);
        console.log(`Generating ${numWeeks}-week workout plan...`);
        // Cooldown after previous search-heavy steps
        await new Promise(resolve => setTimeout(resolve, 5000));
        const workout = await generateWorkoutPlan(cleanUserData, isResubmit, 'pro', invalidLinksContext);
        result = { ...result, ...workout };
      } catch (e) {
        console.error("Workout generation failed:", e);
        throw new Error(`Workout plan generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // 3. GENERATE MEAL PLAN
    if (['full', 'meal'].includes(path)) {
      try {
        const numWeeks = getPlanDurationWeeks(cleanUserData.planDuration);
        console.log(`Generating ${numWeeks}-week meal plan...`);
        // Cooldown after previous search-heavy steps
        await new Promise(resolve => setTimeout(resolve, 5000));
        const mealResult = await generateMealPlan(cleanUserData, isResubmit, 'pro', invalidLinksContext);
        result = { ...result, ...mealResult };
        
        // 4. GENERATE BATCHED GROCERY LISTS (Post-meal plan)
        if (mealResult.mealPlan && mealResult.mealPlan.length > 0) {
          console.log("Generating high-accuracy batched grocery lists...");
          
          // Define grocery batches based on duration (2-week batches)
          const groceryBatches: number[][] = [];
          for (let i = 1; i <= numWeeks; i += 2) {
            groceryBatches.push([i, Math.min(i + 1, numWeeks)]);
          }

          const allGroceries: any[] = [];
          
          for (const [start, end] of groceryBatches) {
            console.log(`Generating groceries for weeks ${start}-${end}...`);
            const batch = await generateBatchGroceryList(cleanUserData, mealResult.mealPlan, start, end);
            allGroceries.push(...batch);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Small delay between grocery batches
          }
          result.groceryList = allGroceries;
        }
      } catch (e) {
        console.error("Meal generation failed:", e);
        throw new Error(`Meal plan generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // Final Validation & Cleanup
    const finalResult = result as AssessmentResult;
    
    // Add report type metadata matching menu selection
    (finalResult as any).reportType = path === 'assessment' ? 'Physique Assessment' : 
                                    path === 'workout' ? 'workout' :
                                    path === 'meal' ? 'Meal Plan' :
                                    path === 'progress' ? 'progress report' : 'full transformation report';
    
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
    finalResult.recoverySchedule = (path === 'full' || path === 'workout') ? (finalResult.recoverySchedule || []) : [];
    finalResult.waterSchedule = finalResult.waterSchedule || [];
    finalResult.supplementRecommendations = finalResult.supplementRecommendations || [];
    
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
    const numWeeksExpected = getPlanDurationWeeks(cleanUserData.planDuration);

    if (['full', 'workout'].includes(path)) {
      checks.push({
        name: `${numWeeksExpected}-Week Workout Plan`,
        pass: (finalResult.workoutPlan?.length || 0) >= numWeeksExpected,
        error: `Workout plan incomplete (${finalResult.workoutPlan?.length || 0}/${numWeeksExpected} weeks).`
      });
    }
    if (['full', 'meal'].includes(path)) {
      checks.push({
        name: `${numWeeksExpected}-Week Meal Plan`,
        pass: (finalResult.mealPlan?.length || 0) >= numWeeksExpected,
        error: `Meal plan incomplete (${finalResult.mealPlan?.length || 0}/${numWeeksExpected} weeks).`
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

export async function generateRecoveryGuidance(
  userData: UserData,
  existingWorkoutPlan?: any[]
): Promise<Array<{
  day: string;
  focus: string;
  modalities?: string[];
  duration?: string;
  notes?: string;
}>> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a 7-day targeted recovery schedule complementing this user's training program.
      User Data:
      Name: ${userData.name || 'User'}
      Goals: ${userData.goals || 'General Fitness & Hypertrophy'}
      Gym Access: ${userData.gymAccess || 'Full Gym'}
      Injuries: ${userData.injuries || 'None'}
      Workout Split Context: ${existingWorkoutPlan ? JSON.stringify(existingWorkoutPlan.slice(0, 1)) : '7-day Split'}
      
      For each day (Monday through Sunday), specify:
      - day: e.g. "Monday"
      - focus: e.g. "Lower Body & Spinal Decompression"
      - modalities: Array of 2-3 specific targeted modalities (e.g. ["Infrared Sauna (20 mins @ 170°F)", "NormaTec Compression Boots (25 mins Lvl 6)"])
      - duration: e.g. "30-45 mins total"
      - notes: Brief physiological rationale for why this recovery protocol benefits their workout split.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING },
              focus: { type: Type.STRING },
              modalities: { type: Type.ARRAY, items: { type: Type.STRING } },
              duration: { type: Type.STRING },
              notes: { type: Type.STRING },
            },
            required: ["day", "focus"],
          },
        },
      },
    });

    if (response.text) {
      const parsed = safeParseJson(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("AI generation for recovery guidance failed, using split-tailored fallback:", err);
  }

  // Fallback to high-quality 7-day recovery schedule based on workout plan or default split
  return [
    {
      day: 'Monday',
      focus: 'Lower Body & Connective Tissue Hydration',
      modalities: ['NormaTec Compression Boots (25 mins @ Level 6)', 'Moist Heat Steam Room (15 mins @ 112°F)', 'Percussive Foam Rolling (10 mins)'],
      duration: '40 mins total',
      notes: 'Propels lymphatic fluid to reduce lower body DOMS and hydrates knee/hip joint capsules.'
    },
    {
      day: 'Tuesday',
      focus: 'Upper Body Push & Thoracic Decompression',
      modalities: ['Infrared Sauna (20 mins @ 170°F)', 'Theragun Percussive Therapy (10 mins)', 'Passive Bar Hanging (5 mins)'],
      duration: '35 mins total',
      notes: 'Triggers heat shock proteins, surges growth hormone release, and relieves thoracic spine compression.'
    },
    {
      day: 'Wednesday',
      focus: 'Active Recovery & Central Nervous System Reset',
      modalities: ['Deep Tissue / Sports Massage (45 mins)', 'Contrast Plunge (3 Cycles: 12m Hot / 2m Cold)', 'Light Mobility Flow (15 mins)'],
      duration: '60 mins total',
      notes: 'Breaks down fascial adhesions, flushes metabolic waste, and resets nervous system tone.'
    },
    {
      day: 'Thursday',
      focus: 'Posterior Chain & Spinal Inflammation Flush',
      modalities: ['Contrast Sauna & Cold Plunge (20 mins)', 'Lat & Rhomboid Percussive Release (10 mins)'],
      duration: '30 mins total',
      notes: 'Rapid vascular pumping effect flushes lumbar spinal inflammation and mitigates erector spinae tightness.'
    },
    {
      day: 'Friday',
      focus: 'Hypertrophy & Systemic Vasodilation',
      modalities: ['Infrared Sauna (20 mins @ 170°F)', 'Moist Steam Room (15 mins @ 110°F)'],
      duration: '35 mins total',
      notes: 'Increases vascular capillary density and deep tissue oxygenation going into the weekend.'
    },
    {
      day: 'Saturday',
      focus: 'Conditioning Recovery & Metabolic Flush',
      modalities: ['Cold Plunge / Ice Bath (3-5 mins @ 48°F)', 'Epsom Salt Magnesium Bath (20 mins)'],
      duration: '25 mins total',
      notes: 'Promotes rapid anti-inflammatory vasoconstriction and muscular relaxation.'
    },
    {
      day: 'Sunday',
      focus: 'Complete System Preparation & Rest',
      modalities: ['Full Body Foam Rolling (20 mins)', 'Infrared Sauna (25 mins @ 165°F)', 'Hydration Protocol (3L Water)'],
      duration: '45 mins total',
      notes: 'Prepares muscles, joints, and central nervous system for peak output in the upcoming week.'
    }
  ];
}
