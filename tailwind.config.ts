import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172436',
        muted: '#64748b',
        canvas: '#f6f8fb',
        brand: '#163b63',
        accent: '#bd8b45',
      },
    },
  },
  plugins: [],
} satisfies Config;
