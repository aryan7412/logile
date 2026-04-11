/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Share Tech Mono'", "monospace"],
        vt: ["'VT323'", "monospace"],
        courier: ["'Courier Prime'", "monospace"],
      },
      colors: {
        bg: "#0a0800",
        surface: "#0f0d00",
        panel: "#110e00",
        border: "#2a2200",
        "border-bright": "#3d3000",
        accent: "#c8920a",
        "accent-dim": "#7a5800",
        "accent-bright": "#ffb92e",
        muted: "#4a3c10",
        text: "#d4a820",
        "text-dim": "#7a6018",
        "text-bright": "#ffe080",
        folder: "#e8a010",
        file: "#a8c840",
        orphan: "#d05030",
        success: "#60a840",
      },
      animation: {
        "fade-in": "fadeUp 0.18s ease-out",
        "slide-down": "slideDown 0.15s ease-out",
        "blink": "blink 1.1s step-end infinite",
      },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(3px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideDown: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        blink: { "0%,49%": { opacity: "1" }, "50%,100%": { opacity: "0" } },
      },
    },
  },
  plugins: [],
};
