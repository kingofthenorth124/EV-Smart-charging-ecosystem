/**
 * Camel Mobility design tokens — synced from artifacts/web/src/index.css.
 * HSL values from the web's :root and .dark blocks converted to hex.
 *
 * Primary identity: deep green #0F4C35 · amber #F0A500
 */

const colors = {
  light: {
    // Legacy aliases
    text: "#1A1910",
    tint: "#0F4C35",

    // Core surfaces
    background: "#F5F5EE", // 60 7% 96%
    foreground: "#1A1910", // 45 6% 10%

    // Cards / elevated surfaces
    card: "#FFFFFF",
    cardForeground: "#1A1910",

    // Primary — deep forest green
    primary: "#0F4C35", // 157 67% 18%
    primaryForeground: "#FFFFFF",

    // Secondary
    secondary: "#E3EDE8", // 150 20% 92%
    secondaryForeground: "#144033",

    // Muted
    muted: "#EDEDEA", // 60 6% 93%
    mutedForeground: "#706E63", // 48 4% 44%

    // Accent — warm amber tint
    accent: "#FBF0D0", // 41 90% 92%
    accentForeground: "#7A4A10", // 39 85% 28%

    // Destructive
    destructive: "#8C2020", // 0 57% 41%
    destructiveForeground: "#FFFFFF",

    // Borders / inputs
    border: "#E0DDD7", // 45 6% 88%
    input: "#E0DDD7",

    // Brand amber (buttons, highlights)
    amber: "#F0A500",
    amberLight: "#FFF3CC",
  },

  dark: {
    // Legacy aliases
    text: "#EEEDE8",
    tint: "#347A55",

    // Core surfaces
    background: "#0C1614", // 160 25% 7%
    foreground: "#EEEDE8", // 60 8% 93%

    // Cards
    card: "#101F1B", // 159 22% 10%
    cardForeground: "#EEEDE8",

    // Primary — lighter green for dark mode
    primary: "#347A55", // 152 45% 38%
    primaryForeground: "#FFFFFF",

    // Secondary
    secondary: "#172521", // 157 25% 16%
    secondaryForeground: "#D3E5DC", // 150 25% 88%

    // Muted
    muted: "#172521",
    mutedForeground: "#808878",

    // Accent
    accent: "#2A3A20",
    accentForeground: "#E8C080",

    // Destructive
    destructive: "#BD3333", // 0 55% 48%
    destructiveForeground: "#FFFFFF",

    // Borders / inputs
    border: "#1A2C25", // 158 18% 18%
    input: "#1A2C25",

    // Brand amber (same in dark)
    amber: "#F0A500",
    amberLight: "#3A2D00",
  },

  // Shared — matches web --radius: 0.5rem (8px)
  radius: 8,
} as const;

export default colors;
