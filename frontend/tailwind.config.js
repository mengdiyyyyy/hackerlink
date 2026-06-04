/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        accent: '#D97706',
        success: '#10B981',
        bg: '#FAFAF7',
        border: '#E8E8E5',
        'text-primary': '#0A0A0A',
        'text-secondary': '#6B6B70',
        'text-weak': '#A8A8AC',
      },
      fontFamily: {
        heading: ['Inter Tight', 'PingFang SC', 'sans-serif'],
        body: ['Inter', 'PingFang SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
        serif: ['Noto Serif SC', 'serif'],
      },
    },
  },
  plugins: [],
}
