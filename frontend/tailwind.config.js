/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--bg)',
          panel: 'var(--panel)',
          soft: 'var(--panel-soft)',
          hover: 'var(--hover)',
          border: 'var(--border)',
          text: 'var(--text)',
          muted: 'var(--muted)',
          faint: 'var(--faint)',
          accent: 'var(--accent)',
          'accent-dark': 'var(--accent-dark)',
          'bubble-in': 'var(--bubble-in)',
          'bubble-out': 'var(--bubble-out)',
          danger: 'var(--danger)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 12px 40px rgba(0, 0, 0, 0.28)',
        pop: '0 18px 50px rgba(0, 0, 0, 0.45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'pop-in': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
          '40%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.22s ease-out',
        'pop-in': 'pop-in 0.16s ease-out',
        'bounce-dot': 'bounceDot 1.2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
