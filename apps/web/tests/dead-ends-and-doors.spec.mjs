/**
 * Two words that were wrong about the person reading them.
 *
 * The owner hit a 404 on his own signed-in session, tapped "Back to home", and
 * was dropped on the marketing landing page: "if I click that back to button
 * it's taking me to landing page likeee tf, fix it that back button should
 * never take me to landing page instead the default home button inside the
 * platform". Then he signed in with Google and the screen said "Verifying your
 * email" at somebody who has had an account for a week: "when log in it show
 * not show verifying it's currently showing".
 *
 * ONE ROOT CAUSE, TWICE. Both screens are shared by two audiences and neither
 * asked which one it had.
 *
 *   `/` and `/home` are both called home. `/` explains Vallo to somebody who
 *   has never seen it; `/home` is the first screen inside the product. Half
 *   the dead ends pointed at `/`, so a signed-in person was thrown out of the
 *   product by the button offering to take them back into it.
 *
 *   Sign-in and sign-up land on the SAME `/auth/callback`, because the OAuth
 *   handshake is identical either way. Nothing at that end can tell a returning
 *   person from a new one, so the screen said the sign-up words to everybody.
 *
 * WHAT THIS SANDBOX CAN AND CANNOT SHOW. There is no route to Supabase here, so
 * every session resolves unconfigured and both destinations correctly answer
 * the landing page. That branch IS exercised below and it is the right answer
 * for a build with no keys. The signed-in branch is held by source: one
 * ternary, read here rather than watched.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/dead-ends-and-doors.spec.mjs
 */

import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");
const read = (p) => readFileSync(join(SRC, p), "utf8");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 10)) console.log(`            ${line}`);
  }
}

const notFound = read("app/not-found.tsx");
const rootError = read("app/error.tsx");
const decider = read("app/home-or-landing/route.ts");
const panel = read("components/auth/VerifyingPanel.tsx");
const callback = read("app/auth/callback/page.tsx");
const choices = read("components/auth/AuthChoices.tsx");
const doors = read("components/auth/SocialDoors.tsx");
const options = read("components/auth/SignUpOptions.tsx");
const emailForm = read("components/auth/EmailAuthForm.tsx");
const actions = read("lib/auth/actions.ts");
/* The panel's words live in the dictionary since the 25 September split of
   the client copy (`useClientCopy().authFlow`), not in the component. */
const en = readFileSync(join(SRC, "../../../packages/i18n/src/locales/en.ts"), "utf8");

/* --------------------------------------------------------------- home */

console.log("\nBack to home means the home the reader has");

check(
  "the 404 asks who is reading before it answers",
  /resolveSession\(\)/.test(notFound) &&
    /session\.state === "signed-in" \? "\/home" : "\/"/.test(notFound),
);
check(
  "and its primary control uses that answer rather than a literal",
  /<ButtonLink href=\{home\}/.test(notFound) && !/<ButtonLink href="\/" variant="primary"/.test(notFound),
);
check(
  "the error boundary, which cannot read a session, delegates to one that can",
  /href="\/home-or-landing"/.test(rootError) && !/<ButtonLink href="\/" variant="secondary"/.test(rootError),
);
check(
  "the decider is a redirect keyed on the session, never cached as permanent",
  /session\.state === "signed-in" \? "\/home" : "\/"/.test(decider) && /status: 307/.test(decider),
);
/* Unconfigured must be landing, not /home. With no keys nothing inside can
   load, so sending somebody in swaps one dead end for another. */
check(
  "an unconfigured build sends people to landing rather than to a screen that cannot load",
  /state === "signed-in"/.test(decider) && !/state !== "signed-out"/.test(decider),
);

/* --------------------------------------------------------------- words */

console.log("\nThe callback says which event is happening");

