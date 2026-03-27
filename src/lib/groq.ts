// lib/groq.ts - Groq AI Client
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export default groq
