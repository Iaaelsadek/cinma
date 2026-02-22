import { GoogleGenerativeAI } from "@google/generative-ai";
import { errorLogger } from '../services/errorLogging';
import { supabase } from './supabase';
import { CONFIG } from './constants';

// Use Vite environment variable
const API_KEY = CONFIG.GEMINI_API_KEY || "";

let genAI: GoogleGenerativeAI | null = null;
let isGeminiDisabled = false; // Disable Gemini globally if models are missing

if (API_KEY) {
    // Suppress console spam from the SDK itself if possible, or just catch errors gracefully
    // Using apiVersion: 'v1beta' is default, but maybe we need to specify it or leave it?
    // Some regions might need specific base url, but usually default is fine.
    genAI = new GoogleGenerativeAI(API_KEY);
  } else {
    console.warn('[Gemini] API Key missing. AI features will be disabled.');
    isGeminiDisabled = true;
  }

/**
 * Helper function to call Gemini API with Fallback Mechanism.
 * Tries the primary model (gemini-3.1-pro), then falls back to gemini-1.5-flash if needed.
 */
const callGeminiWithFallback = async (prompt: string, contextLabel: string): Promise<string | null> => {
  if (!genAI || isGeminiDisabled) return null;

  // Try list of models in order. 
  // We prioritize gemini-1.5-flash-001 for stability.
  const models = ["gemini-1.5-flash-001", "gemini-1.5-pro-001", "gemini-pro"];
  
  for (const modelName of models) {
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const response = result.response;
        return response.text().trim();
    } catch (error: any) {
        const errorStr = String(error);
        
        // Log warning
        console.warn(`[Gemini - ${contextLabel}] Model ${modelName} failed: ${errorStr}`);

        // Continue only if it's a 404 (Model Not Found) or 503 (Overloaded)
        if (errorStr.includes("404") || errorStr.includes("not found") || errorStr.includes("503")) {
            continue;
        }
        
        // If it's a permission/quota error, we might as well stop trying other models if they share quota
        if (errorStr.includes("API_KEY_INVALID") || errorStr.includes("400")) {
             console.error(`[Gemini - ${contextLabel}] Fatal API Error: ${errorStr}`);
             isGeminiDisabled = true;
             break;
        }
    }
  }

  // If all failed
  console.warn(`[Gemini - ${contextLabel}] All models failed. Disabling Gemini for this session.`);
  isGeminiDisabled = true;
  return null;
};

// Module-level flag to prevent parallel requests from spamming during rate limit
let isMyMemoryRateLimited = false;

/**
 * Uses Gemini to correct spelling, fix keyboard layout issues, and extract search intent.
 * @param query The raw search query from the user.
 * @returns The cleaned and corrected search term.
 */
export const correctSearchTerm = async (query: string): Promise<string> => {
  if (!genAI || !query || query.trim().length < 3) return query;

  const prompt = `
    You are a search query corrector for an Arabic/English movie database.
    Input: "${query}"
    
    Tasks:
    1. Correct spelling (e.g., "spidrman" -> "spiderman").
    2. Fix keyboard layout errors (e.g., "fhjlhk" -> "batman" if it matches a qwerty/arabic pattern, otherwise ignore).
    3. Extract core intent (e.g., "action movies by the rock" -> "The Rock").
    4. If the input is already correct or simple, return it as is.
    5. Return ONLY the corrected search term string. Do not add quotes or explanations.
    `;

  const text = await callGeminiWithFallback(prompt, "search-correction");
  
  // Safety check: if response is too long or empty, fallback to original
  if (!text || text.length > 50 || text.length === 0 || text.includes('\n')) {
    return query;
  }
  
  return text;
};

/**
 * Uses Gemini to generate a short Arabic summary for a movie/show.
 * @param title Title of the content.
 * @param originalOverview The original overview (English or Arabic).
 * @returns A concise Arabic summary.
 */
export const generateArabicSummary = async (title: string, originalOverview?: string): Promise<string> => {
  if (!genAI || !title) return originalOverview || "لا يوجد وصف متاح";

  const prompt = `
    Summarize the plot of the movie/show "${title}" in Arabic.
    Context: ${originalOverview || "No overview provided, use general knowledge about this title."}
    
    Requirements:
    1. Language: Arabic (Modern Standard Arabic).
    2. Length: Concise (2-3 sentences max).
    3. Tone: Engaging and professional.
    4. Do not include spoilers.
    5. Return ONLY the Arabic summary text.
    `;
    
  const text = await callGeminiWithFallback(prompt, "arabic-summary");
  
  if (!text || text.length === 0) return originalOverview || "";
  return text;
};

