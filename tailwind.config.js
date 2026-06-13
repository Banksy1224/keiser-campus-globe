/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Keiser University brand palette (per brand guidelines)
        keiser: {
          navy: "#1A335A", // Primary — Keiser Dark Blue
          blue: "#3175CB", // Secondary blue
          gold: "#E8BC58", // Accent — Keiser Yellow
          flame: "#E8BC58", // alias used by the 3D flame monument / accents
          gray: "#BCBEC0", // neutral
          light: "#F2F2F2", // neutral light
        },
      },
      fontFamily: {
        // Body: Roboto (secondary font); Headings: Barlow Condensed (primary font)
        sans: ["Roboto", "system-ui", "Arial", "sans-serif"],
        display: ["'Barlow Condensed'", "Roboto", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};
