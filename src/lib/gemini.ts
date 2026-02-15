export async function generateArabicSummary(title: string, overview: string) {
  const res = await fetch('/api/gemini-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, overview })
  })
  if (!res.ok) throw new Error('gemini_error')
  const data = await res.json()
  return String(data?.summary || '').trim()
}
