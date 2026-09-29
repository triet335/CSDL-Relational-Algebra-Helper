/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ctu: {
          blue: '#005baa',
          navy: '#0b2b4d',
          accent: '#e67e22',
          light: '#f0f7ff',
        }
      }
    },
  },
  plugins: [],
}
