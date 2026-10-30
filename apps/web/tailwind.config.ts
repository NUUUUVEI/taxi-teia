import type { Config } from 'tailwindcss'

// Colours are CSS variables (see globals.css) so opacity modifiers like
// `text-ink/60` keep working.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        panel: token('panel'),
        field: token('field'),
        ink: token('ink'),
        'on-taxi': token('on-taxi'),
        line: token('line'),
        taxi: {
          DEFAULT: token('taxi'),
          light: token('taxi-light'),
          deep: token('taxi-deep'),
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
