/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Ported from the web app's shadcn theme (light mode)
        background: '#ffffff',
        foreground: '#09090b',
        card: '#ffffff',
        primary: { DEFAULT: '#16a34a', foreground: '#f0fdf4' },
        secondary: { DEFAULT: '#f4f4f5', foreground: '#18181b' },
        muted: { DEFAULT: '#f4f4f5', foreground: '#71717a' },
        accent: { DEFAULT: '#f4f4f5', foreground: '#18181b' },
        destructive: { DEFAULT: '#ef4444', foreground: '#fafafa' },
        border: '#e4e4e7',
      },
    },
  },
  plugins: [],
};
