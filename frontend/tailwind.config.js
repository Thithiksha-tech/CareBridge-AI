/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#665BE8',
          indigo: '#373B8F',
          periwinkle: '#8C91F5',
          lavender: '#F0EEFF',
          paleBlue: '#EAF0FF',
          white: '#FFFFFF',
          bg: '#F7F8FF',
          text: '#24264A',
          secondary: '#73758E',
          success: '#278567',
          warning: '#C58A30',
          error: '#C94C62',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(102, 91, 232, 0.08)',
        'elevated': '0 10px 30px -4px rgba(55, 59, 143, 0.12)',
        'floating': '0 20px 40px -8px rgba(102, 91, 232, 0.18)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
