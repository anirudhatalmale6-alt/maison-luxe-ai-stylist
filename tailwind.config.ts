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
        // Maison Luxe palette
        luxe: {
          ink: "#141414",
          gold: "#B08D57",
          "gold-soft": "#C7A876",
          ivory: "#F7F4EF",
          mist: "#EFEBE4",
          taupe: "#8A8178",
        },
        // Back-compat aliases (old brand-* usages map to the luxe palette)
        brand: {
          red: "#B08D57",
          dark: "#141414",
          light: "#F7F4EF",
          blue: "#EFEBE4",
          "blue-hover": "#E4DED4",
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', '"Cormorant Garamond"', "Georgia", '"Times New Roman"', "serif"],
        sans: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
        "typing-dots": "typing-dots 1.4s infinite ease-in-out",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(226, 24, 54, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(226, 24, 54, 0)" },
        },
        "typing-dots": {
          "0%, 80%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "40%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
