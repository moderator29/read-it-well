/**
 * `nf/no-raw-colour`
 *
 * The mechanical half of ADR-002. Nothing had ever enforced it, which is the
 * whole reason there was anything to enforce: the last platform-wide audit
 * found ~250 raw colour literals in one stylesheet, six copies of the same
 * hard-coded gradient array, and roughly seventy component-level reads of the
 * layer-1 palette. All of it was cleaned once before and all of it grew back,
 * because a rule written in a document is a rule that only holds while the
 * person who wrote it is reading the diff.
 *
 * Four things are errors:
 *
 *   1. A raw hex colour            #0C39EF, #fff
 *   2. A raw functional colour     rgb(...), rgba(...), hsl(...), hsla(...)
 *   3. A Tailwind palette class    bg-indigo-500, text-slate-400, ring-rose-300
 *      including the achromatic ones, bg-black/45 and text-white/70, which are
 *      the single most common way a dark-only treatment gets into the tree.
 *   4. A layer-1 token reference   var(--nf-electric-300), --nf-ink-950
 *
 * WHAT IT DELIBERATELY DOES NOT SEE.
 *
 * It walks string literals and template chunks in the AST, so comments are
 * invisible to it. That is intentional and load-bearing: half the value of
 * this codebase is in comments that quote the literal they replaced, and a
 * rule that punished you for explaining yourself would be turned off inside a
 * week. `--nf-radius-*`, `--nf-elev-*` and every layer-2 name pass, because
 * this rule is about COLOUR PROVENANCE, not about arbitrary values.
 *
 * THE ESCAPE HATCH IS A COMMENT, NOT A CONFIG ENTRY. Third-party brand marks
 * are real and cannot be tokenised: Google's four colours and Apple's badge
 * gradient are theirs. Those sites carry an `eslint-disable-next-line
 * nf/no-raw-colour` with the reason on the same line, which puts the argument
 * next to the code instead of in a list somewhere nobody reads.
 */

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;
const FUNCTIONAL = /\b(?:rgba?|hsla?)\s*\(/;

/** Tailwind's default palette families. None of these is a Vallo colour. */
const FAMILIES = [
  "slate", "gray", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
].join("|");

/** Utilities that can carry a colour. */
const PROPS = [
  "bg", "text", "border", "ring", "outline", "divide", "shadow",
  "from", "via", "to", "fill", "stroke", "decoration", "accent",
  "caret", "placeholder",
].join("|");

const PALETTE_CLASS = new RegExp(
  String.raw`(?:^|[\s"'\`:\[])(?:${PROPS})-(?:${FAMILIES})-\d{2,3}\b`,
);

/**
 * `bg-black/45` and `text-white/70`. Separated from the palette families
 * because they are a different mistake with a different fix: a palette class
 * is usually someone reaching for a colour we do not have, while black and
 * white are almost always a dark-only treatment that will invert in daylight.
 */
const ACHROMATIC_CLASS = new RegExp(
  String.raw`(?:^|[\s"'\`:\[])(?:${PROPS})-(?:black|white)(?:\/\d{1,3})?\b`,
);

/** Layer 1. The raw palette ramps in tokens.css, which components may not read. */
const LAYER_ONE = /--nf-(?:ink|mist|royal|electric|cyan|crimson|emerald|rose|sky)-\d{2,3}\b/;

const CHECKS = [
  {
    test: HEX,
    id: "hex",
    message:
      "Raw hex colour. Use a layer-2 token, e.g. var(--nf-content-primary). " +
      "If no token fits the job, add one to packages/design-tokens rather than " +
      "hard coding here: a literal cannot follow the theme, and dark is only " +
      "the default, not the only theme.",
  },
  {
    test: FUNCTIONAL,
    id: "functional",
    message:
      "Raw rgb()/hsl() colour. Use a layer-2 token. A literal cannot follow " +
      "the theme, and this is how dark-only treatments reach daylight.",
  },
  {
    test: PALETTE_CLASS,
    id: "palette-class",
    message:
      "Tailwind palette colour class. The Vallo palette is one blue family " +
      "plus emerald for success and rose for error; nothing else exists. Use a " +
      "token utility, e.g. text-[var(--nf-content-secondary)].",
  },
  {
    test: ACHROMATIC_CLASS,
    id: "achromatic-class",
    message:
      "bg-black/text-white/border-white class. This is a dark-only treatment " +
      "and it inverts in the light theme. Use --nf-content-on-brand on a brand " +
      "fill, the --nf-*-on-media family over photography, or " +
      "--nf-overlay-backdrop behind an overlay.",
  },
  {
    test: LAYER_ONE,
    id: "layer-one",
    message:
      "Layer-1 palette token in a component (ADR-002). Components read layer 2 " +
      "only. --nf-electric-300 in particular usually wants --nf-content-link, " +
      "--nf-focus-ring, --nf-status-verified, --nf-rating or " +
      "--nf-brand-secondary, all of which already carry a daylight value.",
  },
];

/** @type {import("eslint").Rule.RuleModule} */
export const noRawColour = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Colour must come from the layer-2 semantic tokens, never from a " +
        "literal, a Tailwind palette class or the layer-1 palette.",
    },
    schema: [],
    messages: Object.fromEntries(CHECKS.map((c) => [c.id, "{{ detail }}"])),
  },
  create(context) {
    /** Report the first check a piece of text trips, so one bad class is one error. */
    function inspect(node, text) {
      if (typeof text !== "string" || text.length === 0) return;
      for (const check of CHECKS) {
        if (check.test.test(text)) {
          context.report({ node, messageId: check.id, data: { detail: check.message } });
          return;
        }
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") inspect(node, node.value);
      },
      TemplateElement(node) {
        inspect(node, node.value.raw);
      },
    };
  },
};

export default { rules: { "no-raw-colour": noRawColour } };
