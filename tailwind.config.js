/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        temple: {
          maroon: '#7A1F2B',
          gold: '#D4A017',
          cream: '#FFF8E7'
        }
      }
    }
  },
  plugins: []
}
