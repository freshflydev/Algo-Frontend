/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        muted: '#64748b',
        line: '#dbe4ee',
        surface: '#ffffff',
        app: {
          blue: '#123dcc',
          navy: '#071b4f',
          green: '#0f9f6e',
          red: '#dc2626',
        },
      },
      boxShadow: {
        soft: '0 12px 32px rgba(15, 23, 42, 0.08)',
        card: '0 8px 22px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
