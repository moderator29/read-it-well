// TRACK G: IS THE SENTENCE ON A SCREEN. Not in a constant, not in a passing
// unit test. On a screen, read back out of a rendered page.
//
// Usage: node scripts/probes/track_g_the_sentence_on_a_screen.mjs \
//          [--base http://localhost:3210] <route> [<route> ...]
//
// WHY THIS EXISTS. Track G has now produced three green lights over a feature
// nobody could see. `lib/supply/roles.test.ts` proved three constants existed
// while both had zero consumers. `lister-role-line.test.ts` proved a component
// filled them while the read never selected the column. And the read half was
// then reported closed while `agents` was RLS-bound away from every stranger,
// so the two sentences that name somebody drew nothing on all 64 live
// listings. Every one of those tests was correct about what it watched and
// blind to the thing it was reporting on.
//
// So this reads the RENDERED DOM: the element the component emits, the role
// attribute on it, and the words inside it. If the sentence is not on the
// screen this fails, whatever any unit test says.
//
// WHAT IT ASSERTS PER ROUTE
//   1. HTTP 2xx, and not the not-found body served at 200 (`data-nf-not-found`),
//      which has fooled this repository's shot harness eight times in a day.
//   2. The agent card is present at all. Without this every assertion below
//      would be vacuously satisfied by a page that renders no card.
//   3. `[data-testid="lister-role"]` exists and carries a `data-role`.
//   4. Its text is non-empty and contains NO `{name}`, no "undefined" and no
//      "null". A template with its placeholder showing is the one outcome
//      worse than no line.
//   5. THE NEGATIVE, which is the half that catches the defect this run was
//      written for: on an `owner` listing the card must NOT print the agent
//      noun anywhere. "Agent on Vallo" above "Listed by the owner" is the
//      contradiction being proved gone.
//   6. On an `agent` or `firm` listing the sentence must actually NAME
//      somebody, which is to say it must be longer than the role word alone
//      and must not equal the owner sentence.
//
// It prints the exact text it read for every route, so the output is evidence
// rather than a verdict.

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const base = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3210";
const routes = args.filter((a, i) => !a.startsWith("--") && (baseIdx < 0 || i !== baseIdx + 1));

if (routes.length === 0) {
  console.error("No routes given.");
  process.exit(1);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".shots");
mkdirSync(outDir, { recursive: true });

/* SwiftShader, for the same reason `verify-shots.mjs` carries it: headless
   Chromium here has no GPU and silently DROPS backdrop-filter, so every glass
   surface in this product paints as a flat wash without it. */
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  deviceScaleFactor: 2,
});
await context.addInitScript(() => {
  try {
    window.localStorage.setItem("nf_theme", "dark");
  } catch {
    /* storage can be unavailable; the assertions below still decide. */
  }
});

let failures = 0;

