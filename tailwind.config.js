module.exports = {
  content: ["./*.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
          primary: '#0f172a',
          cta: '#ea580c',
          ctaHover: '#c2410c',
      },
      fontFamily: {
          sans: ['Inter', 'sans-serif'],
          heading: ['Be Vietnam Pro', 'sans-serif'],
      },
      keyframes: {
          fadeIn: {
              '0%': { opacity: '0', transform: 'translateY(10px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' },
          }
      },
      animation: {
          fadeIn: 'fadeIn 0.3s ease-in-out',
      }
    },
  },
  plugins: [],
}
