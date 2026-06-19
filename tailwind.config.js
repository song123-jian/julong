/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      screens: {
        'xs': '475px',
        'tab': '640px',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
