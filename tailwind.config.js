/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        family: {
          deep: '#05070B',        // Deepest black
          night: '#0B111E',       // Midnight navy base
          surface: '#111827',     // Dark graphite surface
          card: '#161F33',        // Card background
          cardHover: '#1D2942',   // Card hover state
          border: 'rgba(212, 175, 55, 0.15)', // Subtle gold border
          borderLight: 'rgba(255, 255, 255, 0.08)',
          gold: {
            light: '#F3E5AB',
            DEFAULT: '#D4AF37',    // Champagne Gold primary
            dark: '#AA820A',
            glow: 'rgba(212, 175, 55, 0.25)',
          },
          text: {
            primary: '#F8FAFC',    // Soft White
            secondary: '#94A3B8',  // Muted gray
            muted: '#64748B',      // Darker muted
            gold: '#E6C665',       // Warm gold text
          },
          status: {
            online: '#10B981',
            offline: '#64748B',
            alert: '#F43F5E',
          }
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'gold-sm': '0 0 10px rgba(212, 175, 55, 0.12)',
        'gold-md': '0 0 20px rgba(212, 175, 55, 0.18)',
        'gold-lg': '0 0 35px rgba(212, 175, 55, 0.25)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'scale-in': 'scaleIn 0.25s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}
