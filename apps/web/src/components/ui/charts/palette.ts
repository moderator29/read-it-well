/**
 * The console's chart palette.
 *
 * ================================================================
 * EVERY VALUE HERE IS A ROLE NAME. NOT ONE OF THEM IS A RAMP RUNG.
 * ================================================================
 *
 * The first draft of this file read `--nf-electric-300` through `-700`
 * directly, and that was wrong for a reason worth writing down rather than
 * quietly fixing. Layer 1 is the RAW PALETTE: a rung is a colour. Layer 2 is
 * the ROLES: a role is a meaning. A component that reads a rung has pinned
 * itself to a colour, so when the ramp moves the component does not. That is
 * not hypothetical in this tree: the whole accent family was rotated onto the
 * measured 215.2 degrees two days ago, and every consumer reading a role
 * followed while every consumer reading a rung would have stayed violet.
 * `scripts/check-css-tokens.mjs` is right to fail it.
 *
 * ---------------------------------------------------------------------------
 * THE SEQUENTIAL RAMP, AND WHY IT IS ONE INK AND AN ALPHA RATHER THAN FIVE
 * TOKENS.
 *
 * A magnitude chart wants a sequential scale: one hue, monotonic in lightness,
 * light to dark. The obvious way to get five stops is five tokens, and the
 * obvious way to get five tokens is five rungs, which is the breach above. The
 * honest way is ONE role token carrying the hue and an alpha carrying the
 * position, composited against the chart's own surface. That is a genuine
 * single-hue sequential ramp by construction: same hue at every stop,
 * monotonic in lightness because alpha against a fixed ground is monotonic,
 * and it FOLLOWS A RETUNE, because the hue it steps is whatever the role
 * currently resolves to. It also inverts correctly for the paper twin with no
 * second definition, because the ground it composites against inverts.
 *
 * Five stops and no more. A sixth stop is not a darker blue; a chart that
 * wants one has too many bars and should fold its tail, which `Bars` does.
 *
 * ---------------------------------------------------------------------------
 * A FOUR SLOT CATEGORICAL PALETTE CANNOT BE BUILT INSIDE VALLO'S COLOUR LAW,
 * and that is a computed result re-run against this tree rather than taken on
 * trust. On the console's own dark surface (#000612):
 *
 *   #4D96FF, #00C8FF, #10B981, #FF6B8A
 *     colourblind separation  FAIL  rose to emerald, deuteranope delta E 3.6
 *     normal vision floor     FAIL  blue to cyan, delta E 13.3, floor is 15
 *
 * Every candidate spanning the plausible range fails on the same two pairs,
 * because the law gives us one blue family plus emerald, rose and cyan;
 * emerald against rose is the pair a deuteranope cannot separate and blue
 * against cyan is the pair nobody can. A fifth hue would fix it and is
 * forbidden, correctly. So the console's charts are single series on the ramp
 * above, plus ONE stacked status bar on the reserved status four, which is a
 * status palette and not a categorical one and ships a word beside every
 * colour.
 *
 * IF A CHART WANTS A COLOUR THAT IS NOT EXPRESSIBLE IN ROLE TOKENS, THE CHART
 * IS WRONG AND NOT THE LAW. Facet it, or fold the tail, or ask the magnitude
 * question instead of the identity question.
 *
 * ---------------------------------------------------------------------------
 * HANDED TO GROUP B, who own `packages/design-tokens`. Four layer-2 role
 * tokens would let this file drop its fallbacks. Each one is a MEANING and
 * none of them is a new colour:
 *
 *   --nf-chart-series   the ink of a measured quantity. Today: --nf-brand-primary
 *   --nf-chart-axis     the baseline a plot sits on.    Today: --nf-border-default
 *   --nf-chart-grid     a recessive rule inside a plot. Today: --nf-border-subtle
 *   --nf-chart-track    the unfilled part of a bar.     Today: --nf-well-fill
 *
 * Until they exist, each `var()` below falls back to the layer-2 role it would
 * be defined as, so the charts are correct today and mention no rung either
 * way. When the tokens land, the fallbacks become dead and can be deleted in
 * one pass over this file.
 */

