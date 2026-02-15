import type { Config } from 'tailwindcss'
import rtl from 'tailwindcss-rtl'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#10B981',
          glow: '#34D399'
        },
        luxury: {
          obsidian: '#050505',
          charcoal: '#0F1115',
          emerald: '#10B981',
          blue: '#3B82F6',
          frost: '#0B0D12'
        },
        neon: {
          emerald: '#10B981',
          blue: '#3B82F6',
          cyan: '#22D3EE'
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'luxury-gradient': 'linear-gradient(to bottom, transparent, #050505)',
        'hero-gradient': 'linear-gradient(to right, #050505 0%, rgba(5, 5, 5, 0.8) 40%, transparent 100%)'
      },
      boxShadow: {
        'glass': '0 12px 36px 0 rgba(0, 0, 0, 0.65)',
        'neon-emerald': '0 0 18px rgba(16, 185, 129, 0.55)',
        'neon-blue': '0 0 18px rgba(59, 130, 246, 0.55)'
      },
      fontFamily: {
        cairo: ['Cairo', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slow-train': 'slow-train 60s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' }
        },
        'slow-train': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-200%)' }
        }
      }
    }
  },
  plugins: [rtl]
} satisfies Config
