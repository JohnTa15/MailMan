/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  // Touch screens keep :hover after a tap; only apply hover styles where hovering exists
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        ink: {
          50: '#f7f7fb',
          100: '#eeeef5',
          200: '#dcdce8',
          300: '#b9b9cc',
          400: '#8b8ba3',
          500: '#64647d',
          600: '#4a4a60',
          700: '#33334a',
          800: '#1d1e30',
          850: '#15162a',
          900: '#0f1020',
          950: '#0b0d17',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 8px 30px -6px rgba(99, 102, 241, 0.55)',
        card: '0 1px 2px rgba(15, 16, 32, 0.04), 0 8px 24px -8px rgba(15, 16, 32, 0.12)',
        float: '0 24px 64px -16px rgba(15, 16, 32, 0.35)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(40px, -60px) scale(1.1)' },
          '66%': { transform: 'translate(-30px, 30px) scale(0.92)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        blob: 'blob 18s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 4s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
      },
    },
  },
  plugins: [],
};
