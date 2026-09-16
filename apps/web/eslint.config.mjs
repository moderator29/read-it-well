import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import nfColour from "./eslint-rules/no-raw-colour.mjs";
import nfSpacing from "./eslint-rules/no-raw-spacing.mjs";
import nfFontSize from "./eslint-rules/no-arbitrary-font-size.mjs";

/**
 * All three design-system rules under one plugin namespace, `nf/`.
 *
 * THREE, AND FOR A LONG TIME THIS LINE SAID "BOTH". `nf/no-arbitrary-font-size`
 * was named in the sprint plan, in the briefs handed to the workstreams and in
 * the header below as one of three rules, and it had never been written. The
 * directory held two files and this line spread two of them. Because the only
 * signal a missing lint rule produces is zero violations, the absence read as
 * success everywhere it was looked at. It exists now; see
 * eslint-rules/no-arbitrary-font-size.mjs.
 */
const nf = { rules: { ...nfColour.rules, ...nfSpacing.rules, ...nfFontSize.rules } };

/**
 * ESLint, which has never actually run on this repository.
 *
 * `npm run lint` has been wired to `eslint .` the whole time, but no
 * `eslint.config.*` existed, so every invocation exited with "couldn't find a
 * configuration file". Combined with there being no stylelint and no
 * `tailwind.config`, nothing has ever mechanically checked this codebase, and a
 * platform-wide UI audit found exactly the drift you would predict:
 *
 *   - ~250 raw colour literals inside `globals.css`, a file whose own header
 *     says "Nothing below may introduce a raw colour". One blue appears 68
 *     times, one ink 51 times.
 *   - 768 arbitrary `text-[…rem]` literals across 35 distinct values, against
 *     11 scale tokens referenced 6 times in total.
 *   - 12 button implementations across 7 different heights.
 *   - Dead imports and unreferenced files nothing flagged.
 *
 * The rules below are deliberately a floor rather than a wish list. A config
 * that fails on three thousand pre-existing violations gets disabled within a
 * week, which is worse than no config. Correctness and dead code are errors;
 * the design-system rules that need a bulk migration first are warnings, and
 * they tighten to errors as the migration lands.
 */
