import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F0F0F',
        surface: '#1A1A1A',
        surface2: '#242424',
        'border-custom': '#2E2E2E',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        'accent-orange': '#FF6B2B',
        'accent-blue': '#3B82F6',
        'accent-yellow': '#EAB308',
        'accent-green': '#22C55E',
        'accent-red': '#EF4444',
      },
    },
  },
  plugins: [],
}

export default config
