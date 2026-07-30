/**
 * Rate-limit graceful-path checks.
 *
 * Run with the dev or production server already listening:
 *   node apps/web/tests/rate-limit.spec.mjs
 *
 * What this proves, and what it deliberately does not. This sandbox has no
 * ANTHROPIC_API_KEY and no SUPABASE_SERVICE_ROLE_KEY, so the durable limiter
 * cannot reach its counter table and, by design, fails open: nobody is refused
 * because the limiter is unavailable. That makes the honest thing to test here
 * the graceful path, which is exactly the path a real outage puts everybody on.
 *
 * Hammering /api/assistant twelve times in a row must produce, every single
 * time:
 *   1. a JSON response, parseable, with a `message` string a person can read;
 *   2. a status of 200 (the graceful no-key answer) or 429 (the friendly pace
 *      answer), never a 500 and never an empty body;
 *   3. no stack trace, no "Error:", no SQL, no function name leaking into the
 *      copy;
 *   4. a `Retry-After` header whenever the status is 429, so the refusal says
 *      when as well as what.
 *
 * Proving the counter itself denies the twenty fifth question needs a service
 * key and the applied migration; that check belongs to the lead's live run, not
 * to a keyless sandbox.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = "/opt/pw-browsers/chromium";
const ATTEMPTS = 12;

const failures = [];
function check(label, condition) {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}`);
  }
}

/** Copy that would mean an internal detail escaped into a user-facing answer. */
const LEAKS = [
  "Error:",
  "at async",
  "node_modules",
  "consume_rate_limit",
  "rate_limits",
  "supabase",
  "postgres",
  "PGRST",
  "stack",
  "undefined",
];

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

try {
  /* ------------------------------------- 1. the route answers, over and over */
  console.log(`POST /api/assistant ${ATTEMPTS} times`);

  await page.goto(`${BASE_URL}/assistant`, { waitUntil: "load" });
  await page.waitForTimeout(1500);

  // Fetch from inside the page so cookies and origin match a real caller.
  const results = await page.evaluate(async (attempts) => {
    const out = [];
    for (let i = 0; i < attempts; i += 1) {
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Shortlets in Lagos, attempt ${i + 1}` }],
          }),
        });
        const contentType = res.headers.get("content-type") ?? "";
        const retryAfter = res.headers.get("retry-after");
        const text = await res.text();
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        out.push({ status: res.status, contentType, retryAfter, text, parsed });
      } catch (error) {
        out.push({ status: 0, contentType: "", retryAfter: null, text: String(error), parsed: null });
      }
    }
    return out;
  }, ATTEMPTS);

  check(`all ${ATTEMPTS} attempts answered`, results.length === ATTEMPTS);

  const statuses = [...new Set(results.map((r) => r.status))].sort((a, b) => a - b);
  console.log(`  statuses seen: ${statuses.join(", ")}`);

  check(
    "no attempt returned a server error",
    results.every((r) => r.status !== 0 && r.status < 500),
  );
  check(
    "every status is either the graceful 200 or the friendly 429",
    results.every((r) => r.status === 200 || r.status === 429),
  );
  check(
    "every response is JSON",
    results.every((r) => r.contentType.includes("application/json")),
  );
  check(
    "every response parses",
    results.every((r) => r.parsed !== null && typeof r.parsed === "object"),
  );
  check(
    "every response carries a readable message",
    results.every(
      (r) => typeof r.parsed?.message === "string" && r.parsed.message.trim().length > 20,
    ),
  );
  check(
    "no message leaks an internal detail",
    results.every((r) => {
      const message = String(r.parsed?.message ?? "");
      return !LEAKS.some((needle) => message.toLowerCase().includes(needle.toLowerCase()));
    }),
  );
  check(
    "no response body contains a stack trace",
    results.every((r) => !r.text.includes("    at ") && !r.text.includes('"stack"')),
  );
  check(
    "no message contains a long dash",
    results.every((r) => !String(r.parsed?.message ?? "").includes("\u2014")),
  );

  const refusals = results.filter((r) => r.status === 429);
  check(
    "every refusal says when to try again",
    refusals.every(
      (r) =>
        typeof r.retryAfter === "string" &&
        Number(r.retryAfter) > 0 &&
        /\b(in|tomorrow)\b/i.test(String(r.parsed?.message ?? "")),
    ),
  );
  if (refusals.length === 0) {
    console.log("  note  no refusal in this run: the limiter is failing open without its key");
  }

  /* ---------------------------------- 2. the UI still renders a real answer */
  console.log("assistant surface after the burst");

  await page.locator("#assistant-input").fill("Find me a shortlet in Lagos");
  await page.locator('button[aria-label="Send message"]').click();
  await page.waitForTimeout(4000);

  const thread = await page
    .locator('section[aria-label="Conversation"], div[aria-label="Conversation"]')
    .first()
    .innerText()
    .catch(() => "");

  check("the user message is in the thread", thread.includes("Find me a shortlet in Lagos"));
  check(
    "an answer bubble rendered rather than a blank or a raw error",
    thread.replace("Find me a shortlet in Lagos", "").trim().length > 20,
  );
  check("no stack trace rendered in the thread", !thread.includes("    at "));
} catch (error) {
  failures.push(`unexpected error: ${error?.message ?? error}`);
  console.error(error);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nAll rate-limit graceful-path checks passed.");
