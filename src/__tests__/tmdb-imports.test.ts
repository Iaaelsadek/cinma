/**
 * Unit Test - Verify No TMDB Imports
 * 
 * This test ensures that deprecated TMDB functions are not imported
 * anywhere in the codebase after the migration to CockroachDB API.
 * 
 * Tests:
 * - No imports of tmdbAPI.search
 * - No imports of tmdbAPI.getDetails
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Helper function to recursively get all TypeScript/JavaScript files
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = readdirSync(dirPath)

  files.forEach((file) => {
    const filePath = join(dirPath, file)
    
    // Skip node_modules, dist, build, and test directories
    if (
      file === 'node_modules' || 
      file === 'dist' || 
      file === 'build' ||
      file === '.git' ||
      file === 'coverage' ||
      file === '__tests__'
    ) {
      return
    }

    if (statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles)
    } else if (
      file.endsWith('.ts') || 
      file.endsWith('.tsx') || 
      file.endsWith('.js') || 
      file.endsWith('.jsx')
    ) {
      arrayOfFiles.push(filePath)
    }
  })

  return arrayOfFiles
}

// Helper function to check if file contains forbidden imports
function checkFileForForbiddenImports(filePath: string): {
  hasSearchImport: boolean
  hasGetDetailsImport: boolean
  lines: { search: number[]; getDetails: number[] }
} {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  const searchLines: number[] = []
  const getDetailsLines: number[] = []
  
  lines.forEach((line, index) => {
    // Check for tmdbAPI.search usage
    if (line.includes('tmdbAPI.search') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      searchLines.push(index + 1)
    }
    
    // Check for tmdbAPI.getDetails usage
    if (line.includes('tmdbAPI.getDetails') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      getDetailsLines.push(index + 1)
    }
  })
  
  return {
    hasSearchImport: searchLines.length > 0,
    hasGetDetailsImport: getDetailsLines.length > 0,
    lines: {
      search: searchLines,
      getDetails: getDetailsLines
    }
  }
}

describe('TMDB Imports Verification', () => {
  const srcDir = join(process.cwd(), 'src')
  const allFiles = getAllFiles(srcDir)
  
  it('should not have any tmdbAPI.search imports in the codebase', () => {
    const filesWithSearchImport: Array<{ file: string; lines: number[] }> = []
    
    allFiles.forEach((file) => {
      const result = checkFileForForbiddenImports(file)
      if (result.hasSearchImport) {
        filesWithSearchImport.push({
          file: file.replace(process.cwd(), ''),
          lines: result.lines.search
        })
      }
    })
    
    if (filesWithSearchImport.length > 0) {
      const errorMessage = filesWithSearchImport
        .map(({ file, lines }) => `  - ${file} (lines: ${lines.join(', ')})`)
        .join('\n')
      
      expect.fail(
        `Found tmdbAPI.search imports in ${filesWithSearchImport.length} file(s):\n${errorMessage}\n\n` +
        'These should be replaced with CockroachDB API calls.'
      )
    }
    
    expect(filesWithSearchImport).toHaveLength(0)
  })
  
  it('should not have any tmdbAPI.getDetails imports in the codebase', () => {
    const filesWithGetDetailsImport: Array<{ file: string; lines: number[] }> = []
    
    allFiles.forEach((file) => {
      const result = checkFileForForbiddenImports(file)
      if (result.hasGetDetailsImport) {
        filesWithGetDetailsImport.push({
          file: file.replace(process.cwd(), ''),
          lines: result.lines.getDetails
        })
      }
    })
    
    if (filesWithGetDetailsImport.length > 0) {
      const errorMessage = filesWithGetDetailsImport
        .map(({ file, lines }) => `  - ${file} (lines: ${lines.join(', ')})`)
        .join('\n')
      
      expect.fail(
        `Found tmdbAPI.getDetails imports in ${filesWithGetDetailsImport.length} file(s):\n${errorMessage}\n\n` +
        'These should be replaced with CockroachDB API calls.'
      )
    }
    
    expect(filesWithGetDetailsImport).toHaveLength(0)
  })
  
  it('should have scanned at least 50 files', () => {
    // Sanity check to ensure the test is actually scanning files
    expect(allFiles.length).toBeGreaterThan(50)
  })
  
  it('should include key directories in scan', () => {
    const hasPages = allFiles.some(f => f.includes('\\pages\\') || f.includes('/pages/'))
    const hasComponents = allFiles.some(f => f.includes('\\components\\') || f.includes('/components/'))
    const hasLib = allFiles.some(f => f.includes('\\lib\\') || f.includes('/lib/'))
    
    expect(hasPages).toBe(true)
    expect(hasComponents).toBe(true)
    expect(hasLib).toBe(true)
  })
})
