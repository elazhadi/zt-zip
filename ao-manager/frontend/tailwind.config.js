/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        success: { DEFAULT: '#16A34A', 50: '#F0FDF4', 100: '#DCFCE7', 600: '#16A34A', 700: '#15803D' },
        warning: { DEFAULT: '#D97706', 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 500: '#F59E0B', 600: '#D97706', 700: '#B45309', 800: '#92400E', 900: '#78350F' },
        danger: { DEFAULT: '#DC2626', 600: '#DC2626', 700: '#B91C1C' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