for (const route of routes) {
  const page = await context.newPage();
  const url = base + (route.startsWith("/") ? route : "/" + route);
  const fail = (why) => {
    console.error(`FAIL ${route}: ${why}`);
    failures += 1;
  };
  try {
    const response = await page.goto(url, { waitUntil: "load", timeout: 45000 });
    const status = response?.status() ?? 0;
    if (status < 200 || status > 299) {
      fail(`the server answered ${status || "nothing"}, so this is an error page and not the surface.`);
      await page.close();
      continue;
    }
    if (await page.locator("[data-nf-not-found]").count()) {
      fail("this is the not-found body served at 200, not the surface.");
      await page.close();
      continue;
    }

    const cards = page.locator('[data-testid="agent-card"]');
    let cardCount = 0;
    try {
      await cards.first().waitFor({ state: "attached", timeout: 20000 });
      cardCount = await cards.count();
    } catch {
      fail("there is no agent card on this page, so every assertion about it would be vacuous.");
      await page.close();
      continue;
    }
    console.log(`READ ${route}: ${cardCount} agent card(s)`);
    /* A page on which NO card carries a line would satisfy every per-card
       assertion below by skipping all of them. That is the blind light this
       whole track keeps producing, so it is closed here: a route has to show
       the sentence at least once or the run fails. */
    let linesSeen = 0;
    const rolesSeen = new Set();

    /* EVERY CARD ON THE PAGE, NOT THE FIRST ONE. The first run of this probe
       read `.first()` and reported ALL ROUTES PASS off a single owner card on
       a page carrying seven. A proof that stops at the first row is a proof
       about the first row. */
    for (let i = 0; i < cardCount; i += 1) {
      const card = cards.nth(i);
      const line = card.locator('[data-testid="lister-role"]').first();
      const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ").trim();
      const agentNoun = await card.getAttribute("data-agent-noun");
      const has = (await line.count()) > 0;
      const role = has ? await line.getAttribute("data-role") : null;
      const text = has ? ((await line.textContent()) ?? "").trim() : null;
      const label = `${route} card ${i + 1}/${cardCount}`;

      console.log(`  [${i + 1}] data-role=${role ?? "(none)"} sentence=${JSON.stringify(text)}`);
      console.log(`      card=${JSON.stringify(cardText)}`);

      if (has) {
        linesSeen += 1;
        if (role) rolesSeen.add(role);
        if (!role) fail(`${label}: the line carries no data-role.`);
        if (text === "") fail(`${label}: the line is empty.`);
        for (const poison of ["{name}", "undefined", "null"]) {
          if (text && text.includes(poison)) fail(`${label}: the sentence contains ${poison}.`);
        }
      }

      /* THE NEGATIVE, and it is the half that catches the defect this was
         written for. On an owner listing the agent noun must be nowhere on
         the card. The noun is read off the page's own attribute rather than
         hardcoded here, so a copy change cannot make this pass by accident. */
      if (role === "owner") {
        if (!agentNoun) fail(`${label}: the card carries no data-agent-noun, so the negative cannot be checked.`);
        else if (cardText.includes(agentNoun)) {
          fail(`${label}: an OWNER listing printed the agent noun ${JSON.stringify(agentNoun)}.`);
        }
        if (text && /,\s*agent$/.test(text)) fail(`${label}: an owner listing printed the agent sentence.`);
      }

      /* AND THE ONE THAT WOULD HAVE CAUGHT THE FIRM CONTRADICTION. */
      if (role === "firm" && agentNoun && cardText.includes(agentNoun)) {
        fail(`${label}: a FIRM listing printed the agent noun ${JSON.stringify(agentNoun)}.`);
      }

      /* A role that needs a name either names somebody or draws no line at
         all. What it may never do is print a half sentence. */
      if ((role === "agent" || role === "firm") && text) {
        if (text.length <= "Listed by".length + 1) {
          fail(`${label}: a ${role} listing printed ${JSON.stringify(text)}, which names nobody.`);
        }
        if (/^Listed by the owner$/i.test(text)) fail(`${label}: a ${role} listing printed the OWNER sentence.`);
      }

      const slug = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
      await card.screenshot({ path: join(outDir, `track-g-${slug}-${i + 1}-${role ?? "none"}.png`) });
    }

    if (linesSeen === 0) {
      fail(`${cardCount} agent card(s) and NOT ONE lister role line. Every per-card assertion above was skipped, which is what a green light over nothing looks like.`);
    } else {
      console.log(`  roles on this screen: ${[...rolesSeen].sort().join(", ")} (${linesSeen} line(s) of ${cardCount} card(s))`);
    }
  } catch (error) {
    fail(String(error && error.message ? error.message : error));
  }
  await page.close();
}

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} route(s) failed. The sentence is not on those screens.`);
  process.exit(1);
}
console.log(`\nALL ROUTES PASS: the sentence is on the screen for every route given, read back out of the rendered DOM.`);
