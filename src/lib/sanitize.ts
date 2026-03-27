// ✅ Input Sanitization Helper using DOMPurify
import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  })
}

/**
 * Sanitize plain text (remove HTML tags completely)
 */
export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  const cleaned = url.trim()
  
  // Block dangerous protocols
  if (/^(javascript|data|vbscript):/i.test(cleaned)) {
    return ''
  }
  
  return cleaned
}

/**
 * Sanitize user input for database queries
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .slice(0, 1000) // Limit length
}
