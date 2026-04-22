// server/api/groq-summary.js - AI Summary Generation (Mistral open-mistral-nemo)
// Benchmark: 1,521ms avg, 205 tokens/sec - Best for Arabic summaries

/**
 * Generate Arabic summary using Mistral AI (open-mistral-nemo)
 * POST /api/groq-summary
 * Body: { title: string, overview: string }
 */
export default async function groqSummaryHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { title, overview } = req.body

  if (!title || !overview) {
    return res.status(400).json({ error: 'Missing title or overview' })
  }

  if (!process.env.MISTRAL_API_KEY) {
    console.warn('[Mistral] API key not configured')
    return res.status(200).json({ summary: overview })
  }

  try {
    const prompt = `أنت خبير في كتابة ملخصات الأفلام والمسلسلات بالعربية.

العنوان: ${title}
الوصف الأصلي: ${overview}

المطلوب: اكتب ملخص جذاب ومشوق بالعربية الفصحى (150-200 كلمة) يشرح القصة بشكل مثير دون حرق الأحداث المهمة.

الملخص بالعربية:`

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'open-mistral-nemo', // Benchmark winner: 1.5s, excellent Arabic
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`)
    }

    const data = await response.json()
    const summary = data.choices[0]?.message?.content?.trim() || overview

    return res.status(200).json({ summary })
  } catch (error) {
    console.error('[Mistral] Summary generation failed:', error.message)
    return res.status(200).json({ summary: overview })
  }
}
