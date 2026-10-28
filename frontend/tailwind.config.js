/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        whisper: {
          50: "#f5f7ff",
          100: "#ebf0fe",
          200: "#d6e0fd",
          300: "#b3c7fb",
          400: "#8aa5f7",
          500: "#637cf2",
          600: "#4f5ee6",
          700: "#3d48ca",
          800: "#343ba3",
          900: "#2e3581",
          950: "#1b1e4c",
        },
        obsidian: {
          950: "#090d16",
          900: "#0e1526",
          850: "#131b31",
          800: "#18223d",
          750: "#1e2a4a",
          700: "#27365e",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '28px' },
        }
      }
    },
  },
  plugins: [],
}
