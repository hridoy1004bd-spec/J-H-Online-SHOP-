/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#0C7C72",
          dark: "#075E56",
          tint: "#EAF6F4"
        },
        orange: {
          DEFAULT: "#F2760C",
          tint: "#FEF1E4"
        },
        "orange-tint": "#FEF1E4",
        ink: "#1D2733",
        mute: "#6B7686",
        border: "#EEF1F0"
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Bengali", "system-ui", "sans-serif"],
        bengali: ["Noto Sans Bengali", "Inter", "system-ui", "sans-serif"]
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};
