/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#09090b",
        panel: "#18181b",
        "panel-hover": "#27272a",
        border: "#27272a",
        "border-subtle": "#1f1f23",
        accent: "#8b5cf6",
        "accent-muted": "#7c3aed",
        muted: "#71717a",
        "muted-foreground": "#a1a1aa",
        // Node color palette
        node: {
          purple: "#8b5cf6",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          green: "#10b981",
          yellow: "#f59e0b",
          orange: "#f97316",
          red: "#ef4444",
          pink: "#ec4899",
          slate: "#64748b",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Inter", "DM Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-sm": "0 0 10px -3px rgba(139, 92, 246, 0.3)",
        glow: "0 0 20px -5px rgba(139, 92, 246, 0.4)",
        "glow-lg": "0 0 30px -5px rgba(139, 92, 246, 0.5)",
        node: "0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        "node-hover":
          "0 8px 30px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateX(10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
