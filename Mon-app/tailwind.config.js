/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        depot:   { DEFAULT: '#1B5E20', light: '#2E7D32', pale: '#E8F5E9' },
        pharma:  { DEFAULT: '#1565C0', light: '#1976D2', pale: '#E3F2FD' },
        danger:  { DEFAULT: '#B71C1C', light: '#C62828', pale: '#FFEBEE' },
        warn:    { DEFAULT: '#E65100', light: '#F57C00', pale: '#FFF3E0' },
        surface: { 
          DEFAULT: '#0f172a',
          50: '#f8fafc',
          100: '#f1f5f9', 
          200: '#e2e8f0',
          800: '#1e293b',
          900: '#0f172a',
          950: '#080e1a'
        }
      },
      fontFamily: { 
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'], 
        mono: ['DM Mono', 'Fira Code', 'monospace'] 
      },
      animation: {
        'fade-in': 'fadeIn .2s ease both',
        'slide-up': 'slideUp .25s ease both',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn:  { 
          from: { opacity: 0, transform: 'translateY(6px)' }, 
          to: { opacity: 1, transform: 'none' } 
        },
        slideUp: { 
          from: { opacity: 0, transform: 'translateY(12px)' }, 
          to: { opacity: 1, transform: 'none' } 
        },
      },
    },
  },
  plugins: [],
};