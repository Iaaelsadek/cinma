/**
 * SlugEngine Unit Tests
 * 
 * Tests the centralized slug generation engine with focus on:
 * - Arabic normalization (6-step pipeline)
 * - Transliteration accuracy
 * - Slugify correctness
 * - Year appending
 * - Attempt counter
 * - Fallback strategies
 */

import { describe, it, expect } from 'vitest';
import SlugEngine from '../SlugEngine.js';

describe('SlugEngine - Arabic Normalization', () => {
  it('should strip tashkeel (diacritics)', () => {
    const input = 'مَأْوَى';  // With harakat
    const expected = 'ماوي';  // Without harakat (ى normalized to ي)
    expect(SlugEngine.normalizeArabic(input)).toBe(expected);
  });

  it('should normalize hamza variants to ا', () => {
    expect(SlugEngine.normalizeArabic('أحمد')).toBe('احمد');
    expect(SlugEngine.normalizeArabic('إبراهيم')).toBe('ابراهيم');
    expect(SlugEngine.normalizeArabic('آمال')).toBe('امال');
    expect(SlugEngine.normalizeArabic('ٱلله')).toBe('الله');
  });

  it('should normalize taa marbuta to ه', () => {
    expect(SlugEngine.normalizeArabic('مدرسة')).toBe('مدرسه');
    expect(SlugEngine.normalizeArabic('قصة')).toBe('قصه');
  });

  it('should normalize alef maqsura to ي', () => {
    expect(SlugEngine.normalizeArabic('مستشفى')).toBe('مستشفي');
    expect(SlugEngine.normalizeArabic('موسى')).toBe('موسي');
  });

  it('should normalize waw with hamza to و', () => {
    expect(SlugEngine.normalizeArabic('مؤمن')).toBe('مومن');
    expect(SlugEngine.normalizeArabic('لؤلؤ')).toBe('لولو');
  });

  it('should normalize yaa with hamza to ي', () => {
    expect(SlugEngine.normalizeArabic('شاطئ')).toBe('شاطي');
    expect(SlugEngine.normalizeArabic('بيئة')).toBe('بييه');
  });

  it('should apply all 6 normalization steps in order', () => {
    // Complex example with multiple normalizations
    const input = 'مَأْوَى';  // Has tashkeel + hamza + alef maqsura
    const expected = 'ماوي';   // All normalized
    expect(SlugEngine.normalizeArabic(input)).toBe(expected);
  });
});

describe('SlugEngine - Slugify', () => {
  it('should convert to lowercase', () => {
    expect(SlugEngine.slugify('HELLO WORLD')).toBe('hello-world');
  });

  it('should replace spaces with hyphens', () => {
    expect(SlugEngine.slugify('hello world test')).toBe('hello-world-test');
  });

  it('should strip non-alphanumeric characters', () => {
    expect(SlugEngine.slugify('hello!@#$%world')).toBe('helloworld');
    expect(SlugEngine.slugify('test???')).toBe('test');
  });

  it('should collapse multiple hyphens', () => {
    expect(SlugEngine.slugify('hello---world')).toBe('hello-world');
    expect(SlugEngine.slugify('test  -  -  test')).toBe('test-test');
  });

  it('should trim leading and trailing hyphens', () => {
    expect(SlugEngine.slugify('---hello---')).toBe('hello');
    expect(SlugEngine.slugify('-test-')).toBe('test');
  });

  it('should handle mixed alphanumeric', () => {
    expect(SlugEngine.slugify('2001: A Space Odyssey')).toBe('2001-a-space-odyssey');
  });

  it('should return empty string for invalid input', () => {
    expect(SlugEngine.slugify('')).toBe('');
    expect(SlugEngine.slugify(null)).toBe('');
    expect(SlugEngine.slugify(undefined)).toBe('');
  });
});

