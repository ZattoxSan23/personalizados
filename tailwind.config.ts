import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary refinado: emerald profundo (más sofisticado que el verde lima default)
        primary: {
          50:  '#edfaf3',
          100: '#d3f3df',
          200: '#a8e7c0',
          300: '#6dd49a',
          400: '#34b873',
          500: '#15a05a',
          600: '#0d8348',
          700: '#0a6639',
          800: '#0a5231',
          900: '#084328',
          950: '#032515',
        },
        // Accent: coral cálido para CTAs / highlights (más distintivo que amber)
        accent: {
          50:  '#fff5f3',
          100: '#ffe6e0',
          200: '#ffcdc1',
          300: '#ffa797',
          400: '#ff7a64',
          500: '#ff5a3c',
          600: '#f03f1f',
          700: '#d12c14',
          800: '#aa2615',
          900: '#892418',
          950: '#4f0e08',
        },
        // Neutrals: slate con tinte ligeramente cálido
        ink: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#0a0f1a',
        },
        // Estados semánticos
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'display': ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-sm': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '700' }],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'card': '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)',
        'popover': '0 10px 15px -3px rgb(15 23 42 / 0.10), 0 4px 6px -4px rgb(15 23 42 / 0.05)',
        'accent-glow': '0 4px 14px -2px rgb(245 158 11 / 0.25)',
        'primary-glow': '0 4px 14px -2px rgb(5 150 105 / 0.30)',
      },
      borderRadius: {
        'DEFAULT': '0.5rem',
        'xl': '0.875rem',
        '2xl': '1.125rem',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out-quart',
        'fade-in-fast': 'fade-in-fast 150ms ease-out-quart',
        'scale-in': 'scale-in 200ms ease-out-expo',
        'slide-up': 'slide-up 300ms ease-out-quart',
      },
    },
  },
  plugins: [],
};

export default config;