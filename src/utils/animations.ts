/**
 * 🎬 Animation Utilities - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Reusable animation variants for Framer Motion
 * @author Cinema Online Team
 * @version 2.0.0
 * 
 * Implements Requirements:
 * - 13.1: Transition durations (fast: 150ms, normal: 300ms, slow: 500ms)
 * - 13.2: Easing functions (ease-lumen, ease-in-out, ease-out)
 * - 13.3: Consistent transitions for interactive elements
 * - 13.5: Prefers-reduced-motion support
 * - 13.6: GPU-accelerated properties (transform, opacity)
 */

import type { Variants, Transition } from 'framer-motion'

// Transition durations
export const durations = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
} as const

// Easing functions
export const easings = {
  lumen: [0.22, 1, 0.36, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  easeOut: [0, 0, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
} as const

// Base transition
export const transition: Transition = {
  duration: durations.normal,
  ease: easings.lumen,
}

// Fade variants
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

// Slide variants
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
}

// Scale variants
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

// Modal variants
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
}

// Toast variants
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.lumen,
    },
  },
  exit: { 
    opacity: 0, 
    y: -20, 
    scale: 0.95,
    transition: {
      duration: durations.fast,
      ease: easings.easeIn,
    },
  },
}

// Card hover variants
export const cardHoverVariants: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.03,
    transition: {
      duration: durations.normal,
      ease: easings.lumen,
    },
  },
}

// Stagger children
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

// Utility: Check if user prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Utility: Get transition with reduced motion support
export const getTransition = (customTransition?: Transition): Transition => {
  if (prefersReducedMotion()) {
    return { duration: 0 }
  }
  return customTransition || transition
}

// Utility: Apply GPU acceleration hint
export const gpuAcceleration = {
  willChange: 'transform, opacity',
  transform: 'translateZ(0)',
} as const
