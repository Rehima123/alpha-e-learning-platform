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
        primary: '#3498db',
        secondary: '#2c3e50',
        success: '#27ae60',
        danger: '#e74c3c',
        warning: '#f39c12',
      },
    },
  },
  plugins: [],
}
