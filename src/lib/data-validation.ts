/**
 * 🔍 Data Validation Utilities - فور سيما
 * Data Validation & Integrity Checks
 * 
 * @description Validates content data integrity and logs violations
 * @author 4Cima Team
 * @version 1.0.0
 */

import type { Movie, TVSeries } from '../types/database';

// ==========================================
// Types
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  type: 'language_mismatch' | 'duplicate_id' | 'missing_field' | 'invalid_data';
  message: string;
  itemId?: number | string;
  field?: string;
}

export interface ContentItem {
  id?: number;
  slug?: string;
  language?: string;
  original_language?: string;
  title?: string;
  name?: string;
  [key: string]: unknown;
}

// ==========================================
// Validation Functions
// ==========================================

/**
 * Validate content integrity - checks if language matches subsection requirements
 * @param items Content items to validate
 * @param expectedLanguage Expected language code (e.g., 'ar', 'ko', 'tr')
 * @param subsectionName Subsection name for error logging
 */
export function validateContentIntegrity(
  items: ContentItem[],
  expectedLanguage?: string,
  subsectionName?: string
): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!expectedLanguage) {
    return { isValid: true, errors: [] };
  }
  
  // Handle language exclusion (e.g., '!ar' means no Arabic content)
  const isExclusion = expectedLanguage.startsWith('!');
  const languageCode = isExclusion ? expectedLanguage.slice(1) : expectedLanguage;
  
  for (const item of items) {
    const itemLanguage = item.language || item.original_language;
    
    if (!itemLanguage) {
      errors.push({
        type: 'missing_field',
        message: `Item missing language field in ${subsectionName || 'subsection'}`,
        itemId: item.id || item.slug,
        field: 'language'
      });
      continue;
    }
    
    // Check language match/exclusion
    if (isExclusion) {
      if (itemLanguage === languageCode) {
        errors.push({
          type: 'language_mismatch',
          message: `Item has excluded language ${languageCode} in ${subsectionName || 'subsection'}`,
          itemId: item.id || item.slug,
          field: 'language'
        });
      }
    } else {
      if (itemLanguage !== languageCode) {
        errors.push({
          type: 'language_mismatch',
          message: `Item has language ${itemLanguage} but expected ${languageCode} in ${subsectionName || 'subsection'}`,
          itemId: item.id || item.slug,
          field: 'language'
        });
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate no duplicate IDs in content array
 * @param items Content items to validate
 */
export function validateNoDuplicates(items: ContentItem[]): ValidationResult {
  const errors: ValidationError[] = [];
  const seenIds = new Set<string>();
  
  for (const item of items) {
    const key = item.id ? `id:${item.id}` : item.slug ? `slug:${item.slug}` : null;
    
    if (!key) {
      errors.push({
        type: 'missing_field',
        message: 'Item missing both id and slug',
        field: 'id/slug'
      });
      continue;
    }
    
    if (seenIds.has(key)) {
      errors.push({
        type: 'duplicate_id',
        message: `Duplicate item found: ${key}`,
        itemId: item.id || item.slug
      });
    } else {
      seenIds.add(key);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate required fields are present
 * @param items Content items to validate
 * @param requiredFields Array of required field names
 */
export function validateRequiredFields(
  items: ContentItem[],
  requiredFields: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  
  for (const item of items) {
    for (const field of requiredFields) {
      if (!(field in item) || item[field] === null || item[field] === undefined) {
        errors.push({
          type: 'missing_field',
          message: `Item missing required field: ${field}`,
          itemId: item.id || item.slug,
          field
        });
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Log data integrity violations to console (can be extended to external logging service)
 * @param errors Array of validation errors
 * @param context Additional context for logging
 */
export function logDataIntegrityViolations(
  errors: ValidationError[],
  context?: {
    contentType?: string;
    subsection?: string;
    timestamp?: string;
  }
): void {
  if (errors.length === 0) return;
  
  const timestamp = context?.timestamp || new Date().toISOString();
  const contextStr = context ? ` [${context.contentType}/${context.subsection}]` : '';
  
  console.error(`[DATA INTEGRITY VIOLATION]${contextStr} ${timestamp}`);
  console.error(`Found ${errors.length} validation error(s):`);
  
  for (const error of errors) {
    console.error(`  - ${error.type}: ${error.message}`, {
      itemId: error.itemId,
      field: error.field
    });
  }
  
  // TODO: Send to external error logging service (e.g., Sentry, LogRocket)
  // Example: Sentry.captureException(new Error('Data Integrity Violation'), { extra: { errors, context } });
}

/**
 * Comprehensive validation - runs all validation checks
 * @param items Content items to validate
 * @param options Validation options
 */
export function validateContent(
  items: ContentItem[],
  options: {
    expectedLanguage?: string;
    subsectionName?: string;
    requiredFields?: string[];
  } = {}
): ValidationResult {
  const allErrors: ValidationError[] = [];
  
  // Check for duplicates
  const duplicateResult = validateNoDuplicates(items);
  allErrors.push(...duplicateResult.errors);
  
  // Check language integrity
  if (options.expectedLanguage) {
    const languageResult = validateContentIntegrity(
      items,
      options.expectedLanguage,
      options.subsectionName
    );
    allErrors.push(...languageResult.errors);
  }
  
  // Check required fields
  if (options.requiredFields && options.requiredFields.length > 0) {
    const fieldsResult = validateRequiredFields(items, options.requiredFields);
    allErrors.push(...fieldsResult.errors);
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Filter out invalid content items based on validation
 * @param items Content items to filter
 * @param validationResult Validation result
 */
export function filterInvalidContent<T extends ContentItem>(
  items: T[],
  validationResult: ValidationResult
): T[] {
  if (validationResult.isValid) {
    return items;
  }
  
  // Get IDs of invalid items
  const invalidIds = new Set(
    validationResult.errors
      .filter(e => e.itemId)
      .map(e => e.itemId)
  );
  
  // Filter out invalid items
  return items.filter(item => {
    const key = item.id || item.slug;
    return !invalidIds.has(key);
  });
}

export default {
  validateContentIntegrity,
  validateNoDuplicates,
  validateRequiredFields,
  validateContent,
  logDataIntegrityViolations,
  filterInvalidContent
};
