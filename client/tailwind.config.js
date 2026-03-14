/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eyDark: '#161d23',
        primary: {
          50: '#fffce0',
          100: '#fff8b3',
          200: '#fff380',
          300: '#ffef4d',
          400: '#ffea1a',
          500: '#ffe600',
          600: '#ccb800',
          700: '#998a00',
          800: '#665c00',
          900: '#332e00',
        },
        evaluator: {
          base: '#F8F9FB',
          dark: '#161d23',
          accent: '#ffe600',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
