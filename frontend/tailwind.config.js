/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Pitch palette: dark navy surfaces with cyan accents.
        bg: {
          DEFAULT: '#0a0e1a',
          elevated: '#161c2e',
          card: '#1a2138',
        },
        border: {
          subtle: '#2a334e',
        },
        accent: {
          cyan: '#22d3ee',
          cyanDim: '#0e7490',
        },
        danger: '#ef4444',
        warning: '#f59e0b',
        ok: '#10b981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
