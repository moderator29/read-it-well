import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The unit suite: every `.test.ts` file under `src`, in Node, with NO database and no
 * running server. It covers most of `lib/` and the route handlers with their
 * dependencies stubbed; what lives in SQL (RLS, grants, triggers, the money
 * functions) is tested by the database probes in `supabase/tests/probes`
 * (`scripts/db-probes/run.mjs`, CI job "Database probes"), and the browser
 * scripts in `tests/*.spec.mjs` are run by hand, not by this config.
 *
 * `retry: 0` is explicit so a flaky test is a red run with its name on it,
 * never a pass on the second try (DOC-P2-04).
 *
 * Server modules open with `import "server-only"`. That
 * package exports an empty module under the `react-server` condition and a
 * module that throws on purpose under every other one, which is exactly the
 * guard we want in a build and exactly the thing that stops a test importing
 * it. Setting `resolve.conditions` alone does not reach it, because Vitest
 * resolves dependencies outside the project through Node rather than through
 * this field, so the package is aliased straight at the empty entry its own
 * exports map already points `react-server` at. That is the same file the real
 * build gets, chosen explicitly rather than by condition.
 *
 * REACT IS ALIASED FOR EXACTLY THE SAME REASON, and it matters more than it
 * looks. `react` has a `react-server` export condition too, and the two builds
 * are not interchangeable: in the server build `cache` memoises through the
 * current async dispatcher, and in the client build `cache` is a bare
 * passthrough that calls the function every time. So a server module wrapped in
 * `cache` behaves ONE WAY in the app and a completely different way under test,
 * with every test still green. `lib/actions/session.ts` is exactly that module,
 * and its memo is what keeps one page render to one auth round trip.
 *
 * `resolve.conditions` does not reach `react` for the same reason it does not
 * reach `server-only`, so it is aliased at the entry its own exports map points
 * `react-server` at. Every module under test here is a server module; nothing
 * in this suite renders a component or calls a client hook.
 */
const shared = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "server-only": fileURLToPath(new URL("../../node_modules/server-only/empty.js", import.meta.url)),
};

export default defineConfig({
  test: {
    retry: 0,
    /* A generous per-test budget can hide a test creeping towards it, so the
       report names every test over 5 s, in CI's log as well as locally. */
    slowTestThreshold: 5_000,
    projects: [
      {
        resolve: {
          conditions: ["react-server", "node", "import", "default"],
          alias: {
            ...shared,
            react: fileURLToPath(
              new URL("../../node_modules/react/react.react-server.js", import.meta.url),
            ),
          },
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          retry: 0,
          /*
           * BUDGETS FOR A BUSY MACHINE, NOT AN IDLE ONE. Vitest's 5 s and
           * 10 s defaults assume nothing else is running. Several test
           * files read the whole source tree or import most of the server
           * graph; on a machine running other suites beside this one they
           * took 5 to 12 s and failed as timeouts with nothing wrong. A real
           * hang still fails, at these limits, with its name on it.
           */
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
      /*
       * THE COMPONENT PROJECT. `*.dom.test.tsx` renders a client component to
       * HTML with the ordinary (client) React build, loads it into a real
       * Chromium and runs axe-core over it (`src/lib/a11y/axe.ts`). The
       * react-server alias above cannot render hooks, which is exactly why
       * these files live in their own project with no React alias at all.
       */
      {
        resolve: { alias: shared },
        esbuild: { jsx: "automatic" },
        test: {
          name: "dom",
          environment: "node",
          include: ["src/**/*.dom.test.tsx"],
          retry: 0,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
