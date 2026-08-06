/**
 * What the styleguide renders, as data.
 *
 * Every name here is a real custom property from
 * `packages/design-tokens/src/tokens.css`, and the page paints each one by
 * using it rather than by printing a hex value. That distinction is the whole
 * point of the route: a swatch that hardcodes `#0B1220` is a picture of a
 * token, and it keeps looking right for months after the token itself moves. A
 * swatch whose background IS `var(--nf-surface-canvas)` cannot lie, and it
 * changes with the theme in front of you.
 *
 * The lists are deliberately not generated from the CSS at build time. A
 * generated page documents whatever exists, including a token somebody added
 * by accident; a written one documents what a person is meant to reach for,
 * and a name that disappears from the sheet shows up here as a swatch that
 * stops painting.
 */

export type Swatch = { name: string; note: string };

/** Surfaces, darkest to lightest in the dark theme. */
export const SURFACES: Swatch[] = [
  { name: "--nf-surface-canvas", note: "The page itself. Nothing sits behind it." },
  { name: "--nf-surface-primary", note: "Cards, sheets, the header. The default plane." },
  { name: "--nf-surface-secondary", note: "A panel inside a card, one step up." },
  { name: "--nf-surface-raised", note: "Something lifted: a menu, a popover." },
  { name: "--nf-surface-elevated", note: "The highest plane. Overlays and dialogs." },
  { name: "--nf-surface-inset", note: "A well. Reads as cut into the plane, not onto it." },
];

/** Text, in the order it should be reached for. */
export const CONTENT: Swatch[] = [
  { name: "--nf-content-max", note: "Maximum contrast. Headings that must not be missed." },
  { name: "--nf-content-primary", note: "Body text and anything a person reads to act." },
  { name: "--nf-content-secondary", note: "Supporting prose. Still comfortably readable." },
  { name: "--nf-content-muted", note: "Captions and counts. Never a sentence that matters." },
  { name: "--nf-content-on-brand", note: "Text sitting on a brand fill." },
];

export const BRAND: Swatch[] = [
  { name: "--nf-brand-primary", note: "The one blue. Primary actions and active states." },
  { name: "--nf-brand-primary-strong", note: "Pressed and hover, where the primary needs weight." },
  { name: "--nf-brand-primary-soft", note: "A brand tint behind content, never behind text alone." },
  { name: "--nf-brand-secondary", note: "The quieter blue, for supporting marks." },
  { name: "--nf-brand-accent", note: "The glow. Rings and highlights, never a fill." },
];

export const BORDERS: Swatch[] = [
  { name: "--nf-border-subtle", note: "Hairline dividers between rows." },
  { name: "--nf-border-default", note: "The edge of a card or a field." },
  { name: "--nf-border-strong", note: "An edge that has to be seen. Focus, selection." },
  { name: "--nf-border-brand", note: "A brand edge, for an active control." },
];

/**
 * State colours, each with the surface it is meant to sit on.
 *
 * They are paired here because they are only correct as a pair: the text
 * colour alone on a card background is not a state, it is a coloured word, and
 * every one of these was measured against its own surface rather than against
 * the page.
 */
export const STATES: { name: string; surface: string; label: string; note: string }[] = [
  {
    name: "--nf-state-success",
    surface: "--nf-state-success-surface",
    label: "Success",
    note: "Something completed. A confirmed booking, a settled payment.",
  },
  {
    name: "--nf-state-warning",
    surface: "--nf-state-warning-surface",
    label: "Warning",
    note: "Attention needed, nothing lost yet. A hold about to expire.",
  },
  {
    name: "--nf-state-error",
    surface: "--nf-state-error-surface",
    label: "Error",
    note: "Something failed or was refused, and it says what to do next.",
  },
  {
    name: "--nf-state-info",
    surface: "--nf-state-info-surface",
    label: "Info",
    note: "Context the reader did not ask for but benefits from.",
  },
];

/** Corner radii, smallest first. Rendered at a size where each is legible. */
export const RADII: Swatch[] = [
  { name: "--nf-radius-xs", note: "Tags and the smallest chips." },
  { name: "--nf-radius-sm", note: "Inputs and compact buttons." },
  { name: "--nf-radius-md", note: "Buttons, fields, small cards." },
  { name: "--nf-radius-lg", note: "Cards. The most common radius on the platform." },
  { name: "--nf-radius-xl", note: "Sheets and large panels." },
  { name: "--nf-radius-2xl", note: "Hero surfaces and the map frame." },
  { name: "--nf-radius-pill", note: "Fully round. Chips, badges, avatars." },
];
