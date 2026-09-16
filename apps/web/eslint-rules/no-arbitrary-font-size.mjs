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
 * A CLASS IS NOT A SIZE, AND THIS RULE ONCE SAID IT WAS.
 *
 * Every message used to end with "prefer the class over the token". It is good
 * advice for two of the six rungs and actively destructive for two others, and
 * the person migrating this rule's own output nearly found that out the
 * expensive way. `text-[0.75rem]` reports at 12px, the 12px rung is
 * `.nf-overline`, and `.nf-overline` does not mean "12px". It means 12px AND
 * uppercase AND tracked at 0.1em AND weight 650 AND a different ink. Taken at
 * its word across the 158 sites that reported it, that single sentence would
 * have UPPERCASED AND BOLDED 158 plain twelve-pixel labels, and every one of
 * those edits would have passed lint, type-check and test, because none of
 * those can see that a word changed shape.
 *
 * So the messages now separate the two things a rung offers:
 *
 *   the TOKEN is the size and nothing else      var(--nf-text-overline)
 *   the CLASS is the size plus a TREATMENT      .nf-overline
 *
 * and each message spells out what its class's treatment actually does, so the
 * choice is made by somebody who can see both halves. A plain label at 12px
 * wants the token. An overline wants the class. The rule cannot tell which of
 * those it is looking at - that is the eye's job - so it must not pretend to.
 *
 * The general form of the hazard is worth naming, because it outlives this
 * rule: a lint message is read by people doing hundreds of edits an hour and,
 * increasingly, by a codemod that will do them without reading anything else.
 * At that volume advice is executed rather than considered. A message that
 * names a replacement which is not equivalent is not a suggestion, it is a
 * redesign with a machine's throughput behind it.
 *
 * Two rungs are genuinely size-only - `.nf-body` and `.nf-body-sm` add a line
 * height and nothing more - and their messages say so, because a caveat that
 * fires on every rung equally is a caveat nobody reads by the third one.
 *
 * WHAT IS LEFT, AND WHY THE COUNT STOPS FALLING.
 *
 * Roughly 1,110 sites reported the day this rule was registered. What survives
 * migration is not unfinished work, it is the family this rule cannot answer
 * on its own, and it is three things:
 *
 *   BETWEEN RUNGS. 15px and 18px are real values in the tree and neither is a
 *   rung. Each one is a decision: move it to the rung above or below, or argue
 *   for a new rung. A scale gains a rung when a role needs it, not when a file
 *   does.
 *
 *   NOT TYPE AT ALL. `pointer-coarse:text-[16px]` in `components/ui/Field.tsx`
 *   is mobile Safari's zoom threshold in the platform's own units; an icon
 *   sized in `em` inside a button is a proportion of its label. These want a
 *   disable comment carrying the reason, not a rung.
 *
 *   WANTS THE CLASS, NOT THE TOKEN. A site reporting 12px that turns out to be
 *   a genuine overline should take `.nf-overline` and drop whatever separate
 *   `uppercase tracking-wide font-semibold` utilities it was carrying, which is
 *   a tidier edit than a swap and not one a codemod can make.
 *
 * None of those three is closed by a find and replace, and a remainder that
 * holds steady around a few dozen is this rule working, not this rule stalling.
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

/**
 * The fixed rungs, in CSS pixels at a 16px root. The fluid ones cannot be
 * matched against a single number and are handled in prose below.
 *
 * `carries` is what the CLASS does BEYOND setting the size, transcribed from
 * `app/css/typography.css` and kept in the same order the declarations appear
 * there. It is the load-bearing field: without it a message cannot honestly
 * name the class, because the class is not a synonym for the token. When one of
 * those six rules changes, this string changes with it.
 *
 * `role` is what the class's treatment is FOR, and it is what the message asks
 * the reader to check the text against. `sizeOnly` marks the two rungs whose
 * class adds a line height and nothing visible otherwise, so the message can
 * recommend them outright instead of spending the reader's attention on a
 * choice that does not exist.
 */
const RUNGS = [
  {
    px: 12,
    klass: ".nf-overline",
    token: "--nf-text-overline",
    carries:
      "UPPERCASES the text, tracks it at 0.1em, sets weight 650 and changes " +
      "the ink to --nf-content-subtle",
    role: "a section label sitting above a block, shouting quietly",
  },
  {
    px: 13,
    klass: ".nf-caption",
    token: "--nf-text-caption",
    carries: "sets a 1.5 line height and drops the ink to --nf-content-muted",
    role: "a caption or a secondary note, deliberately quieter than its subject",
  },
  {
    px: 14,
    klass: ".nf-body-sm",
    token: "--nf-text-body-sm",
    carries: "sets a 1.55 line height",
    role: "small body copy",
    sizeOnly: true,
  },
  {
    px: 16,
    klass: ".nf-body",
    token: "--nf-text-body",
    carries: "sets a 1.6 line height",
    role: "body copy",
    sizeOnly: true,
  },
  {
    px: 17,
    klass: ".nf-lede",
    token: "--nf-text-body-lg",
    carries: "sets a 1.62 line height and drops the ink to --nf-content-secondary",
    role: "the standfirst paragraph under a heading",
  },
  {
    px: 20,
    klass: ".nf-h4",
    token: "--nf-text-h4",
    carries:
      "switches the face to --nf-font-display, sets a 1.35 line height, sets " +
      "weight 600 and tightens the tracking",
    role: "a heading",
  },
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
      "this product: `var(--nf-text-overline)` for the size, and `.nf-overline` " +
      "ONLY if the text is a section label, because that class also uppercases " +
      "it, tracks it and sets weight 650. Below 12px, text stops being small " +
      "and becomes texture: the audit's words for the state this scale was " +
      "built to end were \"the least readable text in the product\", and it " +
      "was 11.5px."
    );
  }
  let best = RUNGS[0];
  for (const rung of RUNGS) {
    if (Math.abs(rung.px - px) < Math.abs(best.px - px)) best = rung;
  }
  const exact = best.px === px;
  return (
    `${px}px ${exact ? "IS" : "rounds to"} the ${best.px}px rung. ` +
    (exact
      ? "The rung already held this number; it was typed out beside it."
      : "If the difference matters, say why in a comment and disable the line; " +
        "if it does not, and at this size it almost never does, take the rung.") +
    ` THE SIZE IS \`var(${best.token})\`, and that is the whole of the change ` +
    "if what you have is a plain label at this size." +
    (best.sizeOnly
      ? ` \`${best.klass}\` is the same size and additionally ${best.carries}, ` +
        "which is almost always what you want as well, so take the class unless " +
        "the leading is already being set by something around it."
      : ` \`${best.klass}\` is NOT a synonym for that token: it also ` +
        `${best.carries}. Take the class only if this text IS ${best.role}. ` +
        "Applied to anything else it changes what the words look like, not just " +
        "how big they are, and a run of such edits is a redesign nobody asked " +
        "for that lint, types and tests all pass clean.")
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
