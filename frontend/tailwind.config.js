/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0e1a",
        surface: "#111827",
        panel: "#1a2236",
        border: "#2a3348",
        accent: "#3b82f6",
        danger: "#ef4444",
        warn: "#f59e0b",
        ok: "#10b981",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
