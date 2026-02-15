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
