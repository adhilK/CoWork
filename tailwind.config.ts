import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./emails/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand / Sidebar ─────────────────────────────────────
        sidebar: {
          DEFAULT: "#0D1712",
          dark: "#08120D",
          border: "#1A2E20",
          text: "#D1FAE5",
          muted: "#6EE7A0",
          hover: "rgba(34,197,94,0.08)",
          active: "rgba(34,197,94,0.15)",
        },
        // ── Accent Greens ────────────────────────────────────────
        brand: {
          DEFAULT: "#22C55E",
          bright: "#4ADE80",
          dark: "#15803D",
          muted: "#86EFAC",
          faint: "#DCFCE7",
        },
        // ── Workspace ────────────────────────────────────────────
        workspace: {
          DEFAULT: "#F3F5F2",
          card: "#FFFFFF",
          surface: "#EAF7EE",
        },
        // ── Semantic ─────────────────────────────────────────────
        success: {
          DEFAULT: "#22C55E",
          light: "#DCFCE7",
          dark: "#15803D",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
          dark: "#B45309",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
          dark: "#B91C1C",
        },
        info: {
          DEFAULT: "#3B82F6",
          light: "#DBEAFE",
          dark: "#1D4ED8",
        },
        // ── shadcn tokens (CSS var mapping) ──────────────────────
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.06)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.10)",
        sidebar: "0 30px 60px rgba(0,0,0,0.25)",
        modal: "0 20px 60px rgba(0,0,0,0.20)",
        sm: "0 1px 3px rgba(0,0,0,0.06)",
        kpi: "0 2px 16px rgba(34,197,94,0.10)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #15803D 0%, #22C55E 50%, #4ADE80 100%)",
        "brand-gradient-subtle": "linear-gradient(135deg, rgba(21,128,61,0.08) 0%, rgba(34,197,94,0.12) 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #0D1712 0%, #08120D 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
