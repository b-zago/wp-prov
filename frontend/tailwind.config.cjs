/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        // App surfaces — a calmer, slightly-blue slate
        surface: {
          base: "#0b1020",
          raised: "#121830",
          hover: "#1a2142",
          sunken: "#080c1a",
        },
        line: {
          DEFAULT: "rgba(148, 163, 184, 0.12)",
          strong: "rgba(148, 163, 184, 0.22)",
        },
        ink: {
          DEFAULT: "#e6e9f2",
          muted: "#94a3b8",
          dim: "#64748b",
        },
        // Primary brand accent — teal/emerald gradient anchor
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34, 211, 238, 0.25), 0 6px 24px -6px rgba(34, 211, 238, 0.25)",
        card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 30px -15px rgba(0,0,0,0.6)",
      },
      borderRadius: {
        xl2: "14px",
      },
    },
  },
  plugins: [],
};
