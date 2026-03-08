
import { exec } from 'child_process'
import cron from 'node-cron'

console.log('🚀 Starting Cinema Online Scheduler...')

// Run Trending & Ramadan Import every 12 hours
// At 00:00 and 12:00
cron.schedule('0 0,12 * * *', () => {
  console.log('⏰ Running Scheduled Task: Trending Import')
  exec('node backend/trending_importer.js', (error, stdout, stderr) => {
    if (error) console.error(`exec error: ${error}`)
    console.log(`stdout: ${stdout}`)
    console.error(`stderr: ${stderr}`)
  })
})

// Run YouTube Import every 24 hours (at 04:00 AM)
cron.schedule('0 4 * * *', () => {
  console.log('⏰ Running Scheduled Task: YouTube Import')
  exec('node backend/youtube_importer.js', (error, stdout, stderr) => {
    if (error) console.error(`exec error: ${error}`)
    console.log(`stdout: ${stdout}`)
    console.error(`stderr: ${stderr}`)
  })
})

console.log('✅ Scheduler is active. Waiting for tasks...')
