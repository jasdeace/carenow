/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#EDFAF8',
          100: '#DDF4F1',
          200: '#BFEDE9',
          300: '#8FDDD7',
          400: '#4EC4BD',
          500: '#20A39A',
          600: '#14857C',
          700: '#0F766E',
          800: '#0E5C5A',
          900: '#0B3F3D',
        },
        ink: {
          300: '#B3BFC1',
          400: '#87979A',
          500: '#5C6F71',
          700: '#2E4547',
          900: '#0F2C2E',
        },
        cream: {
          50: '#FAF7F1',
          100: '#F3EEE3',
          200: '#E8E0CD',
        },
        line: { DEFAULT: '#EBE5D6', soft: '#F1ECDF' },
        paper: '#FFFFFF',
        coral: { 100: '#FBE5DC', 300: '#F3BFAE', 500: '#E8927C' },
        sand: { 100: '#FBF1D9', 200: '#F4E3BD', 500: '#D6A85F' },
        rose: { 100: '#FBE3E5', 500: '#D85B66' },
        sky: { 100: '#E2E8F8', 500: '#4B6FD1' },
        ok: { 100: '#DDF1E7', 500: '#1F9A6E' },
        warn: { 100: '#F8EBCC', 500: '#C99339' },
        danger: { DEFAULT: '#C84A4A' },

        // Semantic aliases re-pointed to the new teal/cream system so legacy
        // screens migrate visually without per-file edits.
        background: '#FAF7F1',
        foreground: '#0F2C2E',
        card: '#FFFFFF',
        primary: { DEFAULT: '#0F766E', foreground: '#FFFFFF' },
        secondary: { DEFAULT: '#F3EEE3', foreground: '#2E4547' },
        muted: { DEFAULT: '#F3EEE3', foreground: '#5C6F71' },
        accent: { DEFAULT: '#DDF4F1', foreground: '#0E5C5A' },
        destructive: { DEFAULT: '#C84A4A', foreground: '#FFFFFF' },
        border: '#EBE5D6',
      },
      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '20px',
        xl: '28px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