check(
  "the panel carries both forms of words",
  /a\.verifyingTitle/.test(panel) && /a\.signingInTitle/.test(panel) &&
    /verifyingTitle: "Verifying your email"/.test(en) && /signingInTitle: "Signing you in"/.test(en),
);
check(
  "signing in is not described as verifying an email",
  /moment === "sign-up"\s*\?\s*\{ title: a\.verifyingTitle[^}]*\}\s*:\s*\{ title: a\.signingInTitle/.test(panel),
);
check(
  "the tab title is neutral, because one page serves both doors",
  /title: "One moment"/.test(callback),
);
/* The provider doors are one component (`SocialDoors`) since the Slate pass:
   it posts the intent it is given, and every screen that draws it names the
   intent of its own door (the chooser and the email form their mode, the
   sign-up options page "sign-up"). */
check(
  "the intent travels from the button that started the handshake",
  /name="intent" value=\{intent\}/.test(doors) &&
    /intent=\{mode\}/.test(choices) &&
    /intent=\{mode\}/.test(emailForm) &&
    /intent="sign-up"/.test(options),
);
check(
  "and rides the provider round trip in the callback URL",
  /intent=\$\{formData\.get\("intent"\) === "sign-in" \? "sign-in" : "sign-up"\}/.test(actions),
);
/* A confirmation link from an email carries no intent at all, and that case IS
   a sign-up, so anything unrecognised has to fall that way. */
check(
  "anything that is not explicitly a sign-in is treated as a sign-up",
  /one\("intent"\) === "sign-in" \? "sign-in" : "sign-up"/.test(callback),
);

/* ------------------------------------------------------ in the browser */

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

try {
  console.log("\nServed, not assumed");

  /* Read from the rendered panel, not the raw response: the page also ships
     the whole `authFlow` dictionary slice for the client copy, so both
     sentences are always somewhere in the HTML. What matters is what the
     panel draws. */
  const panelText = async (query) => {
    const tab = await context.newPage();
    try {
      await tab.goto(`${BASE_URL}/auth/callback?${query}`, { waitUntil: "domcontentloaded" });
      const panelEl = tab.locator('[data-testid="verifying"]');
      await panelEl.waitFor({ timeout: 60000 });
      return {
        heading: (await panelEl.locator("h1").textContent()) ?? "",
        body: (await panelEl.locator("h1 + p").textContent()) ?? "",
        html: await panelEl.innerHTML(),
      };
    } finally {
      await tab.close();
    }
  };

  const signUp = await panelText("code=x");
  check(
    "a link with no intent says the sign-up words",
    /Verifying your email/.test(signUp.heading) && !/Signing you in/.test(signUp.heading),
    [signUp.heading],
  );

  const signIn = await panelText("code=x&intent=sign-in");
  check(
    "a sign-in says it is signing somebody in",
    /Signing you in/.test(signIn.heading) && !/Verifying your email/.test(signIn.heading),
    [signIn.heading],
  );
  check(
    "and the body agrees with the heading rather than contradicting it",
    /checking it is you/.test(signIn.body) && !/confirming your address/.test(signIn.body),
    [signIn.body],
  );
  check(
    "the way out without JavaScript matches the door, so a sign-in is not sent to a code screen",
    /\/sign-in\/email/.test(signIn.html) && !/\/sign-up\/verify/.test(signIn.html),
  );

  /* The decider, live. Unconfigured here, which is the branch this sandbox
     can reach, and it must not follow the redirect to assert on it. */
  const hop = await context.request.get(`${BASE_URL}/home-or-landing`, { maxRedirects: 0 });
  check("the decider redirects rather than rendering", hop.status() === 307, [`${hop.status()}`]);
  check(
    "and unconfigured lands on the landing page",
    (hop.headers()["location"] ?? "").endsWith("/"),
    [hop.headers()["location"] ?? "(none)"],
  );

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/nothing-here`, { waitUntil: "load" });
  check("the 404 still renders in full", (await page.locator("text=404").count()) >= 1);
  check(
    "and its Back to home is a real destination",
    (await page.locator('a:has-text("Back to home")').first().getAttribute("href"))?.length > 0,
  );
} finally {
  await context.close();
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
