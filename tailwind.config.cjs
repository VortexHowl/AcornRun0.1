/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./main.js",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          cyan: '#00f3ff',
          purple: '#bc13fe',
          dark: '#0d0221'
        }
      }
    },
  },
  plugins: [],
}
