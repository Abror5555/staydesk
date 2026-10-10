/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          500: '#3b6ef5',
          600: '#2a55e0',
          700: '#2245b8',
        },
      },
    },
  },
  plugins: [],
};
