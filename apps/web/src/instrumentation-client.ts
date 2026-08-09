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
