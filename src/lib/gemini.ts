import { GoogleGenerativeAI } from "@google/generative-ai";

// Use Vite environment variable
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

/**
 * Uses Gemini to correct spelling, fix keyboard layout issues, and extract search intent.
 * @param query The raw search query from the user.
 * @returns The cleaned and corrected search term.
 */
export const correctSearchTerm = async (query: string): Promise<string> => {
  if (!genAI || !query || query.trim().length < 3) return query;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
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
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();
    
    // Safety check: if response is too long or empty, fallback to original
    if (text.length > 50 || text.length === 0 || text.includes('\n')) {
      return query;
    }
    
    return text;
  } catch (error) {
    console.warn("Gemini search correction failed, using original query:", error);
    return query;
  }
};

/**
 * Uses Gemini to generate a short Arabic summary for a movie/show.
 * @param title Title of the content.
 * @param originalOverview The original overview (English or Arabic).
 * @returns A concise Arabic summary.
 */
export const generateArabicSummary = async (title: string, originalOverview?: string): Promise<string> => {
  if (!genAI || !title) return originalOverview || "لا يوجد وصف متاح";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
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
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();
    
    if (text.length === 0) return originalOverview || "";
    return text;
  } catch (error) {
    console.warn("Gemini summary generation failed:", error);
    return originalOverview || "";
  }
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

  // 1. Check LocalStorage Cache
  const cacheKey = `ar_title_cache_${title.toLowerCase().trim()}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return cached;
  }

  let finalTranslation = title;

  // 2. Try Gemini if configured
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
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
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text().trim();
      
      if (text.length > 0 && text.length < 100) {
        finalTranslation = text;
      }
    } catch (error) {
      console.warn("Gemini title translation failed:", error);
    }
  }

  // 3. Fallback: MyMemory Translation API (Free, generally CORS-friendly)
  // Only use if Gemini failed or wasn't available AND we haven't found a translation yet (or it's same as original)
  if (finalTranslation === title) {
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(title)}&langpair=en|ar`);
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) {
          // Filter out errors or non-translation responses
          const translated = data.responseData.translatedText;
          if (!translated.includes('MYMEMORY') && !translated.includes('QUERY LENGTH LIMIT')) {
              finalTranslation = translated;
          }
      }
    } catch (e) {
      console.warn("MyMemory translation fallback failed:", e);
    }
  }

  // 4. Save to Cache (even if it failed and returned original, to avoid retrying immediately, 
  // but preferably we only cache if it looks like Arabic)
  const isArabic = /[\u0600-\u06FF]/.test(finalTranslation);
  if (isArabic && finalTranslation !== title) {
    localStorage.setItem(cacheKey, finalTranslation);
  }

  return finalTranslation;
};

