import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090D16",
        surface: "#0F1420",
        surfaceHover: "#151B2B",
        border: "#1E2536",
        accent: {
          DEFAULT: "#10B981",
          light: "#22C55E",
          dark: "#0E9F71",
        },
        foreground: "#FFFFFF",
        muted: "#8B93A7",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        glow: "0 0 40px rgba(16, 185, 129, 0.15)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
