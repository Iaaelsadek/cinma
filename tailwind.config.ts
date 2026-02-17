import type { Config } from 'tailwindcss'
// @ts-ignore
import rtl from 'tailwindcss-rtl'

/**
 * LUMEN Design System — Light through darkness.
 * Cinema Online. Premium, cinematic, universal (TV/tablet/mobile/desktop).
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
        '4xl': '2560px',
        '5xl': '3840px',
      },
      colors: {
        /* LUMEN palette */
        lumen: {
          void: '#08080C',
          surface: '#0F0F14',
          muted: '#1C1B1F',
          cream: '#E8E4DC',
          silver: '#A8A5A0',
          gold: '#C9A962',
        },
        /* Legacy compatibility */
        primary: {
          DEFAULT: '#C9A962',
          glow: 'rgba(201, 169, 98, 0.4)',
        },
        luxury: {
          obsidian: '#08080C',
          charcoal: '#0F0F14',
          emerald: '#C9A962',
          blue: '#3B82F6',
          frost: '#0F0F14',
        },
        neon: {
          emerald: '#C9A962',
          blue: '#3B82F6',
          cyan: '#22D3EE',
        },
      },
      fontFamily: {
        syne: ['Syne', 'system-ui', 'sans-serif'],
        dm: ['DM Sans', 'system-ui', 'sans-serif'],
        cairo: ['Cairo', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(232, 228, 220, 0.06) 0%, rgba(232, 228, 220, 0.02) 100%)',
        'luxury-gradient': 'linear-gradient(to bottom, transparent, #08080C)',
        'hero-gradient': 'linear-gradient(to right, #08080C 0%, rgba(8, 8, 12, 0.85) 35%, transparent 70%)',
        'hero-gradient-rtl': 'linear-gradient(to left, #08080C 0%, rgba(8, 8, 12, 0.85) 35%, transparent 70%)',
        'lumen-vignette': 'radial-gradient(ellipse 80% 60% at 50% 100%, transparent 40%, rgba(8, 8, 12, 0.95) 100%)',
        'lumen-mesh': 'linear-gradient(135deg, rgba(201, 169, 98, 0.03) 0%, transparent 50%, rgba(201, 169, 98, 0.02) 100%)',
      },
      boxShadow: {
        glass: '0 12px 36px 0 rgba(0, 0, 0, 0.5)',
        'lumen-card': '0 4px 24px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(28, 27, 31, 0.6)',
        'lumen-card-hover': '0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(201, 169, 98, 0.35), 0 0 40px -8px rgba(201, 169, 98, 0.2)',
        'lumen-gold': '0 0 0 3px rgba(201, 169, 98, 0.5)',
        'lumen-glow': '0 0 24px -4px rgba(201, 169, 98, 0.25)',
        'neon-emerald': '0 0 18px rgba(201, 169, 98, 0.4)',
        'neon-blue': '0 0 18px rgba(59, 130, 246, 0.55)',
      },
      animation: {
        'lumen-breathe': 'lumen-breathe 8s ease-in-out infinite',
        'lumen-float': 'lumen-float 6s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'neon-flicker': 'neon-flicker 2s infinite alternate',
        'neon-flicker-cyan': 'neon-flicker-cyan 2s infinite alternate',
        'neon-flicker-cyan-alt': 'neon-flicker-cyan-alt 2.5s infinite alternate-reverse',
        'pulse-white': 'pulse-white 3s ease-in-out infinite',
        'neon-flash': 'neon-flash 1.5s infinite ease-in-out',
      },
      keyframes: {
        'lumen-breathe': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'lumen-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'neon-flicker': {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': {
            opacity: '1',
            textShadow: '0 0 5px rgba(255, 255, 255, 0.7), 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.3)'
          },
          '20%, 24%, 55%': {
            opacity: '0.5',
            textShadow: 'none'
          },
        },
        'neon-flicker-cyan': {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': {
            opacity: '1',
            textShadow: '0 0 5px rgba(34, 211, 238, 0.7), 0 0 10px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)'
          },
          '20%, 24%, 55%': {
            opacity: '0.5',
            textShadow: 'none'
          },
        },
        'neon-flicker-cyan-alt': {
          '0%, 34%, 36%, 38%, 40%, 69%, 71%, 100%': {
            opacity: '1',
            textShadow: '0 0 5px rgba(34, 211, 238, 0.7), 0 0 10px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)'
          },
          '35%, 39%, 70%': {
            opacity: '0.5',
            textShadow: 'none'
          },
        },
        'pulse-white': {
          '0%, 100%': { opacity: '0.8', textShadow: '0 0 5px rgba(255, 255, 255, 0.5)' },
          '50%': { opacity: '1', textShadow: '0 0 15px rgba(255, 255, 255, 0.9)' },
        },
        'neon-flash': {
          '0%, 100%': { opacity: '1', textShadow: '0 0 5px #22d3ee, 0 0 10px #22d3ee' },
          '50%': { opacity: '0.5', textShadow: 'none' },
        }
      },
      transitionTimingFunction: {
        lumen: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [rtl],
} satisfies Config
