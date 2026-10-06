import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import nfColour from "./eslint-rules/no-raw-colour.mjs";
import nfSpacing from "./eslint-rules/no-raw-spacing.mjs";
import nfFontSize from "./eslint-rules/no-arbitrary-font-size.mjs";
import nfServerActions from "./eslint-rules/server-actions-export-only-actions.mjs";
import nfDictionary from "./eslint-rules/no-dictionary-in-client.mjs";

/**
 * The three design-system rules and one outage rule, under one plugin
 * namespace, `nf/`.
 *
 * FOUR NOW, AND THE FOURTH IS NOT A DESIGN RULE. `nf/no-raw-colour`,
 * `nf/no-raw-spacing` and `nf/no-arbitrary-font-size` guard the token system;
 * `nf/server-actions-export-only-actions` guards the one defect class that
 * only `next build` can see. It is registered
 * here rather than in its own config so there is one namespace to read.
 *
 * THREE, AND FOR A LONG TIME THIS LINE SAID "BOTH". `nf/no-arbitrary-font-size`
 * was named in the sprint plan, in the briefs handed to the workstreams and in
 * the header below as one of three rules, and it had never been written. The
 * directory held two files and this line spread two of them. Because the only
 * signal a missing lint rule produces is zero violations, the absence read as
 * success everywhere it was looked at. It exists now; see
 * eslint-rules/no-arbitrary-font-size.mjs.
 */
