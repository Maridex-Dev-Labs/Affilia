/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        kenya: {
          black: '#000000',
          red: '#BB0000',
          green: '#009A44',
          white: '#FFFFFF',
          navy: '#0A0E17',
          surface: '#141A2B',
          gray400: '#A0AEC0',
          gray600: '#4A5568',
        },
      },
      boxShadow: {
        glow: '0 0 30px rgba(0, 154, 68, 0.25)',
      },
      animation: {
        'kenya-flag-shift': 'kenya-flag-shift 12s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
      keyframes: {
        'kenya-flag-shift': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
