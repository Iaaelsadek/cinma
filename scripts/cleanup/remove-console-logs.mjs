// scripts/cleanup/remove-console-logs.mjs
// Script to remove all console.log statements from server files

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const filesToClean = [
  'server/api/chat.js',
  'server/lib/db.js',
  'server/index.js',
  'src/lib/cockroachdb.ts'
]

let totalRemoved = 0

filesToClean.forEach(filePath => {
  const fullPath = path.join(__dirname, '../..', filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`)
    return
  }
  
  let content = fs.readFileSync(fullPath, 'utf8')
  const originalLines = content.split('\n').length
  
  // Count console.logs before removal
  const consoleLogMatches = content.match(/console\.log\([^)]*\)/g) || []
  const count = consoleLogMatches.length
  
  if (count === 0) {
    console.log(`✅ ${filePath} - No console.logs found`)
    return
  }
  
  // Remove console.log statements (including multi-line)
  // Pattern 1: Single line console.log
  content = content.replace(/\s*console\.log\([^)]*\)\s*\n?/g, '\n')
  
  // Pattern 2: Multi-line console.log
  content = content.replace(/\s*console\.log\(\s*[\s\S]*?\)\s*\n?/g, '\n')
  
  // Remove empty lines (more than 2 consecutive)
  content = content.replace(/\n{3,}/g, '\n\n')
  
  // Write back
  fs.writeFileSync(fullPath, content, 'utf8')
  
  const newLines = content.split('\n').length
  const linesRemoved = originalLines - newLines
  
  console.log(`✅ ${filePath}`)
  console.log(`   - Removed ${count} console.log statements`)
  console.log(`   - Removed ${linesRemoved} lines`)
  
  totalRemoved += count
})

console.log(`\n🎉 Total console.logs removed: ${totalRemoved}`)
console.log(`\n⚠️  Note: Review the files to ensure no important logs were removed`)
console.log(`   Consider using the logger system instead for important logs`)
