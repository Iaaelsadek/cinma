/**
 * 🧪 Tests for useAppPromoToast Hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppPromoToast } from '../hooks/useAppPromoToast';

describe('useAppPromoToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should not show toast initially', () => {
    const { result } = renderHook(() => useAppPromoToast());
    expect(result.current.isVisible).toBe(false);
  });

  it('should show toast after 2 seconds delay', async () => {
    const { result } = renderHook(() => useAppPromoToast());

    expect(result.current.isVisible).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('should not show toast if already dismissed', async () => {
    localStorage.setItem('app-promo-dismissed', 'true');

    const { result } = renderHook(() => useAppPromoToast());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should not show toast if shown 3 times already', async () => {
    localStorage.setItem('app-promo-show-count', '3');

    const { result } = renderHook(() => useAppPromoToast());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should not show toast in WebView', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit/537.36',
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useAppPromoToast());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should start fading out after 7.5 seconds', async () => {
    const { result } = renderHook(() => useAppPromoToast());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.isFadingOut).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7500);
    });

    expect(result.current.isFadingOut).toBe(true);
  });

  it('should auto-dismiss after 8 seconds', async () => {
    const { result } = renderHook(() => useAppPromoToast());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(result.current.isVisible).toBe(false);
  });

  it('should dismiss when handleDismiss is called', async () => {
    const { result } = renderHook(() => useAppPromoToast());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(true);

    await act(async () => {
      result.current.handleDismiss();
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.isVisible).toBe(false);
    expect(localStorage.getItem('app-promo-dismissed')).toBe('true');
  });

  it('should update progress from 100 to 0', async () => {
    const { result } = renderHook(() => useAppPromoToast());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.progress).toBe(100);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(result.current.progress).toBeLessThan(60);
    expect(result.current.progress).toBeGreaterThan(40);
  });

  it('should increment show count in localStorage', async () => {
    const { result } = renderHook(() => useAppPromoToast());

    expect(localStorage.getItem('app-promo-show-count')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(true);
    expect(localStorage.getItem('app-promo-show-count')).toBe('1');
  });

  it('should open app and dismiss when handleOpenApp is called', async () => {
    const windowOpenSpy = vi.fn();
    const originalOpen = window.open;
    window.open = windowOpenSpy as any;

    const { result } = renderHook(() => useAppPromoToast());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isVisible).toBe(true);

    await act(async () => {
      result.current.handleOpenApp();
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(windowOpenSpy).toHaveBeenCalled();
    expect(result.current.isVisible).toBe(false);
    expect(localStorage.getItem('app-promo-dismissed')).toBe('true');

    window.open = originalOpen;
  });
});
