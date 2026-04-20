/**
 * Custom Error Classes for Content URL System
 */

/**
 * Error thrown when a content item is missing a slug during URL generation
 */
export class MissingSlugError extends Error {
  contentId: number | string
  contentType: string
  
  constructor(contentId: number | string, contentType: string) {
    super(`Content item (${contentType}:${contentId}) is missing a slug`)
    this.name = 'MissingSlugError'
    this.contentId = contentId
    this.contentType = contentType
  }
}

/**
 * Error thrown when content cannot be found
 */
export class ContentNotFoundError extends Error {
  slug?: string
  contentId?: number | string
  contentType: string
  
  constructor(contentType: string, identifier: string | number) {
    const idType = typeof identifier === 'number' ? 'ID' : 'slug'
    super(`Content not found: ${contentType} with ${idType} "${identifier}"`)
    this.name = 'ContentNotFoundError'
    this.contentType = contentType
    
    if (typeof identifier === 'number') {
      this.contentId = identifier
    } else {
      this.slug = identifier
    }
  }
}

/**
 * Error thrown when a slug has an invalid format
 */
export class InvalidSlugFormatError extends Error {
  slug: string
  
  constructor(slug: string, reason?: string) {
    super(`Invalid slug format: "${slug}"${reason ? ` - ${reason}` : ''}`)
    this.name = 'InvalidSlugFormatError'
    this.slug = slug
  }
}
