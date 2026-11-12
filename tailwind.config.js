/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pov: {
          bg: '#0d0d11',
          card: '#16161f',
          cardBorder: '#232330',
          hover: '#1d1d29',
          purple: '#227c9d',
          purpleHover: '#1a647f',
          teal: '#227c9d',
          tealHover: '#1a647f',
          yellow: '#FF6B00',
          yellowHover: '#EA580C',
          muted: '#8b8b9e',
          pill: '#1e1e2b',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        fun: ['Fredoka', 'system-ui', 'sans-serif'],
        mono: ['"Space Grotesk"', 'monospace'],
      },
    },
  },
  plugins: [],
};
