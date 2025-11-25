/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0A3041',
        secondary: '#1a5270',
        accent: '#80350E',
        lightOrange: '#b8581f',
        bgLight: '#f8f9fa',
        textDark: '#2c3e50',
        textLight: '#6c757d',   // <-- used by text-textLight
        success: '#28a745',
        warning: '#ffc107',
        danger:  '#dc3545',
        borderLight: '#e9ecef', // <-- used by border-borderLight
      },
      boxShadow: {
        card: '0 4px 6px rgba(0,0,0,0.07)',
        cardHover: '0 8px 15px rgba(0,0,0,0.10)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn .4s ease-out',
        shimmer: 'shimmer 1.2s linear infinite',
      },
      borderRadius: {
        'xl2': '12px'
      }
    },
  },
  plugins: [],
}