describe('SlugEngine - Full Generation Pipeline', () => {
  // Test cases from Blueprint requirements
  it('should generate slug for "مأوى" + 2024', () => {
    const slug = SlugEngine.generate('مأوى', 'Shelter', 2024, 1);
    expect(slug).toBe('mawy-2024');
  });

  it('should generate slug for "أبو شنب" + 2015', () => {
    const slug = SlugEngine.generate('أبو شنب', 'Abu Shanab', 2015, 1);
    expect(slug).toBe('abw-shnb-2015');
  });

  it('should generate slug for "النهاية" + 2022', () => {
    const slug = SlugEngine.generate('النهاية', 'The End', 2022, 1);
    expect(slug).toBe('alnhayh-2022');
  });

  it('should handle English titles', () => {
    const slug = SlugEngine.generate('The Dark Knight', 'The Dark Knight', 2008, 1);
    expect(slug).toBe('the-dark-knight-2008');
  });

  it('should handle mixed Arabic/English', () => {
    const slug = SlugEngine.generate('فيلم Action', 'Action Movie', 2023, 1);
    expect(slug).toBe('fylm-action-2023');
  });

  it('should handle titles without year', () => {
    const slug = SlugEngine.generate('Test Movie', 'Test Movie', null, 1);
    expect(slug).toBe('test-movie');
  });

  it('should append attempt counter for duplicates', () => {
    const slug1 = SlugEngine.generate('النهاية', 'The End', 2022, 1);
    const slug2 = SlugEngine.generate('النهاية', 'The End', 2022, 2);
    const slug3 = SlugEngine.generate('النهاية', 'The End', 2022, 3);
    
    expect(slug1).toBe('alnhayh-2022');
    expect(slug2).toBe('alnhayh-2022-2');
    expect(slug3).toBe('alnhayh-2022-3');
  });

  it('should use fallback when title is empty/invalid', () => {
    const slug = SlugEngine.generate('!!!???', '', 2020, 1);
    
    // Should not be empty
    expect(slug).toBeTruthy();
    expect(slug.length).toBeGreaterThan(0);
    
    // Should not contain UUID pattern
    expect(slug).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
    
    // Should start with 'content-' prefix
    expect(slug).toMatch(/^content-[a-z0-9]{4}-2020$/);
  });

  it('should use originalTitle as fallback when title fails', () => {
    const slug = SlugEngine.generate('', 'Fallback Title', 2021, 1);
    expect(slug).toBe('fallback-title-2021');
  });

  it('should handle null/undefined inputs gracefully', () => {
    const slug = SlugEngine.generate('', null, null, 1);
    
    // Should generate fallback
    expect(slug).toBeTruthy();
    expect(slug).toMatch(/^content-[a-z0-9]{4}$/);
  });

  it('should NEVER include TMDB ID in slug', () => {
    // Even if someone passes a number as title
    const slug = SlugEngine.generate('550', 'Fight Club', 1999, 1);
    expect(slug).toBe('550-1999');  // Uses the number as-is, not as TMDB ID
    
    // Verify it's not using TMDB ID pattern
    expect(slug).not.toMatch(/550$/);  // Should have year appended
  });

  it('should handle very long titles', () => {
    const longTitle = 'هذا عنوان طويل جداً يحتوي على الكثير من الكلمات العربية والإنجليزية';
    const slug = SlugEngine.generate(longTitle, '', 2023, 1);
    
    expect(slug).toBeTruthy();
    expect(slug.length).toBeGreaterThan(0);
    expect(slug).toMatch(/^[a-z0-9-]+-2023$/);
  });

  it('should handle special characters correctly', () => {
    const slug = SlugEngine.generate('Test: Movie (2023) [HD]', '', 2023, 1);
    expect(slug).toBe('test-movie-2023-hd-2023');
  });

  it('should be deterministic for same inputs', () => {
    const slug1 = SlugEngine.generate('مأوى', 'Shelter', 2024, 1);
    const slug2 = SlugEngine.generate('مأوى', 'Shelter', 2024, 1);
    expect(slug1).toBe(slug2);
  });
});

describe('SlugEngine - Edge Cases', () => {
  it('should handle empty strings', () => {
    const slug = SlugEngine.generate('', '', null, 1);
    expect(slug).toBeTruthy();
    expect(slug).toMatch(/^content-[a-z0-9]{4}$/);
  });

  it('should handle whitespace-only strings', () => {
    const slug = SlugEngine.generate('   ', '   ', null, 1);
    expect(slug).toBeTruthy();
    expect(slug).toMatch(/^content-[a-z0-9]{4}$/);
  });

  it('should handle numbers as titles', () => {
    const slug = SlugEngine.generate('2001', '2001', 1968, 1);
    expect(slug).toBe('2001-1968');
  });

  it('should handle single character titles', () => {
    const slug = SlugEngine.generate('A', 'A', 2020, 1);
    // Single char is < 2, should trigger fallback
    expect(slug).toMatch(/^content-[a-z0-9]{4}-2020$/);
  });

  it('should handle invalid year values', () => {
    expect(SlugEngine.generate('Test', '', 999, 1)).toBe('test');
    expect(SlugEngine.generate('Test', '', 10000, 1)).toBe('test');
    expect(SlugEngine.generate('Test', '', -1, 1)).toBe('test');
  });

  it('should handle high attempt numbers', () => {
    const slug = SlugEngine.generate('Test', '', 2020, 99);
    expect(slug).toBe('test-2020-99');
  });
});

describe('SlugEngine - Arabic Test Cases from Blueprint', () => {
  it('مأوى → mawy', () => {
    const normalized = SlugEngine.normalizeArabic('مأوى');
    expect(normalized).toBe('ماوي');  // After normalization
    
    const slug = SlugEngine.generate('مأوى', '', 2024, 1);
    expect(slug).toBe('mawy-2024');
  });

  it('أبو شنب → abw-shnb', () => {
    const slug = SlugEngine.generate('أبو شنب', '', 2015, 1);
    expect(slug).toBe('abw-shnb-2015');
  });

  it('النهاية → alnhayh', () => {
    const slug = SlugEngine.generate('النهاية', '', 2022, 1);
    expect(slug).toBe('alnhayh-2022');
  });

  it('should handle taa marbuta in مدرسة', () => {
    const normalized = SlugEngine.normalizeArabic('مدرسة');
    expect(normalized).toBe('مدرسه');
  });

  it('should handle alef maqsura in موسى', () => {
    const normalized = SlugEngine.normalizeArabic('موسى');
    expect(normalized).toBe('موسي');
  });
});
