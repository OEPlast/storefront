import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
'xs': '480px',
'xxs': '360px',
'3xl': '1600px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
          colors: {
      transparent: 'transparent',
      green: {
        DEFAULT: '#D2EF9A',
      },
      black: {
        DEFAULT: '#1F1F1F',
      },
      red: {
        DEFAULT: '#DB4444',
      },
      purple: {
        DEFAULT: '#8684D4',
      },
      yellow: {
        DEFAULT: '#ECB018',
      },
      pink: {
        DEFAULT: '#F4407D',
      },
      'secondary': '#696C70',
      'secondary2': '#A0A0A0',
      'white': '#ffffff',
      'surface': '#F7F7F7',
      'success': '#3DAB25',
      'line': '#E9E9E9',
      'outline': 'rgba(0, 0, 0, 0.15)',
      'surface2': 'rgba(255, 255, 255, 0.2)',
      'surface1': 'rgba(255, 255, 255, 0.1)',
    },
    },
    container: {
      padding: {
        DEFAULT: '16px',
      },
    },

  },
  plugins: [],
}
export default config
