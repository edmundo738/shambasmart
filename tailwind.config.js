/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0d14',
          900: '#10131d',
          850: '#151927',
          800: '#1b2133',
          700: '#262e45',
          600: '#333d5c',
        },
        forge: {
          300: '#9be8ff',
          400: '#5fd4ff',
          500: '#22b8f0',
          600: '#0d94d6',
        },
        pixel: {
          400: '#b6f34c',
          500: '#8ee000',
          600: '#66aa00',
        },
        ember: {
          400: '#ffb020',
          500: '#ff8a00',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(34, 184, 240, 0.35)',
        'glow-green': '0 0 24px rgba(142, 224, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
