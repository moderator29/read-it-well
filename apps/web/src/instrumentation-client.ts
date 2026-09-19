import { config } from "zod";

/**
 * The first thing the browser runs, and the only thing it is here for.
 *
 * Next runs this file before any other client code, before hydration and
 * before a single route chunk evaluates. That ordering is the entire reason
 * the file exists, and nothing that does not need it belongs here.
 *
 * ## What it prevents
 *
 * Zod decides once, lazily, whether it may compile a validator instead of
 * interpreting it, and it decides by calling `new Function("")` inside a
 * try/catch. Under a Content Security Policy without `'unsafe-eval'` that call
 * throws, Zod catches it and quietly uses the interpreted path, so nothing
 * breaks. The browser reports it anyway: a `script-src` violation with a
 * blocked URI of `eval`, fired before the throw is swallowed, on every route
 * whose bundle constructs a schema at module scope. Measured on a production
 * build: `/around` and `/settings` each raised exactly one, from the shared
 * chunk that carries `lib/interests/schema` and `lib/social/places-schema`.
 *
 * That is a violation nobody can act on, arriving on the busiest routes, into
 * the same `/api/csp-report` log that a real violation has to be found in. A
 * reporting channel full of a known non-event is a reporting channel nobody
 * reads, which is how the first real one gets missed.
 *
 * `jitless` tells Zod not to probe at all, so the answer is the same one it
 * would have reached and no violation is raised getting there. Zod's own
 * source names this exact case beside the check.
 *
 * ## Why here and not beside the schemas
 *
 * The probe runs when a schema is CONSTRUCTED, and every schema module in this
 * app constructs at module scope, so the setting has to be in place before any
 * of them evaluates. Importing a shared configuration module from each of the
 * fifteen schema files would work and would also be fifteen places for the
 * sixteenth to be forgotten. This file is the one place with an ordering
 * guarantee from the framework rather than from a convention.
 *
 * ## The cost, stated
 *
 * Interpreted validation is slower than compiled validation. On this platform
 * the client parses nothing on a hot path: schemas reach the browser for their
 * inferred types and their shared constants, and the parse that matters runs
 * in a server action. Under the policy the compiled path was never available
 * in the browser anyway, so this changes how Zod finds that out, not what it
 * ends up doing.
 */
config({ jitless: true });

/**
 * ## The second job: an unhandled rejection is reported, not lost
 *
 * Added when crash reporting landed, and it is here for the same ordering
 * reason as the setting above: this file runs before any route chunk
 * evaluates, so a rejection thrown by the very first chunk to load is
 * already covered.
 *
 * React's error boundaries catch what happens during render. They do not
 * catch a promise rejected in an event handler, an `await` in a `useEffect`
 * with nothing attached to it, or a failed `fetch` nobody awaited, and those
 * are the client errors that actually reach people: a Save button that
 * silently does nothing. `unhandledrejection` is the only place the browser
 * offers them.
 *
 * `error` is listened for as well. React 19 forwards an error that reached
 * no boundary to `window.reportError`, which raises exactly this event, so
 * the two listeners together cover the whole client surface: boundaries
 * report themselves, and everything else arrives here.
 *
 * The reporter is imported lazily so that the observability module is not
 * pulled into the first chunk the browser parses. Nothing is printed: the
 * browser already prints an unhandled rejection in the console itself, and a
 * second line would be noise on top of it.
 */
if (typeof window !== "undefined") {
  const report = (error: unknown, kind: string) => {
    void import("@/lib/observability/client").then(({ reportClientError }) => {
      reportClientError(error, { kind });
    });
  };

  window.addEventListener("unhandledrejection", (event) => {
    report(event.reason, "client.unhandled_rejection");
  });

  window.addEventListener("error", (event) => {
    /*
     * A failed `<img>` or `<script>` raises `error` on the ELEMENT and it
     * bubbles to window with no `error` property. A broken photo is not a
     * crash, and reporting one would drown the real ones.
     */
    if (event.error === undefined || event.error === null) return;
    report(event.error, "client.uncaught");
  });
}
