import type { Config } from "tailwindcss";

/**
 * KAO MING CRM — custom token layer.
 * Instrument, not dashboard. Six-value palette derived from the KMC mark.
 * The brand red is reserved for identity + meaningful state only.
 * If a value carries no meaning, it is grey.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Replace the default palette wholesale — no raw Tailwind colours.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      ink: "#15181B", // text, borders, the nameplate plate surface
      paper: "#EDEFF1", // app background — cool shop-metal, not cream
      surface: "#FFFFFF", // cards / table fills sitting on paper
      "grey-line": "#CDD2D6", // rules, cell borders, dividers, disabled
      "grey-mute": "#697077", // labels, secondary text, captions
      kmc: {
        // brand red — identity + state only, never decorative
        DEFAULT: "#BE1E2D",
        ink: "#8E1621", // pressed / dark rule on the nameplate
        wash: "#F7E4E6", // faint selected-row tint
      },
      alert: {
        // the one alert colour — the control-panel warning light
        DEFAULT: "#B26A00",
        wash: "#FBEED6",
      },
      // mark-only accents, used solely inside the KMC logo SVG
      peak: "#6BA6D6",
      script: "#3AA0A8",
    },
    borderRadius: {
      none: "0",
      sm: "2px", // a machined chamfer, not zero, not pill
      DEFAULT: "3px",
      md: "4px",
      full: "9999px",
    },
    fontFamily: {
      sans: ["var(--font-plex-sans)", "var(--font-noto-tc)", "system-ui", "sans-serif"],
      mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
    },
    fontSize: {
      "2xs": ["11px", { lineHeight: "14px", letterSpacing: "0.04em" }],
      xs: ["12px", { lineHeight: "16px" }],
      sm: ["13px", { lineHeight: "18px" }],
      base: ["14px", { lineHeight: "20px" }],
      lg: ["16px", { lineHeight: "22px" }],
      xl: ["18px", { lineHeight: "24px", letterSpacing: "-0.01em" }],
      "2xl": ["22px", { lineHeight: "28px", letterSpacing: "-0.015em" }],
    },
    extend: {
      spacing: {
        row: "32px", // dense table row height — built to scan 50, not 5
      },
      boxShadow: {
        plate: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
        pop: "0 1px 2px 0 rgba(21,24,27,0.08), 0 2px 8px -2px rgba(21,24,27,0.10)",
      },
      fontFeatureSettings: {
        tnum: '"tnum" 1, "cv05" 1',
      },
    },
  },
  plugins: [],
};

export default config;