const config = [
  ...next,
  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    ignores: [
      ".next/**",
      /*
       * Parallel sessions build into their own dist directory (`next build
       * --distDir .next-a2`), and eight of those had accumulated here: 1.5GB on
       * disk and, because only `.next` itself was ignored, 1,879 files of
       * generated output being linted. `npm run lint` reported 117,622 problems
       * of which every single error was in build output, which is the same as
       * reporting nothing: a signal that noisy is one nobody reads.
       */
      ".next-*/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
    ],
  },

  {
    files: ["**/*.{ts,tsx,mts,mjs}"],
    rules: {
      /*
       * Dead code. The audit found unused imports surviving in shipped files
       * precisely because nothing looked. Underscore-prefixed names stay
       * allowed, which is the normal escape hatch for a deliberately unused
       * destructured value or catch binding.
       */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      /*
       * Money on this platform is always integer minor units. `==` coercion
       * around currency and status comparisons is the kind of thing that is
       * fine until it is not.
       */
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": ["error", { destructuring: "all" }],

      /*
       * Console noise ships to users. Warnings and errors are legitimate; a
       * stray `console.log` in a server component is not.
       */
      "no-console": ["error", { allow: ["warn", "error"] }],

      /*
       * The React Compiler rules, held at warn.
       *
       * Turning lint on for the first time surfaced 44 violations of these,
       * almost all `set-state-in-effect` and `refs` in subscription and
       * realtime code that predates this config by a long way. Several are
       * arguably correct as written - synchronising React state from an
       * external system is exactly what an effect is for - and the rest need
       * individual judgement, not a bulk codemod.
       *
       * Shipping them as errors would mean `npm run lint` fails on a clean
       * checkout, which is how a config gets deleted rather than obeyed. They
       * are warnings so they are visible and countable, and each one that gets
       * resolved moves the number down. Promote to error once it reaches zero.
       */
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/use-memo": "warn",
    },
  },

  {
    /*
       Tests and scripts run outside the app bundle and legitimately log.
     */
    files: ["tests/**", "scripts/**", "*.config.{mjs,ts}"],
    rules: {
      "no-console": "off",
    },
  },

  /*
   * ------------------------------------------------------------------
   * Colour provenance, the mechanical half of ADR-002.
   *
   * There was no stylelint, no eslint rule and no tailwind config guarding
   * any of this, which is exactly why it grew back after the last cleanup.
   * See eslint-rules/no-raw-colour.mjs for what it catches and why.
   *
   * ERROR in the design system and the component tree. Those directories are
   * at zero violations as of this commit, so the rule holds a real line
   * rather than describing an aspiration, and the next raw hex fails the
   * build on the branch that introduces it.
   *
   * WARN under src/app. Eleven files there carry twenty-four violations, and
   * they belong to routes rather than to the design system. Shipping them as
   * errors would mean `npm run lint` fails on a clean checkout, which is the
   * first step towards the config being deleted; the same reasoning the React
   * Compiler rules above are held at warn for. Promote to error once those
   * twenty-four reach zero.
   * ------------------------------------------------------------------ */
  {
    files: ["src/design-system/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    plugins: { nf },
    rules: { "nf/no-raw-colour": "error" },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    plugins: { nf },
    rules: { "nf/no-raw-colour": "warn" },
  },

  /*
   * ------------------------------------------------------------------
   * Spacing provenance. Same shape as the colour rule above, same reasoning,
   * one commit behind it on the migration curve.
   *
   * See eslint-rules/no-raw-spacing.mjs for what it catches and why. The short
   * version: there was no spacing scale at all, so 4,115 spacing utilities got
   * written against 34 raw Tailwind steps plus 19 arbitrary bracket escapes,
   * and that is the mechanical cause of the product reading as choked on one
   * screen and loose on the next.
   *
   * ERROR ON THE SCREENS THAT ARE MIGRATED. The marketing site, the landing
   * page and the site components are at zero violations as of this commit, so
   * the rule holds a real line there rather than describing an aspiration, and
   * the next raw `p-4` fails the build on the branch that introduces it.
   *
   * WARN EVERYWHERE ELSE, for exactly the reason the colour rule is warn under
   * src/app and the React Compiler rules are warn globally: roughly 3,500
   * violations remain in the product, agent and admin trees, and three other
   * streams are building in them right now. A config that fails on a clean
   * checkout is a config that gets deleted rather than obeyed. Each directory
   * promotes to error as it reaches zero; the pattern is already established
   * one block above.
   * ------------------------------------------------------------------ */
  {
    files: [
      /*
       * `src/app/page.tsx` WAS on this list and has come off it, and the honest
       * reason is worth more here than a green lint run.
       *
       * The landing page was restored to its pre-session state at the owner's
       * request, because the version I replaced it with had removed the house
       * beside the headline and six sections he wanted. That restored file
       * predates the spacing scale, so it carries 87 raw steps again.
       *
       * The choice was to restyle the page he had just asked me to put back
       * exactly, or to say plainly that it is no longer migrated. Changing it
       * would risk the visual he asked for, to satisfy a rule I added the same
       * day, which is the wrong way round. It goes back on this list when the
       * page is migrated deliberately rather than as a side effect of a
       * revert.
       */
      "src/app/(site)/**/*.{ts,tsx}",
      "src/components/site/**/*.{ts,tsx}",
      "src/components/app/AiAssistantBanner.tsx",
    ],
    plugins: { nf },
    rules: { "nf/no-raw-spacing": "error" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/app/page.tsx",
      "src/app/(site)/**/*.{ts,tsx}",
      "src/components/site/**/*.{ts,tsx}",
      "src/components/app/AiAssistantBanner.tsx",
    ],
    plugins: { nf },
    rules: { "nf/no-raw-spacing": "warn" },
  },

  /*
   * ------------------------------------------------------------------
   * Type provenance. The third of the three, and the one that did not exist.
   *
   * See eslint-rules/no-arbitrary-font-size.mjs for the full account. The short
   * version: this rule was named in three documents as though it had shipped,
   * the rules directory held two files, and the type scale therefore had
   * nothing watching it while 1,170 size decisions were taken against twelve
   * rungs. A missing rule reports zero violations, which is indistinguishable
   * from a clean tree until somebody counts by hand.
   *
   * WARN EVERYWHERE, AND DELIBERATELY NOT ERROR ANYWHERE YET.
   *
   * The two rules above earn their `error` in specific directories by being at
   * zero there today, which is the pattern: a rule holds a real line where the
   * migration has landed and describes an aspiration everywhere else. This one
   * has landed nowhere. Turning it to error in any directory on the day it is
   * written would mean `npm run lint` fails on a clean checkout, which is the
   * first step towards the config being deleted rather than obeyed, and it is
   * the reasoning this file has already applied twice.
   *
   * THE RATCHET HAS TIGHTENED ONCE, WHICH IS THE POINT OF HAVING ONE.
   *
   * The rule shipped as `warn` everywhere, deliberately, because a rule and its
   * first enforcement in one commit is a rule nobody has had a chance to
   * disagree with. It has since survived a commit and a re-audit, and
   * `src/design-system/**` and `src/components/ui/**` are still at zero - the
   * latter with one `eslint-disable-next-line` carrying its reason on it, which
   * is the escape hatch working as designed rather than a violation hiding.
   *
   * So those two are `error` now, the same shape the colour and spacing rules
   * above use, and for the same stated reason: a rule holds a real line where
   * the migration has landed and describes an aspiration everywhere else. A
   * ratchet that never tightens is a warning nobody reads.
   *
   * WHAT PROMOTES NEXT. 1,110 sites remain, and here is every one of them by
   * directory, counted rather than estimated, so the two other workstreams can
   * take theirs without re-running anything:
   *
   *     225  src/app/admin                 31  src/components/auth
   *     169  src/app/(app)                 11  src/components/site
   *     168  src/app/agent                  8  src/lib
   *     141  src/app/(site)                 6  src/app/(auth)
   *     133  src/components/app             4  src/app/offline
   *     121  src/components/social          3  src/components/messages
   *      51  src/components/agent           3  src/components/roles
   *      32  src/components/verification    2  src/app/page.tsx
   *                                         1  src/app/error.tsx
   *                                         1  src/app/not-found.tsx
   *
   * `src/components/site/**` at 11 and `src/app/(auth)/**` at 6 could reach
   * zero in an afternoon; `src/app/admin/**` at 225 is a project. Nothing
   * should be promoted on the strength of being SMALL, though - it should be
   * promoted the day somebody has actually read the sites and moved them, which
   * is the difference between this list and a wish. Four of the five largest
   * are also where the product's densest screens live, so the sizes there are
   * more likely to be load-bearing than lazy.
   * ------------------------------------------------------------------ */
  {
    files: ["src/design-system/**/*.{ts,tsx}", "src/components/ui/**/*.{ts,tsx}"],
    plugins: { nf },
    rules: { "nf/no-arbitrary-font-size": "error" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/design-system/**/*.{ts,tsx}", "src/components/ui/**/*.{ts,tsx}"],
    plugins: { nf },
    rules: { "nf/no-arbitrary-font-size": "warn" },
  },
];

export default config;