/** The ink of a measured quantity. One hue; position is carried by alpha. */
export const CHART_SERIES = "var(--nf-chart-series, var(--nf-brand-primary))";

/**
 * Five stops of the sequential ramp, as alpha against the chart's surface.
 * Index 0 is the strongest, which is the largest value, because a magnitude
 * chart reads darkest-is-most.
 */
const RAMP_ALPHA = [1, 0.84, 0.69, 0.55, 0.42] as const;

/**
 * The ramp stop for a value's rank within a sorted set.
 *
 * COLOUR FOLLOWS MAGNITUDE, and on these charts the magnitude IS what the
 * colour encodes: the rows are sorted by it. A filter that removes a row
 * therefore legitimately repaints the survivors, because their rank really did
 * change and rank is the thing being drawn. That is the one case the "colour
 * follows the entity, never its rank" rule allows, and it is written down here
 * so nobody has to re-derive it.
 *
 * `rank` is 0 for the largest. Past the fifth the ramp holds rather than
 * inventing a sixth stop.
 */
export function rampAlpha(rank: number): number {
  const i = Math.min(Math.max(0, Math.trunc(rank)), RAMP_ALPHA.length - 1);
  return RAMP_ALPHA[i]!;
}

/**
 * The reserved status four, as the roles they already are everywhere else in
 * the product. NEVER REUSED AS A SERIES COLOUR: a blue bar on a magnitude
 * chart means "a lot" and a blue segment on a status bar means "in review",
 * and letting one slot carry both meanings is how an operator learns to
 * distrust the colours.
 */
export const STATUS_FILL = {
  pending: "var(--nf-state-warning)",
  review: "var(--nf-brand-primary)",
  approved: "var(--nf-state-success)",
  rejected: "var(--nf-state-error)",
} as const;

export type StatusKey = keyof typeof STATUS_FILL;

/** The recessive furniture. Roles, with role fallbacks. */
export const CHART_INK = {
  grid: "var(--nf-chart-grid, var(--nf-border-subtle))",
  axis: "var(--nf-chart-axis, var(--nf-border-default))",
  track: "var(--nf-chart-track, var(--nf-well-fill))",
} as const;

/**
 * THE CLEAN UNIFIED TONES (29 September 2026): the fills a segmented bar
 * (`StatusBar`) and the pipeline gauge (`Gauge`) paint a part with, by
 * meaning. Every one is a role; `neutral` is the muted ink, for the part
 * that carries no severity ("low", "draft").
 */
export type ChartTone = "brand" | "success" | "warning" | "error" | "info" | "neutral";

export const TONE_FILL: Record<ChartTone, string> = {
  brand: "var(--nf-brand-primary)",
  success: "var(--nf-state-success)",
  warning: "var(--nf-state-warning)",
  error: "var(--nf-state-error)",
  info: "var(--nf-state-info)",
  neutral: "var(--nf-content-muted)",
};

/** The unlit tick or empty track in both themes. */
export const TRACK_FILL = "var(--nf-surface-raised)";

/*
 * ---------------------------------------------------------------------------
 * THE CHART SYSTEM'S ROLES (B-26, 6 October 2026). The rules and the
 * validator results behind every value are in `chart-rules.ts`; this is only
 * where the values live.
 */

/**
 * The comparison or de-emphasised series: the previous period, "everything
 * else". Grey on purpose (the dataviz emphasis form), and always paired with
 * a pattern and a label, so it is never told apart by colour alone.
 */
export const CHART_CONTEXT = "var(--nf-chart-context, var(--nf-content-muted))";

/**
 * The ordinal ramp for the new primitives: three stops of the one series ink.
 * Validated in both themes (light end 2.69:1 on paper, 2.17:1 at night); the
 * five-stop `RAMP_ALPHA` above fails the night light-end floor and is kept
 * only for the console's ranked lists, which print a figure on every row.
 */
export const ORDINAL_ALPHA = [1, 0.78, 0.6] as const;

/** The ordinal stop for a rank, holding at the last rather than inventing a fourth. */
export function ordinalAlpha(rank: number): number {
  const i = Math.min(Math.max(0, Math.trunc(rank)), ORDINAL_ALPHA.length - 1);
  return ORDINAL_ALPHA[i]!;
}