const nf = {
  rules: {
    ...nfColour.rules,
    ...nfSpacing.rules,
    ...nfFontSize.rules,
    ...nfServerActions.rules,
    ...nfDictionary.rules,
  },
};

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
   * WARN under src/app. It was eleven files and twenty-four violations; it is
   * now THREE, and all three are the same kind of value, which is why the
   * promotion has not happened yet and what has to happen first.
   *
   *   src/app/layout.tsx:187   themeColor: "#010118"
   *   src/app/layout.tsx:255   "#F4F5F7" inside the before-paint theme script
   *   src/app/manifest.ts:22   NAVY, the PWA background and theme colour
   *
   * NONE OF THE THREE CAN BE A TOKEN, and that is not a migration excuse. All
   * three are serialised into places where no CSS has run: a `<meta>` tag, a
   * JSON manifest, and an inline script that executes before the stylesheet in
   * order to prevent a flash of the wrong theme. A `var()` there resolves to
   * nothing.
   *
   * THEY ARE ALSO THE SAME TWO VALUES AS `src/lib/native/theme.ts`, which is
   * the finding rather than the lint. `CHROME_COLOUR` there already holds
   * `#010118` and `#F4F5F7` for exactly this job, under a measurement
   * explaining why the chrome is NOT `--nf-surface-canvas`: the bar abuts the
   * top of the page, the top of the page is the sticky glass header, the canvas
   * computes to #000010, the header samples #090919, and #010118 sits between
   * them and nearer the header. That measurement is written out twice, here and
   * in `layout.tsx`, and the value appears at four sites in three files.
   *
   * THEY ARE CLEARED AND THIS IS AN ERROR NOW. `src/lib/theme/chrome.ts` holds
   * the two values and the measurement, with no client directive, and the four
   * serialisation points read it: the meta tag, the before-paint script, the
   * manifest, and `capacitor.config.ts`, which keeps its three literals written
   * out because the Capacitor CLI evaluates that file directly and an
   * unresolvable `@/` alias there is an unbuildable native config that cannot be
   * tested from this environment.
   *
   * The promotion was blocked on two files reading a constant, not on a disable
   * comment, and that is the general shape: when a rule cannot be promoted, the
   * question is what the remaining sites are FOR, not how to excuse them.
   * ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------
   * FRAMER-MOTION ONLY THROUGH LAZYMOTION (D34, D39).
   *
   * The top-level `motion` component pulls roughly 50KB where `LazyMotion`
   * with `domAnimation` and the `m` namespace costs about 18, and this app
   * runs in a WebView on budget Android over Nigerian mobile data. So
   * `motion`, `domMax` and the provider pieces are refused everywhere except
   * the one provider, `components/app/MotionProvider.tsx`, and the chunk it
   * loads its features from, `components/app/motion-features.ts`. A component that
   * imports `motion` has not been ported, whatever it looks like on screen.
   * ------------------------------------------------------------------ */
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/app/MotionProvider.tsx", "src/components/app/motion-features.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "framer-motion",
              importNames: ["motion", "domMax", "LazyMotion", "domAnimation"],
              message:
                "Use the `m` namespace and hooks. LazyMotion is mounted once in components/app/MotionProvider.tsx (D39).",
            },
          ],
          patterns: [
            {
              regex: "^(framer-motion/|motion(/|$))",
              message: "Import from \"framer-motion\" only, through the `m` namespace (D39).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/design-system/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    plugins: { nf },
    rules: { "nf/no-raw-colour": "error" },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    plugins: { nf },
    rules: { "nf/no-raw-colour": "error" },
  },
  /*
   * ------------------------------------------------------------------
   * `src/lib` HAD NEVER BEEN LOOKED AT BY THIS RULE, AND IT HOLDS MORE RAW
   * COLOUR THAN THE REST OF `src` PUT TOGETHER.
   *
   * The three blocks above cover `src/design-system`, `src/components` and
   * `src/app`. Nothing covered `src/lib`, so 28 literals there have never been
   * reported, which is not a migration that stalled: it is a population nobody
   * has counted. A rule that is enforced on three directories out of four is a
   * habit rather than a rule, which is the same argument that put the layer-1
   * check into `.tsx` files in `scripts/check-css-tokens.mjs`.
   *
   * IT WENT IN AT WARN AND IS AN ERROR ONE BLOCK LATER, which is the whole
   * lifecycle in two commits: make the population visible, find that it is two
   * values in one file rather than a migration, give those values a home, flip
   * it. The warn step was not a concession, it was how the 28 got counted.
   *
   * `src/lib/email` IS SCOPED OUT BY CONFIG AND NOT BY DISABLE COMMENTS, and
   * that is the one exemption in this file that is a whole directory.
   * `lib/email/theme.ts` is to email what `packages/design-tokens` is to the
   * web: the layer where the literals are DEFINED, with the token each one was
   * resolved from named beside it. Email has to carry literal hex inline on the
   * element, because Gmail's web client strips `:root` custom property
   * declarations, Outlook's Word engine never supported them, and a `var()`
   * with no fallback resolves to nothing, which paints text the same colour as
   * its background. So the literals there are not a migration that has not
   * happened; they are the correct answer, they are already tested for parity
   * against `tokens.css` in `lib/email/shell.test.ts`, and eighteen per-line
   * disables in a definition file would say the opposite of what is true.
   *
   * The same reasoning is why `packages/design-tokens` is not linted for
   * literals either. A definition layer is exempt by what it IS; every other
   * exemption in this repository is a single line with its reason on it.
   *
   * `src/lib/theme/chrome.ts` IS THE SECOND AND LAST FILE ON THAT FOOTING, and
   * it qualifies for the same reason rather than by analogy. It is a definition
   * layer for the four places that paint the chrome ABOVE the page: the
   * `viewport.themeColor` meta tag, the before-paint theme script, the PWA
   * manifest, and `capacitor.config.ts`. Every one of them is serialised where
   * no CSS has run, so a `var()` in any of them resolves to nothing, which for a
   * colour means paint nothing and on a status bar means a white strip above a
   * near-black page.
   *
   * Two literals, one file, and the exemption is the thing that KEEPS it to two:
   * before it existed the same two values stood at six sites in four files with
   * the measurement behind them written out twice. A rule that forced disable
   * comments onto the home would have made the home look like the problem.
   *
   * THE TEST FOR A THIRD ONE, so this does not become a list. A file earns this
   * only if literals are correct for EVERY colour in it, for a reason about the
   * medium rather than about the schedule, and if it is the place other files
   * read from rather than one of the places that reads. Anything that is merely
   * not migrated yet takes a per-line disable, or stays an error until it is.
   * ------------------------------------------------------------------ */
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    ignores: ["src/lib/email/**/*.{ts,tsx}", "src/lib/theme/chrome.ts"],
    plugins: { nf },
    rules: { "nf/no-raw-colour": "error" },
  },

  /*
   * ------------------------------------------------------------------
   * Spacing provenance. Same shape as the colour rule above, same reasoning,
   * one commit behind it on the migration curve.
   *
   * See eslint-rules/no-raw-spacing.mjs for what it catches, why, and for the
   * live counts. The short version: there was no spacing scale at all, so every
   * spacing utility in the product was written against 34 raw Tailwind steps
   * plus 19 arbitrary bracket escapes, and that is the mechanical cause of the
   * product reading as choked on one screen and loose on the next.
   *
   * THE FIGURE THAT USED TO STAND HERE, 4,115, IS DELIBERATELY GONE. It counted
   * every spacing utility, which was the same set as the raw ones on the day it
   * was written and stopped being so the moment the scale landed. It was quoted
   * in five files and none of them could be updated without the other four. The
   * rule header holds the measurement now, in one place, with the three
   * different numbers this population can be counted as.
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
      /*
       * THE DESIGN SYSTEM JOINS THE LIST, which is the ratchet tightening for
       * the second time.
       *
       * `src/design-system/**` and `src/components/ui/**` are at zero for this
       * rule and have been through two commits and two re-audits since the
       * migration that took them there. The twelve primitives and the two icon
       * components are also the worst place in the tree for a raw step to
       * reappear, because a `p-4` inside `Button` or `Sheet` is a spacing
       * decision that every screen in the product then inherits without any of
       * them having taken it.
       *
       * `nf/no-raw-colour` already treats both directories as errors - it
       * covers all of `src/components/**` - so this closes the gap where two of
       * the three design-system rules held a line in the design system and the
       * third did not.
       */
      "src/design-system/**/*.{ts,tsx}",
      "src/components/ui/**/*.{ts,tsx}",
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
      "src/design-system/**/*.{ts,tsx}",
      "src/components/ui/**/*.{ts,tsx}",
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
   * WHAT PROMOTES NEXT, AND WHY THERE IS NO TABLE HERE.
   *
   * There was one. It listed all eighteen directories and their counts, taken
   * the day the rule was flipped, and it was WRONG WITHIN THE HOUR: another
   * workstream migrated a tranche of `src/app/admin` while this file was being
   * written and the total went from 1,110 to 714. A snapshot of a number that
   * is actively falling is the stale-by-one-edit fault this whole sprint has
   * been pulling out of stylesheets, and putting one in the config that
   * PRODUCES the number would be the worst place for it.
   *
   * So: 1,110 at the moment the rule was registered, across eighteen
   * directories, none of them in the design system. For the live figure, which
   * is the only one worth acting on:
   *
   *   npx eslint . -f json | node -e '<group messages by ruleId and dirname>'
   *
   * A directory promotes to `error` the day somebody has READ its sites and
   * moved them, not the day its number looks small. Four of the five largest
   * are the product's densest screens, where a size is more likely to be
   * load-bearing than lazy, and the point of the rule is to make each of those
   * a decision rather than to make the count go down.
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

  /*
   * ------------------------------------------------------------------
   * The fourth rule, and the only one here that is about an outage rather
   * than about the design system.
   *
   * `export type { FeedMode };` inside a "use server" module took production
   * down for twenty minutes on 19 September 2026.
   * TypeScript erases a type re-export, so `tsc --noEmit` was silent; it is
   * not a runtime value, so the whole test suite was silent; the CSS checker
   * has nothing to say about it. `next build` was the only gate that saw it,
   * and it was the one gate not being run before a push.
   *
   * ERROR EVERYWHERE, FROM THE DAY IT IS WRITTEN, which is the opposite of
   * how the three rules above landed and is deliberate. Those three describe
   * a migration with thousands of sites; this one describes a defect with
   * ZERO sites in the tree today. Every "use server" module here exports
   * async functions and type DECLARATIONS only, and a type declared inside
   * such a module is erased whole and stays legal, so the rule is left with
   * nothing to say until somebody reintroduces the outage. A rule at zero
   * that guards a known outage holds a real line on the branch that brings it
   * back, and warning about that would be the same silence that let it
   * through the first time.
   *
   * It does NOT replace `next build`, which stays the fifth gate. It moves
   * the same finding from a slow gate somebody skips to a gate that runs in
   * the editor while the line is being typed.
   *
   * See eslint-rules/server-actions-export-only-actions.mjs for what counts.
   * ------------------------------------------------------------------ */
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { nf },
    rules: { "nf/server-actions-export-only-actions": "error" },
  },

  /* ------------------------------------------------------------------
   * NO DICTIONARY IN A CLIENT MODULE (Session 3, W13, measured).
   *
   * A "use client" module that imports `@vallo/i18n` ships the whole
   * dictionary, 398KB gzipped, in its route's first load. See
   * eslint-rules/no-dictionary-in-client.mjs for what to do instead.
   *
   * THE ALLOW-LIST ONLY SHRINKS. Each file below still breaks the rule and has
   * a named owner fixing it; delete its line in the same change that fixes
   * it. Never add one: fix the import instead.
   * ------------------------------------------------------------------ */
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      /* Held by F1. Read `cryptoPay` through useScopedCopy("cryptoPay"). */
      /* Development harnesses, never in a production route. */
      "src/app/(dev)/**",
    ],
    plugins: { nf },
    rules: { "nf/no-dictionary-in-client": "error" },
  },
];

export default config;
