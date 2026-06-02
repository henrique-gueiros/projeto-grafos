/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        region: {
          norte: '#2dd4bf',
          nordeste: '#fb923c',
          sudeste: '#818cf8',
          sul: '#4ade80',
          'centro-oeste': '#fbbf24',
        },
      },
    },
  },
  plugins: [],
}
