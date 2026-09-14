/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // MII brand: navy + white only. A single tint/shade scale of the
        // same navy hue (no other hues) gives hierarchy without breaking
        // that rule -- text/sidebar at the dark end, borders/backgrounds
        // at the light end, white everywhere else.
        navy: {
          50: "#f4f6fa",
          100: "#e6e9f2",
          200: "#ccd2e4",
          300: "#a4aec9",
          400: "#7885a8",
          500: "#57648a",
          600: "#414d70",
          700: "#303a58",
          800: "#232d4b", // primary brand navy
          900: "#161d33",
          950: "#0c1120",
        },
      },
      fontFamily: {
        // Arial first, with the closest web-safe fallbacks so non-Windows/Mac
        // systems still render something near-identical.
        sans: ["Arial", "Helvetica", "ui-sans-serif", "sans-serif"],
      },
    },
  },
  plugins: [],
};
