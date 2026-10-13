/** @type {import('tailwindcss').Config} */

// Professional blue scale — the single accent for the admin console.
// `violet`, `indigo` and `purple` are aliased onto it so the hundreds of
// existing `violet-*` / `indigo-*` utility classes re-skin automatically.
const blue = {
  50:  'var(--ua-brand-50)',
  100: 'var(--ua-brand-100)',
  200: 'var(--ua-brand-200)',
  300: 'var(--ua-brand-300)',
  400: 'var(--ua-brand-400)',
  500: 'var(--ua-brand-500)',
  600: 'var(--ua-brand-600)',
  700: 'var(--ua-brand-700)',
  800: 'var(--ua-brand-800)',
  900: 'var(--ua-brand-900)',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--ua-font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--ua-font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Primary accent (new semantic name)
        brand: blue,
        // Legacy palette names aliased to the professional blue so existing
        // className strings across the app re-theme with zero edits.
        violet: blue,
        indigo: blue,
        purple: blue,

        // Semantic surface/text tokens (prefer these going forward)
        bg:            'var(--ua-bg)',
        surface:       'var(--ua-surface)',
        'surface-soft':   'var(--ua-surface-soft)',
        'surface-raised': 'var(--ua-surface-raised)',
        sidebar:       'var(--ua-sidebar)',
        'text-primary':   'var(--ua-text-primary)',
        'text-secondary': 'var(--ua-text-secondary)',
        'text-muted':     'var(--ua-text-muted)',
      },
      borderRadius: {
        sm:      'var(--ua-radius-sm)',
        DEFAULT: 'var(--ua-radius-md)',
        md:      'var(--ua-radius-md)',
        lg:      'var(--ua-radius-lg)',
        xl:      'var(--ua-radius-xl)',
        '2xl':   'var(--ua-radius-2xl)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand':  'var(--ua-gradient-brand)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
