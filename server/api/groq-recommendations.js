// server/api/groq-recommendations.js - AI Recommendations (Groq llama-3.3-70b)
// Benchmark: 283ms avg, 441 tokens/sec - FASTEST for recommendations

/**
 * Generate content recommendations using Groq AI
 * POST /api/groq-recommendations
 * Body: { genres: string[], history: string[] }
 */
export default async function groqRecommendationsHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { genres, history } = req.body

  if (!genres || !Array.isArray(genres) || genres.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid genres array' })
  }

  if (!process.env.GROQ_API_KEY) {
    console.warn('[Groq] API key not configured')
    return res.status(200).json({ titles: [] })
  }

  try {
    const historyContext = history && history.length > 0 
      ? `Recent viewing history: ${history.join(', ')}`
      : 'No recent history available'

    const prompt = `You are a cinematic recommendation expert for a user with these favorite genres: ${genres.join(', ')}.
${historyContext}

Task: Provide a list of 8 unique movie or TV show titles that this user would love.
Requirements:
1. Mix well-known hits with hidden gems.
2. Ensure they fit the genres and history provided.
3. Return ONLY the titles, one per line. No numbers, no extra text.
4. Use English titles only.

Titles:`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Benchmark winner: 283ms, ultra-fast
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 300
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices[0]?.message?.content?.trim() || ''
    
    const titles = text
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 8)

    return res.status(200).json({ titles })
  } catch (error) {
    console.error('[Groq] Recommendations generation failed:', error.message)
    return res.status(200).json({ titles: [] })
  }
}
