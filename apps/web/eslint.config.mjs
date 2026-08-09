import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import nfColour from "./eslint-rules/no-raw-colour.mjs";
import nfSpacing from "./eslint-rules/no-raw-spacing.mjs";

/** Both design-system rules under one plugin namespace, `nf/`. */
const nf = { rules: { ...nfColour.rules, ...nfSpacing.rules } };

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
];

export default config;
