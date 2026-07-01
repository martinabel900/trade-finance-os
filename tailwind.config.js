/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17202a',
        line: '#d7dde5',
        paper: '#f7f8fa',
        navy: '#1f3a5f',
        steel: '#496578',
        mint: '#2f8f83',
        amber: '#b7791f',
        rose: '#b8324a',
      },
      boxShadow: {
        soft: '0 12px 28px rgba(23, 32, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
