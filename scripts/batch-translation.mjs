import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const BATCH_SIZE = 10;
const DELAY_MS = 2000;

async function translateBatch(items) {
  const prompt = `Translate the following movie overviews to engaging, natural Arabic. Return ONLY a valid JSON array of strings in the exact same order. Do not include markdown code blocks or any other text.
Items:
${JSON.stringify(items.map(i => ({ title: i.title, overview: i.overview })))}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 }
    })
  });

  if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse Gemini response:', text);
    throw e;
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is missing!');
    process.exit(1);
  }

  console.log('Starting Translation Worker...');
  try {
    // Find movies without Arabic characters in overview
    const res = await pool.query(`
      SELECT id, title, overview 
      FROM movies 
      WHERE overview IS NOT NULL 
        AND overview != '' 
        AND overview !~ '[\u0600-\u06FF]'
      LIMIT 1000
    `);

    const movies = res.rows;
    console.log(`Found ${movies.length} movies to translate.`);

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i/BATCH_SIZE + 1} (${batch.length} movies)...`);
      
      try {
        const translations = await translateBatch(batch);
        
        if (translations.length !== batch.length) {
          console.error(`Length mismatch: expected ${batch.length}, got ${translations.length}. Skipping batch.`);
          continue;
        }

        // Update database
        for (let j = 0; j < batch.length; j++) {
          const translated = translations[j];
          if (translated && translated.length > 5) {
            await pool.query('UPDATE movies SET overview = $1 WHERE id = $2', [translated, batch[j].id]);
          }
        }
        
        console.log(`Batch ${i/BATCH_SIZE + 1} updated successfully.`);
      } catch (err) {
        console.error(`Error processing batch: ${err.message}`);
      }
      
      await sleep(DELAY_MS);
    }
    
    console.log('Translation Worker finished.');
  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    await pool.end();
  }
}

run();
