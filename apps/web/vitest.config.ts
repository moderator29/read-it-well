import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests, for the handful of things a browser cannot reach.
 *
 * Nearly everything on this platform is proved by a Playwright spec against a
 * running server, and that stays the rule: a test that drives the real screen
 * is worth more than one that drives a function. This config exists for the
 * exception, which is code whose whole job is to interpret somebody else's
 * payload. The partner providers map Google and Amadeus responses, and the only
 * honest way to test that mapping is to hand them a response, which a browser
 * spec cannot do without either a live key or a stand-in for Google.
 *
 * Every module under `lib/inventory` opens with `import "server-only"`. That
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
export default defineConfig({
  resolve: {
    conditions: ["react-server", "node", "import", "default"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("../../node_modules/server-only/empty.js", import.meta.url),
      ),
      react: fileURLToPath(
        new URL("../../node_modules/react/react.react-server.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
