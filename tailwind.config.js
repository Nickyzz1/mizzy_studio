/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: v('bg'),
          subtle: v('bg-subtle'),
          card: v('bg-card'),
          hover: v('bg-hover'),
        },
        border: {
          DEFAULT: v('border'),
          strong: v('border-strong'),
        },
        text: {
          primary: v('text-primary'),
          secondary: v('text-secondary'),
          muted: v('text-muted'),
        },
        accent: {
          DEFAULT: v('accent'),
          hover: v('accent-hover'),
          soft: v('accent-soft'),
          fg: v('accent-fg'),
        },
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
        info: v('info'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
