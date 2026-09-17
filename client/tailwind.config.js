/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        narmax: {
          black: '#000000',
          red: '#E50914',
          dark: '#0b0b0b',
          card: '#141414',
          midnight: '#03045E',
          cobalt: '#1E40AF',
          cyan: '#56CFE1',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.55)',
      },
    },
  },
  plugins: [],
};
