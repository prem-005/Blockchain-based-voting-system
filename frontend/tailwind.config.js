/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern Civic Tech Palette
        civic: {
          bg: '#F5F7FB',
          surface: '#FFFFFF',
          navy: '#102A56',
          'navy-hover': '#0C2042',
          blue: '#2563EB',
          'blue-hover': '#1D4ED8',
          'blue-soft': '#DBEAFE',
          'blue-tint': '#EFF6FF',
          green: '#15803D',
          'green-soft': '#DCFCE7',
          text: '#172033',
          muted: '#64748B',
          border: '#E2E8F0',
          'border-strong': '#CBD5E1',
          error: '#B91C1C',
          'error-soft': '#FEE2E2',
          warning: '#B45309',
          'warning-soft': '#FEF3C7',
        },
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#102A56',
          900: '#0C2042',
          950: '#081429',
        },
        accent: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#15803D',
          700: '#166534',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
