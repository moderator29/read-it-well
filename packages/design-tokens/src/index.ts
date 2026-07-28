/**
 * TypeScript mirror of the CSS token layer.
 *
 * Use this only where a value must exist in JS (SVG gradient stops, canvas
 * drawing, chart series). For anything rendered as DOM, prefer the CSS custom
 * properties in `tokens.css` so theming keeps working.
 */

/** Semantic CSS custom property references, safe to drop into `style` props. */
export const token = {
  brandPrimary: "var(--nf-brand-primary)",
  brandPrimaryStrong: "var(--nf-brand-primary-strong)",
  brandSecondary: "var(--nf-brand-secondary)",
  brandAccent: "var(--nf-brand-accent)",

  modePersonal: "var(--nf-mode-personal)",
  modeAgent: "var(--nf-mode-agent)",
  modeAdmin: "var(--nf-mode-admin)",

  surfaceCanvas: "var(--nf-surface-canvas)",
  surfacePrimary: "var(--nf-surface-primary)",
  surfaceSecondary: "var(--nf-surface-secondary)",
  surfaceElevated: "var(--nf-surface-elevated)",
  surfaceRaised: "var(--nf-surface-raised)",

  contentPrimary: "var(--nf-content-primary)",
  contentSecondary: "var(--nf-content-secondary)",
  contentMuted: "var(--nf-content-muted)",

  borderSubtle: "var(--nf-border-subtle)",
  borderDefault: "var(--nf-border-default)",
  borderStrong: "var(--nf-border-strong)",

  stateSuccess: "var(--nf-state-success)",
  stateWarning: "var(--nf-state-warning)",
  stateError: "var(--nf-state-error)",
  stateInfo: "var(--nf-state-info)",
} as const;

/**
 * Literal hex values.
 *
 * Needed because SVG `<stop stop-color>` does not resolve `color-mix()` and
 * some browsers historically mishandled `var()` inside gradient stops.
 * These MUST be kept in step with layer 1 of `tokens.css`.
 */
export const palette = {
  ink950: "#06040E",
  ink900: "#0A0718",
  ink850: "#0F0B20",
  ink800: "#151029",
  ink750: "#1B1534",
  ink700: "#241D42",
  ink600: "#332A57",
  ink500: "#4A3F73",

  mist100: "#F7F5FF",
  mist200: "#E3DEF7",
  mist300: "#C4BCE4",
  mist400: "#9E95C4",
  mist500: "#7C739F",

  violet300: "#C4B5FD",
  violet400: "#A78BFA",
  violet500: "#8B5CF6",
  violet600: "#7C3AED",
  violet700: "#6D28D9",

  cyan400: "#22D3EE",
  cyan500: "#06B6D4",
  magenta400: "#F472B6",
  magenta500: "#EC4899",
  amber400: "#FBBF24",
  orange500: "#F97316",
  emerald400: "#34D399",
  rose400: "#FB7185",
  sky400: "#38BDF8",
} as const;

/**
 * Gradient ramps for the 3D signature object family.
 *
 * One ramp per semantic family so the whole icon set reads as one system
 * (Master Rule 28) instead of a pile of unrelated illustrations. Each ramp is
 * `[highlight, core, shadow]`, lit from the same upper left direction.
 */
export const iconRamp = {
  violet: ["#C4B5FD", "#8B5CF6", "#5B21B6"],
  magenta: ["#F9A8D4", "#EC4899", "#9D174D"],
  cyan: ["#67E8F9", "#22D3EE", "#0E7490"],
  amber: ["#FDE68A", "#FBBF24", "#B45309"],
  orange: ["#FDBA74", "#F97316", "#9A3412"],
  emerald: ["#6EE7B7", "#34D399", "#047857"],
  sky: ["#7DD3FC", "#38BDF8", "#0369A1"],
  rose: ["#FDA4AF", "#FB7185", "#9F1239"],
  slate: ["#CBD5E1", "#94A3B8", "#334155"],
} as const;

export type IconRampName = keyof typeof iconRamp;

/** The brand mark's iridescent ramp. Used only by the logo and AI surfaces. */
export const iridescentRamp = [
  { offset: "0%", color: palette.cyan400 },
  { offset: "32%", color: palette.violet400 },
  { offset: "64%", color: palette.magenta400 },
  { offset: "100%", color: palette.amber400 },
] as const;

export const duration = {
  instant: "var(--nf-duration-instant)",
  fast: "var(--nf-duration-fast)",
  base: "var(--nf-duration-base)",
  slow: "var(--nf-duration-slow)",
  deliberate: "var(--nf-duration-deliberate)",
} as const;

export const easing = {
  standard: "var(--nf-ease-standard)",
  entrance: "var(--nf-ease-entrance)",
  exit: "var(--nf-ease-exit)",
  spring: "var(--nf-ease-spring)",
} as const;
