import next from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

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
];

export default config;
