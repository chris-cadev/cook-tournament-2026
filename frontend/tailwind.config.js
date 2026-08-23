/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f59e0b',
          dark: '#855300',
        },
        secondary: {
          DEFAULT: '#944a23',
        },
        tertiary: {
          DEFAULT: '#006c49',
        },
        surface: {
          DEFAULT: '#fdf9e9',
        },
        error: {
          DEFAULT: '#ba1a1a',
        },
      },
      fontFamily: {
        headline: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
