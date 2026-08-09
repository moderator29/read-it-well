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

  surfaceInset: "var(--nf-surface-inset)",

  contentPrimary: "var(--nf-content-primary)",
  contentSecondary: "var(--nf-content-secondary)",
  contentSubtle: "var(--nf-content-subtle)",
  contentMuted: "var(--nf-content-muted)",
  contentOnBrand: "var(--nf-content-on-brand)",
  /** Ink for a surface running opposite to the theme. Not `contentOnBrand`. */
  contentInverse: "var(--nf-content-inverse)",

  borderSubtle: "var(--nf-border-subtle)",
  borderDefault: "var(--nf-border-default)",
  borderStrong: "var(--nf-border-strong)",
  borderBrand: "var(--nf-border-brand)",
  /** A rule inside a surface, not the edge of one. */
  divider: "var(--nf-divider)",

  interactiveHover: "var(--nf-interactive-hover)",
  interactiveActive: "var(--nf-interactive-active)",
  interactiveDisabled: "var(--nf-interactive-disabled)",

  stateSuccess: "var(--nf-state-success)",
  stateWarning: "var(--nf-state-warning)",
  stateError: "var(--nf-state-error)",
  stateInfo: "var(--nf-state-info)",

  contentLink: "var(--nf-content-link)",
  focusRing: "var(--nf-focus-ring)",
  rating: "var(--nf-rating)",
  statusVerified: "var(--nf-status-verified)",

  /* Deliberately theme independent: what is underneath is a photograph. */
  overlayMedia: "var(--nf-overlay-media)",
  overlayMediaStrong: "var(--nf-overlay-media-strong)",
  borderOnMedia: "var(--nf-border-on-media)",
  contentOnMedia: "var(--nf-content-on-media)",
  contentOnMediaMuted: "var(--nf-content-on-media-muted)",
  scrimMedia: "var(--nf-scrim-media)",

  mediaGroundFrom: "var(--nf-media-ground-from)",
  mediaGroundTo: "var(--nf-media-ground-to)",
  mediaSilhouette: "var(--nf-media-silhouette)",
  mediaMoon: "var(--nf-media-moon)",
} as const;

/**
 * Literal hex values.
 *
 * Needed because SVG `<stop stop-color>` does not resolve `color-mix()` and
 * some browsers historically mishandled `var()` inside gradient stops.
 * These MUST be kept in step with layer 1 of `tokens.css`.
 */
export const palette = {
  // These had drifted badly from layer 1, and in the worst possible direction:
  // every ink and mist below was still the PRE-REBRAND purple-tinted grey
  // (#06040E, #0A0718, #C4BCE4 and the rest are violet-leaning, not navy).
  // Anything drawing an SVG from this file was quietly painting the old brand.
  // They are now the exact values in tokens.css.
  ink950: "#010118",
  ink900: "#000020",
  ink850: "#000030",
  ink800: "#000040",
  ink750: "#000050",
  ink700: "#000060",
  ink600: "#000080",
  ink500: "#0010A0",

  mist100: "#FFFFFF",
  mist200: "#E4EAFF",
  mist300: "#D5DEFF",
  mist400: "#B4C0E0",
  mist500: "#8E9CC4",

  // The brand blues were missing from this mirror entirely, which is precisely
  // why the ramps below had to reach for violet and magenta to find anywhere to
  // travel to. With the real family present, they do not.
  royal400: "#4257EE",
  royal500: "#2B3FE0",
  royal600: "#2130C0",
  royal700: "#1A2596",
  electric300: "#5C7CFF",
  electric400: "#0C39EF",
  electric500: "#0010E0",
  electric600: "#0010D0",
  electric700: "#000F98",

  // THREE OF THESE HAD DRIFTED and are corrected here to the exact values in
  // tokens.css, which is the source of truth for layer 1:
  //   cyan400    was #22D3EE, tokens.css says #00C8FF
  //   emerald400 was #34D399, tokens.css says #10B981
  //   rose400    was #FB7185, tokens.css says #FF1744
  // Every one of the three was the lighter Tailwind default rather than the
  // value the product actually paints, so anything drawing an SVG state colour
  // from this file was a full step brighter than the same state drawn in CSS.
  cyan400: "#00C8FF",
  cyan500: "#06B6D4",
  emerald400: "#10B981",
  rose400: "#FF1744",
  sky400: "#38BDF8",

  // No orange, amber, gold, magenta or violet lives here, and that mirrors
  // tokens.css deliberately. The brand is one blue family; emerald and rose are
  // the only two hues outside it, and they earn it by meaning success and
  // error. A new accent should be a different depth of blue, never a new hue.
} as const;

/**
 * Gradient ramps for the 3D signature object family.
 *
 * One ramp per semantic family so the whole icon set reads as one system
 * (Master Rule 28) instead of a pile of unrelated illustrations. Each ramp is
 * `[highlight, core, shadow]`, lit from the same upper left direction.
 */
/*
 * Each ramp's middle stop is the palette entry it is named for, referenced
 * rather than retyped. Three of them held a stale literal of exactly the kind
 * `palette` above had just been corrected for, so a ramp called `emerald`
 * painted a core the emerald token had stopped being. A mirror that repeats a
 * value is a mirror that drifts.
 */
export const iconRamp = {
  cyan: ["#67E8F9", palette.cyan400, "#0E7490"],
  sky: ["#7DD3FC", palette.sky400, "#0369A1"],
  electric: ["#8FA5FF", palette.electric300, "#000F98"],
  royal: ["#7A8CF5", palette.royal500, "#1A2596"],
  emerald: ["#6EE7B7", palette.emerald400, "#047857"],
  rose: ["#FDA4AF", palette.rose400, "#9F1239"],
  slate: ["#CBD5E1", "#94A3B8", "#334155"],

  // The violet, magenta, amber and orange ramps are gone rather than repointed.
  // A ramp still named `amber` while holding a blue is the kind of thing someone
  // reads once, mistrusts, and then works around. Anything that reached for a
  // warm ramp now reaches for `electric` or `royal`, which is where the depth
  // that was wanted actually lives.
} as const;

export type IconRampName = keyof typeof iconRamp;

/**
 * The brand mark's iridescent ramp. Used only by the logo and AI surfaces.
 *
 * It used to run cyan, violet, magenta, amber: three of the four stops outside
 * the brand, in the ramp that carries the logo. Iridescence does not require
 * different hues, it requires travel, so this travels the blue family from the
 * bright cyan down into the deep neon and reads as one material catching light.
 */
export const iridescentRamp = [
  { offset: "0%", color: palette.cyan400 },
  { offset: "32%", color: palette.sky400 },
  { offset: "64%", color: palette.electric400 },
  { offset: "100%", color: palette.electric700 },
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
