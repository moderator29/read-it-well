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
 */
export default defineConfig({
  resolve: {
    conditions: ["react-server", "node", "import", "default"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("../../node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
