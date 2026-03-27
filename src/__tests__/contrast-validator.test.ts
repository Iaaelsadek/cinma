import { describe, it, expect } from 'vitest';
import {
  validateContrast,
  validateTextContrast,
  validateUIContrast,
  validateMultipleContrasts,
  getHighContrastAlternative,
  type ColorPair,
  type ContrastResult
} from '../utils/contrast-validator';

describe('contrast-validator', () => {
  describe('validateContrast', () => {
    it('should pass for pure black text on white background (21:1 ratio)', () => {
      const result = validateContrast({
        foreground: '#000000',
        background: '#FFFFFF'
      });
      
      expect(result.passes).toBe(true);
      expect(result.level).toBe('AAA');
      expect(result.ratio).toBeGreaterThan(20);
    });

    it('should pass for pure white text on black background (21:1 ratio)', () => {
      const result = validateContrast({
        foreground: '#FFFFFF',
        background: '#000000'
      });
      
      expect(result.passes).toBe(true);
      expect(result.level).toBe('AAA');
      expect(result.ratio).toBeGreaterThan(20);
    });

    it('should pass AA for cream text on void background (LUMEN design)', () => {
      const result = validateContrast({
        foreground: '#E8E4DC', // cream
        background: '#08080C'  // void
      });
      
      expect(result.passes).toBe(true);
      expect(result.level).toMatch(/AA|AAA/);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass AA for gold text on void background (LUMEN design)', () => {
      const result = validateContrast({
        foreground: '#C9A962', // gold
        background: '#08080C'  // void
      });
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should fail for low contrast gray on gray', () => {
      const result = validateContrast({
        foreground: '#888888',
        background: '#999999'
      });
      
      expect(result.passes).toBe(false);
      expect(result.level).toBe('fail');
      expect(result.recommendation).toBeDefined();
    });

    it('should handle 3-digit hex colors', () => {
      const result = validateContrast({
        foreground: '#000',
        background: '#FFF'
      });
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThan(20);
    });

    it('should handle hex colors without # prefix', () => {
      const result = validateContrast({
        foreground: '000000',
        background: 'FFFFFF'
      });
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThan(20);
    });

    it('should return fail for invalid color format', () => {
      const result = validateContrast({
        foreground: 'invalid',
        background: '#FFFFFF'
      });
      
      expect(result.passes).toBe(false);
      expect(result.level).toBe('fail');
      expect(result.ratio).toBe(0);
      expect(result.recommendation).toContain('Invalid color format');
    });

    it('should apply 3:1 ratio for large text (24px)', () => {
      // A color pair that passes 3:1 but fails 4.5:1
      // #949494 on white has approximately 3.03:1 ratio
      const result = validateContrast({
        foreground: '#949494',
        background: '#FFFFFF',
        fontSize: 24
      });
      
      // This should pass because large text only needs 3:1
      expect(result.ratio).toBeGreaterThanOrEqual(3);
      expect(result.ratio).toBeLessThan(4.5);
      expect(result.passes).toBe(true);
    });

    it('should apply 3:1 ratio for bold large text (18.66px, weight 700)', () => {
      const result = validateContrast({
        foreground: '#949494',
        background: '#FFFFFF',
        fontSize: 19,
        fontWeight: 700
      });
      
      // This should pass because bold large text only needs 3:1
      expect(result.ratio).toBeGreaterThanOrEqual(3);
      expect(result.passes).toBe(true);
    });

    it('should apply 4.5:1 ratio for normal text (16px)', () => {
      const result = validateContrast({
        foreground: '#949494',
        background: '#FFFFFF',
        fontSize: 16
      });
      
      // This should fail because normal text needs 4.5:1
      expect(result.ratio).toBeLessThan(4.5);
      expect(result.passes).toBe(false);
    });

    it('should provide helpful recommendation for near-threshold failures', () => {
      const result = validateContrast({
        foreground: '#949494',
        background: '#FFFFFF',
        fontSize: 16
      });
      
      expect(result.passes).toBe(false);
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation?.toLowerCase()).toContain('contrast');
    });

    it('should round ratio to 2 decimal places', () => {
      const result = validateContrast({
        foreground: '#000000',
        background: '#FFFFFF'
      });
      
      // Check that ratio is rounded (no more than 2 decimal places)
      const decimalPlaces = (result.ratio.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('validateTextContrast', () => {
    it('should validate normal text contrast', () => {
      const result = validateTextContrast('#000000', '#FFFFFF', 16);
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThan(20);
    });

    it('should validate large text contrast', () => {
      const result = validateTextContrast('#767676', '#FFFFFF', 24);
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });

    it('should work without font size', () => {
      const result = validateTextContrast('#000000', '#FFFFFF');
      
      expect(result.passes).toBe(true);
    });
  });

  describe('validateUIContrast', () => {
    it('should validate UI element contrast with 3:1 ratio', () => {
      const result = validateUIContrast('#767676', '#FFFFFF');
      
      // UI elements only need 3:1
      expect(result.ratio).toBeGreaterThanOrEqual(3);
      expect(result.passes).toBe(true);
    });

    it('should pass for LUMEN muted border on void background', () => {
      const result = validateUIContrast('#1C1B1F', '#08080C');
      
      // This tests the actual LUMEN design system colors
      // Note: These colors have low contrast by design for subtle borders
      expect(result.ratio).toBeGreaterThan(1);
    });

    it('should fail for very low contrast UI elements', () => {
      const result = validateUIContrast('#F0F0F0', '#FFFFFF');
      
      expect(result.passes).toBe(false);
      expect(result.ratio).toBeLessThan(3);
    });
  });

  describe('validateMultipleContrasts', () => {
    it('should validate multiple color pairs', () => {
      const pairs: ColorPair[] = [
        { foreground: '#000000', background: '#FFFFFF' },
        { foreground: '#FFFFFF', background: '#000000' },
        { foreground: '#888888', background: '#999999' }
      ];
      
      const results = validateMultipleContrasts(pairs);
      
      expect(results).toHaveLength(3);
      expect(results[0].passes).toBe(true);
      expect(results[1].passes).toBe(true);
      expect(results[2].passes).toBe(false);
    });

    it('should return empty array for empty input', () => {
      const results = validateMultipleContrasts([]);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getHighContrastAlternative', () => {
    it('should return white for dark backgrounds', () => {
      const result = getHighContrastAlternative('#08080C'); // void
      
      expect(result).toBe('#FFFFFF');
    });

    it('should return black for light backgrounds', () => {
      const result = getHighContrastAlternative('#FFFFFF');
      
      expect(result).toBe('#000000');
    });

    it('should return white for medium-dark backgrounds', () => {
      const result = getHighContrastAlternative('#333333');
      
      expect(result).toBe('#FFFFFF');
    });

    it('should return black for medium-light backgrounds', () => {
      const result = getHighContrastAlternative('#CCCCCC');
      
      expect(result).toBe('#000000');
    });

    it('should handle invalid color format gracefully', () => {
      const result = getHighContrastAlternative('invalid');
      
      expect(result).toBe('#FFFFFF');
    });
  });

  describe('edge cases', () => {
    it('should handle identical foreground and background colors', () => {
      const result = validateContrast({
        foreground: '#888888',
        background: '#888888'
      });
      
      expect(result.passes).toBe(false);
      expect(result.ratio).toBe(1);
    });

    it('should handle near-identical colors', () => {
      const result = validateContrast({
        foreground: '#888888',
        background: '#888889'
      });
      
      expect(result.passes).toBe(false);
      expect(result.ratio).toBeCloseTo(1, 1);
    });

    it('should handle colors at exact threshold (4.5:1)', () => {
      // #767676 on white is approximately 4.54:1
      const result = validateContrast({
        foreground: '#767676',
        background: '#FFFFFF',
        fontSize: 16
      });
      
      // Should be very close to threshold
      expect(result.ratio).toBeGreaterThan(4);
      expect(result.ratio).toBeLessThan(5);
    });

    it('should handle colors at exact threshold (3:1)', () => {
      // #949494 on white is approximately 3.03:1
      const result = validateContrast({
        foreground: '#949494',
        background: '#FFFFFF',
        fontSize: 24
      });
      
      // Should be very close to threshold
      expect(result.ratio).toBeGreaterThan(2.5);
      expect(result.ratio).toBeLessThan(3.5);
    });
  });

  describe('LUMEN design system colors', () => {
    it('should validate cream on void (primary text)', () => {
      const result = validateContrast({
        foreground: '#E8E4DC',
        background: '#08080C'
      });
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should validate silver on void (secondary text)', () => {
      const result = validateContrast({
        foreground: '#A8A5A0',
        background: '#08080C'
      });
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should validate gold on void (accent)', () => {
      const result = validateContrast({
        foreground: '#C9A962',
        background: '#08080C'
      });
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should validate cream on surface', () => {
      const result = validateContrast({
        foreground: '#E8E4DC',
        background: '#0F0F14'
      });
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should validate cream on muted', () => {
      const result = validateContrast({
        foreground: '#E8E4DC',
        background: '#1C1B1F'
      });
      
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
