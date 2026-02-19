/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Color Hunt Palette: https://colorhunt.co/palette/a82323feffd3bcd9a26d9e51
        primary: {
          DEFAULT: '#A82323', // Deep Red
          50: '#FDEAEA',
          100: '#FBD5D5',
          200: '#F7ABAB',
          300: '#F38181',
          400: '#EF5757',
          500: '#A82323', // Main
          600: '#8A1D1D',
          700: '#6C1717',
          800: '#4E1111',
          900: '#300B0B',
        },
        accent: {
          light: '#FEFFD3', // Cream Yellow
          DEFAULT: '#BCD9A2', // Light Green
          dark: '#6D9E51', // Forest Green
        },
        cream: '#FEFFD3',
        sage: '#BCD9A2',
        forest: '#6D9E51',
        crimson: '#A82323',
      },
    },
  },
  plugins: [],
}

