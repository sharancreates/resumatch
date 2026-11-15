/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#080B11',
          card: '#0D131F',
          elevated: '#0E1726',
          border: 'rgba(255, 255, 255, 0.08)'
        },
        cobalt: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          900: '#1E3A8A',
          950: '#172554'
        }
      }
    },
  },
  plugins: [],
}