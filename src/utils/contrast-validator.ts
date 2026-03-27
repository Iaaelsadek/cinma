/**
 * Contrast Validation Utility
 * 
 * Implements WCAG 2.1 Level AA contrast validation for text and UI components.
 * Calculates luminance and contrast ratios to ensure accessibility compliance.
 */

export interface ContrastResult {
  ratio: number;
  passes: boolean;
  level: 'AA' | 'AAA' | 'fail';
  recommendation?: string;
}

export interface ColorPair {
  foreground: string;
  background: string;
  fontSize?: number;
  fontWeight?: number;
}

/**
 * Converts a hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Parse hex to RGB
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Converts RGB color to relative luminance
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values to 0-1 range
  const [rs, gs, bs] = [r, g, b].map(val => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  
  // Calculate relative luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two colors
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function getContrastRatio(luminance1: number, luminance2: number): number {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines if text is considered "large" according to WCAG 2.1
 * Large text is defined as:
 * - 18pt (24px) or larger
 * - 14pt (18.66px) or larger if bold (font-weight >= 700)
 */
function isLargeText(fontSize?: number, fontWeight?: number): boolean {
  if (!fontSize) return false;
  
  if (fontSize >= 24) return true;
  if (fontSize >= 18.66 && fontWeight && fontWeight >= 700) return true;
  
  return false;
}

/**
 * Validates contrast ratio against WCAG 2.1 Level AA requirements
 * 
 * @param pair - Color pair with foreground, background, and optional font properties
 * @returns ContrastResult with ratio, pass/fail status, level, and recommendations
 */
export function validateContrast(pair: ColorPair): ContrastResult {
  const { foreground, background, fontSize, fontWeight } = pair;
  
  // Parse colors
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);
  
  if (!fgRgb || !bgRgb) {
    return {
      ratio: 0,
      passes: false,
      level: 'fail',
      recommendation: 'Invalid color format. Please use hex colors (e.g., #FFFFFF)'
    };
  }
  
  // Calculate luminance for both colors
  const fgLuminance = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  
  // Calculate contrast ratio
  const ratio = getContrastRatio(fgLuminance, bgLuminance);
  
  // Determine if text is large
  const largeText = isLargeText(fontSize, fontWeight);
  
  // WCAG 2.1 Level AA requirements:
  // - Normal text: 4.5:1
  // - Large text: 3:1
  // - UI components: 3:1
  const requiredRatio = largeText ? 3 : 4.5;
  
  // WCAG 2.1 Level AAA requirements:
  // - Normal text: 7:1
  // - Large text: 4.5:1
  const aaaRatio = largeText ? 4.5 : 7;
  
  // Determine level and pass/fail
  let level: 'AA' | 'AAA' | 'fail';
  let passes: boolean;
  let recommendation: string | undefined;
  
  if (ratio >= aaaRatio) {
    level = 'AAA';
    passes = true;
  } else if (ratio >= requiredRatio) {
    level = 'AA';
    passes = true;
  } else {
    level = 'fail';
    passes = false;
    
    // Provide helpful recommendation
    const deficit = requiredRatio - ratio;
    if (deficit < 1) {
      recommendation = 'Contrast is close to passing. Try slightly darkening the background or lightening the foreground.';
    } else if (deficit < 2) {
      recommendation = 'Contrast needs improvement. Consider using a darker background or lighter foreground color.';
    } else {
      recommendation = 'Contrast is significantly below requirements. Use high-contrast color combinations.';
    }
  }
  
  return {
    ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
    passes,
    level,
    recommendation
  };
}

/**
 * Validates text contrast against WCAG 2.1 Level AA requirements
 * 
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @param fontSize - Font size in pixels (optional)
 * @param fontWeight - Font weight (optional)
 * @returns ContrastResult
 */
export function validateTextContrast(
  foreground: string,
  background: string,
  fontSize?: number,
  fontWeight?: number
): ContrastResult {
  return validateContrast({ foreground, background, fontSize, fontWeight });
}

/**
 * Validates UI element contrast against WCAG 2.1 Level AA requirements
 * UI components require a minimum contrast ratio of 3:1
 * 
 * @param foreground - Foreground color (hex)
 * @param background - Background color (hex)
 * @returns ContrastResult
 */
export function validateUIContrast(
  foreground: string,
  background: string
): ContrastResult {
  // UI components are treated as "large text" (3:1 requirement)
  return validateContrast({ 
    foreground, 
    background, 
    fontSize: 24 // Treat as large text to apply 3:1 ratio
  });
}

/**
 * Batch validates multiple color pairs
 * Useful for validating entire color palettes
 * 
 * @param pairs - Array of color pairs to validate
 * @returns Array of ContrastResults
 */
export function validateMultipleContrasts(pairs: ColorPair[]): ContrastResult[] {
  return pairs.map(pair => validateContrast(pair));
}

/**
 * Gets a high-contrast alternative for a failing color pair
 * This is a simple implementation that suggests using pure white or black
 * 
 * @param background - Background color (hex)
 * @returns Suggested foreground color (hex)
 */
export function getHighContrastAlternative(background: string): string {
  const bgRgb = hexToRgb(background);
  
  if (!bgRgb) return '#FFFFFF';
  
  // Calculate luminance
  const luminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  
  // If background is dark (luminance < 0.5), use white text
  // If background is light, use black text
  return luminance < 0.5 ? '#FFFFFF' : '#000000';
}
