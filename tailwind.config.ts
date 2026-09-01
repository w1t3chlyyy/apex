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
        background: "#000000",
        surface: "#0A0A0A",
        surfaceHover: "#171717",
        border: "#262626",
        foreground: "#FFFFFF",
        muted: "#A3A3A3",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "Montserrat", "system-ui", "-apple-system", "sans-serif"],
        heading: ["var(--font-unbounded)", "Unbounded", "system-ui", "sans-serif"],
        display: ["var(--font-unbounded)", "Unbounded", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
