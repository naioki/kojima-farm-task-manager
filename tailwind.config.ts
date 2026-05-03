import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Extend with farm-specific semantic colors if needed
      // e.g., colors: { farm: { primary: '#15803d' } }
    },
  },
  plugins: [],
}

export default config
