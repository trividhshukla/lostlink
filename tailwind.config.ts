import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          800: "#182420",
          900: "#0C1512",
          950: "#070E0C",
        },
        charcoal: {
          900: "#111827",
        },
        alabaster: "#f4f3ef",
        campus: {
          50: "#f4f7f5",
          100: "#e5ece7",
          200: "#cbdbcf",
          300: "#a3c1ab",
          400: "#74a081",
          500: "#4f825e",
          600: "#3b6848",
          700: "#30533b",
          800: "#274330",
          900: "#213728",
          950: "#0e1e14",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
