/**
 * `nf/no-arbitrary-font-size`
 *
 * THE THIRD RULE, AND IT DID NOT EXIST.
 *
 * This is worth stating plainly because of how it was found. The sprint
 * document, the brief handed to the workstream and the header of
 * `eslint.config.mjs` all referred to "the three design-system rules" and to
 * `nf/no-arbitrary-font-size` by name. There were two. The rules directory held
 * `no-raw-colour.mjs` and `no-raw-spacing.mjs`, the config registered those two,
 * and the type scale had nothing watching it at all.
 *
 * Nobody lied. A rule got planned, got written into three documents as though
 * it had landed, and never got typed, and for as long as everyone believed the
 * count was three, the one number that would have shown otherwise - how many
 * font-size violations lint reports - was zero for the most reassuring possible
 * reason. That is the same failure mode as the `.nf-feedtabs` bug this rule's
 * sibling check exists for: a thing that reads as working because the only
 * signal it produces when broken is silence.
 *
 * WHAT THE SILENCE WAS COVERING, counted across `apps/web/src`:
 *
 *   986 arbitrary bracket sizes     text-[0.8125rem]  text-[1.0625rem]
 *       957 in rem, 8 in px, 21 in em, across 45 distinct values
 *   184 Tailwind named steps        text-xs  text-sm  text-base  text-lg  text-xl
 *       which is a SECOND type scale, Tailwind's, running beside ours
 *
 * Roughly 1,170 type decisions against twelve rungs, and the four most common
 * arbitrary values - 0.8125rem, 0.875rem, 0.75rem and 0.9375rem - are 13px,
 * 14px, 12px and 15px. Three of those four ARE rungs. They were typed as
 * literals beside a token that already held them, 705 times, because nothing
 * said not to and because a scale nobody can name is a scale nobody uses.
 *
 * WHAT IS A VIOLATION:
 *
 *   1. An absolute bracket size     text-[0.8125rem]  text-[15px]  text-[11pt]
 *   2. A Tailwind named step        text-xs  text-sm  text-base  text-lg
 *      text-xl through text-9xl, with or without a variant prefix
 *
 * Both report the rung they should be, worked out from the value, because a
 * message that says "use the scale" to somebody who has just typed 0.8125rem is
 * a message that does not know what it is looking at. The scale, in the units a
 * reader sees, at a 16px root:
 *
 *   .nf-overline    12   --nf-text-overline
 *   .nf-caption     13   --nf-text-caption
 *   .nf-body-sm     14   --nf-text-body-sm
 *   .nf-body        16   --nf-text-body
 *   .nf-lede        17   --nf-text-body-lg
 *   .nf-h4          20   --nf-text-h4
 *   .nf-h3 .nf-h2 .nf-h1 .nf-display  fluid clamps, chosen by ROLE
 *
 * The named classes come first in every message, ahead of the tokens, because
 * they carry the line height and the colour with them. A size chosen without
 * its leading is half a decision: `--nf-text-body-sm` on its own leaves the
 * author to invent a `leading-*` and the next author to invent a different one,
 * which is how the type ended up with 45 sizes and no rhythm.
 *
 * WHAT IT DELIBERATELY DOES NOT SEE.
 *
 * RELATIVE SIZES PASS. `text-[0.62em]`, `text-[80%]` and `text-[1lh]` are not
 * scale decisions: they are a proportion of a size that has already been chosen
 * from the scale, which is the correct way to draw the magnitude suffix on an
 * amount, the superscript on a currency symbol or a sub-label inside a chip.
 * Forcing those onto an absolute ladder would BREAK them, because the whole
 * point is that they track the parent. This is the same distinction
 * `no-raw-spacing` makes when it lets `calc()` and `env()` through: a value
 * answering something other than rhythm is not a rhythm decision.
 *
 * `text-[var(--nf-text-caption)]` passes, obviously, and so does every colour
 * utility in the `text-` family: the pattern requires a number and a unit, so
 * `text-[var(--nf-content-muted)]` and `text-center` never match.
 *
 * COMMENTS ARE INVISIBLE TO IT, because it walks string literals and template
 * chunks in the AST. Same as its two siblings, and load-bearing for the same
 * reason: this codebase explains itself by quoting the value it replaced, and a
 * rule that punished you for that would be switched off inside a week.
 *
 * THE ESCAPE HATCH IS A COMMENT, NOT A CONFIG ENTRY. There is exactly one real
 * exception in the tree today and it is a good illustration of why the hatch
 * has to exist: `components/ui/Field.tsx` carries
 * `pointer-coarse:text-[16px]`, which is not a type decision at all. Mobile
 * Safari zooms the viewport whenever a focused control's font-size is under
 * 16px, so that number is a THRESHOLD in the platform's own units, and rounding
 * it onto our scale would either do nothing or reintroduce the zoom. It carries
 * an `eslint-disable-next-line` with the reason on it, which puts the argument
 * next to the code instead of in a list somewhere nobody reads.
 */

/**
 * An absolute bracket size: `text-[0.8125rem]`, `sm:text-[15px]`.
 *
 * The unit list is the absolute ones only. See the header for why `em`, `%`,
 * `lh`, `ex` and `ch` are excluded rather than overlooked.
 */
