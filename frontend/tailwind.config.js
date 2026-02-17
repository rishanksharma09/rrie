/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      blue: {
        50: '#f0f7ff',
        100: '#e0effe',
        200: '#bae0fd',
        300: '#7cc2fb',
        400: '#36a2f6',
        500: '#0e86e5',
        600: '#026bc3',
        700: '#03559c',
        800: '#1e3a8a', // Primary Blue
        900: '#0b3c6b',
        950: '#072646',
      },
      green: {
        500: '#10B981', // Success Green
      },
      red: {
        500: '#EF4444', // Alert Red
      },
      boxShadow: {
        'card': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04), 0 8px 16px -4px rgba(0,0,0,0.04)',
        'card-hover': '0 0 0 1px rgba(0,0,0,0.03), 0 8px 16px -4px rgba(0,0,0,0.06), 0 16px 32px -4px rgba(0,0,0,0.06)',
        'premium': '0 20px 40px -4px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