/**
 * Uses Gemini to translate a movie title to Arabic.
 * Features:
 * - Smart caching (localStorage)
 * - Intelligent transliteration (e.g. "Spider-Man" -> "سبايدر مان")
 * - Fallbacks to free APIs if Gemini is unavailable.
 * 
 * @param title The English title.
 * @returns The Arabic title or the original if failed.
 */
export const translateTitleToArabic = async (title: string): Promise<string> => {
  if (!title) return '';

  // Early return if already Arabic
  if (/[\u0600-\u06FF]/.test(title)) return title;

  // Early return if too short or numeric
  if (title.length < 3 || /^\d+$/.test(title)) return title;

  // 1. Check LocalStorage Cache
  const cacheKey = `ar_title_cache_${title.toLowerCase().trim()}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return cached;
  }

  // 1.5. Check Supabase Translations Table (Permanent Cache)
  try {
    const { data } = await supabase
      .from('translations')
      .select('arabic_title')
      .eq('original_title', title)
      .maybeSingle();
      
    if (data && data.arabic_title) {
      localStorage.setItem(cacheKey, data.arabic_title);
      return data.arabic_title;
    }
  } catch (error) {
    // Silent fail if table doesn't exist or network error
  }

  let finalTranslation = title;

  // 2. Try Gemini if configured
  if (genAI && !isGeminiDisabled) {
    try {
      // Use fallback mechanism for title translation too
      const prompt = `
      You are an expert translator for movie and TV show titles for an Arab audience.
      Task: Translate "${title}" to Arabic.
      
      Guidelines:
      1. Use the **official commercial Arabic title** if it exists (e.g., "The Godfather" -> "العراب").
      2. If no official translation exists, use the **standard transliteration** widely used in the Middle East (e.g., "Joker" -> "جوكر", "Spider-Man" -> "سبايدر مان").
      3. **Do not** literally translate names that are brands/proper nouns unless that's the standard (e.g., don't translate "Batman" to "رجل الوطواط", use "باتمان").
      4. Keep numbers as numbers (e.g., "Iron Man 3" -> "ايرون مان 3").
      5. Return **ONLY** the Arabic string. No quotes, no extra text.
      `;
      
      const text = await callGeminiWithFallback(prompt, "title-translation");
      
      if (text && text.length > 0 && text.length < 100) {
        finalTranslation = text;
        localStorage.setItem(cacheKey, finalTranslation);
        
        // Save to Supabase (Async - Fire and Forget)
        supabase.from('translations').upsert({
          original_title: title,
          arabic_title: finalTranslation
        }).then(({ error }) => {
           if (error && error.code !== '42P01') { // Ignore if table missing
             console.warn('[Translation] Failed to save to DB:', error.message);
           }
        });
        
        return finalTranslation;
      }
    } catch (error) {
      // Silent fail for Gemini to try MyMemory
    }
  }

  // 3. Fallback: MyMemory Translation API (Free, generally CORS-friendly)
  // Only use if Gemini failed or wasn't available AND we haven't found a translation yet (or it's same as original)
  // Added Circuit Breaker for 429 errors
  const backoffKey = 'mymemory_backoff_until';
  const backoffUntil = localStorage.getItem(backoffKey);
  const isBackedOff = (backoffUntil && Date.now() < parseInt(backoffUntil)) || isMyMemoryRateLimited;

  if (finalTranslation === title && !isBackedOff) {
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(title)}&langpair=en|ar`);
      
      if (res.status === 429) {
        // Rate limit hit: Back off for 1 hour to prevent console spam
        if (!isMyMemoryRateLimited) {
            console.warn('[Translation] MyMemory rate limit reached. Pausing requests for 1 hour.');
            isMyMemoryRateLimited = true;
            localStorage.setItem(backoffKey, (Date.now() + 3600000).toString());
        }
      } else {
        const data = await res.json();
        if (data.responseData && data.responseData.translatedText) {
            // Filter out errors or non-translation responses
            const translated = data.responseData.translatedText;
            if (!translated.includes('MYMEMORY') && !translated.includes('QUERY LENGTH LIMIT')) {
                finalTranslation = translated;
          localStorage.setItem(cacheKey, finalTranslation);
          
          // Save MyMemory result to Supabase too
          supabase.from('translations').upsert({
             original_title: title,
             arabic_title: finalTranslation
          }).then(() => {});
        }
        }
      }
    } catch (e) {
      // Ignore network errors for translations to avoid spam
    }
  }

  return finalTranslation;
};

