/**
 * `nf/no-raw-spacing`
 *
 * The mechanical half of the spacing scale, and the reason it will still be a
 * scale in six months.
 *
 * COLOUR IS THE PRECEDENT. Raw hex was cleaned out of this codebase once
 * before, entirely by hand, and it grew straight back: ~250 literals in one
 * stylesheet, one blue repeated 68 times. It only stopped growing when
 * `nf/no-raw-colour` started failing the build on the branch that introduced
 * it. A rule written in a document is a rule that holds while the person who
 * wrote it is reading the diff.
 *
 * Spacing was worse than colour ever was, because there was nothing to comply
 * WITH. Measured across 664 files under `apps/web/src` before this rule:
 *
 *   34 distinct raw Tailwind steps, 4,115 uses
 *      -px -1.5 -1 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5 6 7 8 9 10 11 12 14 16 20 24 28
 *   19 distinct arbitrary bracket escapes, 43 uses
 *      p-[0.4rem] gap-[0.55rem] mt-[1.9rem] pl-[3.25rem] p-[2.375rem]
 *   47 distinct literal values across 70 declarations in the stylesheets
 *
 * Roughly four thousand one hundred spacing decisions taken against fifty
 * three different answers, none of them comparable to any other. That is the
 * root cause of the oldest complaint on this product - that it feels choked,
 * jam-packed and different screen to screen - and no amount of per-screen
 * tuning can fix it, because the next screen still has nothing to agree with.
 *
 * WHAT IS AN ERROR:
 *
 *   1. A numeric Tailwind spacing step   p-4  mt-12  gap-3  space-y-8  -mx-5
 *   2. An arbitrary spacing bracket      p-[0.4rem]  gap-[0.55rem]
 *
 * ...on the padding, margin and gap families only. Use the scale:
 *
 *   ROLES, and reach for these first, because they say what the space is FOR:
 *     py-section  mt-section-tight  mt-block  mt-heading  gap-group  gap-row
 *     gap-inline  gap-inline-tight  px-gutter  p-card  p-card-lg  p-card-sm
 *     p-cell
 *   RUNGS, for what the roles do not cover:
 *     3xs 2xs xs sm md lg xl 2xl 3xl 4xl 5xl
 *
 * WHAT IT DELIBERATELY DOES NOT SEE.
 *
 * POSITION IS NOT SPACING. `top-2`, `inset-x-4`, `-left-16` place an element
 * against its container's edges; they are not the rhythm between two pieces of
 * content and forcing them onto a content scale would be a category error. Same
 * for `w-`, `h-` and `size-`, which are dimensions.
 *
 * ZERO IS NOT A SPACING DECISION. `p-0`, `mt-0`, `gap-0` all pass. There is
 * exactly one way to write no space and nobody ever disagreed about it.
 *
 * `-px` PASSES, because a 1px offset is a HAIRLINE rather than a gap: `-ml-px`
 * exists to pull an element back over a 1px border so the two lines land on
 * each other. Putting that on a 4px content scale would misalign it by three
 * pixels, which is the whole point of the utility.
 *
 * A `calc()` or `env()` bracket passes. `pb-[calc(2.5rem+env(safe-area-inset-bottom))]`
 * is answering the hardware, not choosing a rhythm.
 *
 * It walks string literals and template chunks in the AST, so COMMENTS ARE
 * INVISIBLE TO IT. That is intentional and load-bearing, exactly as in
 * `no-raw-colour`: half the value of this codebase is in comments that quote
 * the literal they replaced, and a rule that punished you for explaining
 * yourself would be turned off inside a week.
 *
 * THE ESCAPE HATCH IS A COMMENT, NOT A CONFIG ENTRY. An illustration measured
 * against a drawn radius, or a value that has to match a third party's own
 * geometry, is real. Those sites carry an `eslint-disable-next-line
 * nf/no-raw-spacing` with the reason on the same line, which puts the argument
 * next to the code instead of in a list somewhere nobody reads.
 */

/**
 * The families that express the space BETWEEN and AROUND content. Position and
 * dimension utilities are deliberately absent; see the header.
 */
const PROPS = [
  "p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe",
  "m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me",
  "gap", "gap-x", "gap-y",
  "space-x", "space-y",
].join("|");

/**
 * A numeric step: `p-4`, `mt-1.5`, `-mx-5`, `sm:gap-y-2`.
 *
 * `0` is excluded in the alternation rather than filtered afterwards, so
 * `p-0` never reports and `p-0.5` still does.
 */
const NUMERIC_STEP = new RegExp(
  String.raw`(?:^|[\s"'\`:\[{])-?(?:${PROPS})-(?:0\.\d+|[1-9]\d*(?:\.\d+)?)(?![\w.\-\[])`,
);

/**
 * An arbitrary bracket: `p-[0.4rem]`, `gap-[2.375rem]`.
 *
 * `calc(` and `env(` are excused inside the bracket because those are the
 * safe-area and viewport answers, which no content scale can express.
 */
const ARBITRARY = new RegExp(
  String.raw`(?:^|[\s"'\`:\[{])-?(?:${PROPS})-\[(?![^\]]*(?:calc\(|env\())[^\]]+\]`,
);

const SCALE_HELP =
  "Use the spacing scale. Roles first, because they say what the space is " +
  "for: py-section, mt-section-tight, mt-block, mt-heading, gap-group, " +
  "gap-row, gap-inline, gap-inline-tight, px-gutter, p-card, p-card-lg, " +
  "p-card-sm, p-cell. Rungs for the rest: 3xs 2xs xs sm md lg xl 2xl 3xl 4xl " +
  "5xl. If nothing fits, add a role to packages/design-tokens rather than a " +
  "number here.";

const CHECKS = [
  {
    test: NUMERIC_STEP,
    id: "numeric-step",
    message:
      "Raw Tailwind spacing step. Tailwind's numeric scale is linear, so " +
      "neighbouring steps are indistinguishable and 34 of them ended up in " +
      "use across 4,115 call sites, which is why this product reads as " +
      "choked on one screen and loose on the next. " +
      SCALE_HELP,
  },
  {
    test: ARBITRARY,
    id: "arbitrary",
    message:
      "Arbitrary spacing value. A number chosen by eye at one call site " +
      "cannot be compared with the number chosen by eye at the next, which " +
      "is how 19 of these reached the tree. " +
      SCALE_HELP,
  },
];

/** @type {import("eslint").Rule.RuleModule} */
export const noRawSpacing = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Padding, margin and gap must come from the spacing scale, never " +
        "from a raw Tailwind step or an arbitrary bracket value.",
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

export default { rules: { "no-raw-spacing": noRawSpacing } };