const ABSOLUTE_BRACKET = new RegExp(
  String.raw`(?:^|[\s"'\`:\[{])text-\[(\d*\.?\d+)(rem|px|pt|pc|in|cm|mm|Q)\]`,
);

/** Tailwind's own type scale, which is not ours. `text-xs` .. `text-9xl`. */
const NAMED_STEP = new RegExp(
  String.raw`(?:^|[\s"'\`:\[{])text-(xs|sm|base|lg|xl|[2-9]xl)(?![\w-])`,
);

/** The fixed rungs, in CSS pixels at a 16px root. The fluid ones cannot be
 *  matched against a single number and are handled in prose below. */
const RUNGS = [
  { px: 12, klass: ".nf-overline", token: "--nf-text-overline" },
  { px: 13, klass: ".nf-caption", token: "--nf-text-caption" },
  { px: 14, klass: ".nf-body-sm", token: "--nf-text-body-sm" },
  { px: 16, klass: ".nf-body", token: "--nf-text-body" },
  { px: 17, klass: ".nf-lede", token: "--nf-text-body-lg" },
  { px: 20, klass: ".nf-h4", token: "--nf-text-h4" },
];

/** Absolute units, in CSS pixels. Anything not here is not matched at all. */
const PER_UNIT_PX = { rem: 16, px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, Q: 96 / 101.6 };

/**
 * The advice, worked out from the value rather than recited.
 *
 * Above the top fixed rung there is deliberately no nearest-match, because the
 * headings are `clamp()` and a heading picked by matching its desktop pixel
 * count is a heading that will be wrong on a phone. Those are chosen by what
 * the text IS.
 */
function adviseFor(px) {
  if (px > 22) {
    return (
      `${px}px is heading size. The heading rungs are fluid clamps, so pick one ` +
      "by ROLE and not by matching a number: .nf-display for the one headline a " +
      "page is built around, then .nf-h1, .nf-h2, .nf-h3, .nf-h4. A clamp is " +
      "already the right size on a phone and on a desktop; a literal is right on " +
      "exactly one of them."
    );
  }
  if (px < 12) {
    return (
      `${px}px is below the floor of the scale. 12px is the smallest type in ` +
      "this product and .nf-overline is it. Below that, tracked and uppercase, " +
      "it stops being small text and becomes texture: the audit's words for the " +
      "state this scale was built to end were \"the least readable text in the " +
      "product\", and it was 11.5px."
    );
  }
  let best = RUNGS[0];
  for (const rung of RUNGS) {
    if (Math.abs(rung.px - px) < Math.abs(best.px - px)) best = rung;
  }
  const exact = best.px === px;
  return (
    `${px}px ${exact ? "IS" : "rounds to"} ${best.px}px, which is ` +
    `\`${best.klass}\` (\`var(${best.token})\`). ` +
    (exact
      ? "The rung already held this number; it was typed out beside it."
      : "If the difference matters, say why in a comment and disable the line; " +
        "if it does not, and at this size it almost never does, take the rung.") +
    " Prefer the class over the token: it carries the line height and the ink " +
    "with it, and a size chosen without its leading is half a decision."
  );
}

/** Tailwind's own steps, in CSS pixels, for the same worked advice. */
const TAILWIND_PX = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
  "2xl": 24, "3xl": 30, "4xl": 36, "5xl": 48,
  "6xl": 60, "7xl": 72, "8xl": 96, "9xl": 128,
};

/** @type {import("eslint").Rule.RuleModule} */
export const noArbitraryFontSize = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Font size must come from the twelve step type scale, never from an " +
        "arbitrary bracket value or Tailwind's own parallel type scale.",
    },
    schema: [],
    messages: {
      bracket: "{{ detail }}",
      "named-step": "{{ detail }}",
    },
  },
  create(context) {
    function inspect(node, text) {
      if (typeof text !== "string" || text.length === 0) return;

      const bracket = ABSOLUTE_BRACKET.exec(text);
      if (bracket) {
        const px = Math.round(Number(bracket[1]) * PER_UNIT_PX[bracket[2]] * 100) / 100;
        context.report({
          node,
          messageId: "bracket",
          data: {
            detail:
              `Arbitrary font size \`text-[${bracket[1]}${bracket[2]}]\`. ` +
              "986 of these reached the tree across 45 distinct values, against " +
              "a twelve rung scale, which is why no two screens in this product " +
              `agree about how big small text is. ${adviseFor(px)}`,
          },
        });
        return;
      }

      const named = NAMED_STEP.exec(text);
      if (named) {
        const px = TAILWIND_PX[named[1]];
        context.report({
          node,
          messageId: "named-step",
          data: {
            detail:
              `\`text-${named[1]}\` is a step of TAILWIND's type scale, not ` +
              "this product's. Two scales running side by side is worse than " +
              "either one alone, because a reader cannot tell from the class " +
              `which ladder it belongs to. ${adviseFor(px)}`,
          },
        });
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

export default { rules: { "no-arbitrary-font-size": noArbitraryFontSize } };
