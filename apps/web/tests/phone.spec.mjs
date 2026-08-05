/**
 * Nigerian mobile numbers, on the surface and in the rule.
 *
 * Self-contained: no runner, no config. Proof behind docs/POLISH_PASS.md
 * item 17: a `+234` input mask with carrier-aware validation.
 *
 * The rule half runs in this process against the real module, so the NCC
 * ranges are checked directly rather than through a browser. The surface half
 * drives the booking form at 390px.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/phone.spec.mjs
 */

import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const SETTLE = 1500;

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "../src");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 12)) console.log(`            ${line}`);
  }
}

/* ------------------------------------------------------------ one rule only */

console.log("\nThere is exactly one phone rule");

const phoneModule = readFileSync(join(SRC, "lib/phone.ts"), "utf8");
const application = readFileSync(join(SRC, "lib/agent/application.ts"), "utf8");
const schema = readFileSync(join(SRC, "lib/bookings/schema.ts"), "utf8");

/*
 * The agent application used to carry `/^(\+?234|0)\d{10}$/`, which accepts
 * `01234567890`. The booking form required the national number to begin 7, 8
 * or 9. The same number was valid on one screen and refused on another, and
 * the looser of the two was the one gating agent verification.
 */
check(
  "the agent application no longer has a rule of its own",
  !/PHONE_RE/.test(application) && /normalisePhone/.test(application),
);
check(
  "and the booking schema defers to the same module",
  /from "\.\.\/phone"/.test(schema) && !/function normalisePhone/.test(schema),
);

/* ------------------------------------------------------------- the ranges */

console.log("\nThe NCC ranges");

/*
 * Imported and RUN, not read. Node 22 strips the types, so the ranges are
 * exercised as code: a table asserted by regex is a table nobody has actually
 * called. If a future Node cannot load it, the import fails loudly here rather
 * than quietly passing a weaker check.
 */
const phone = await import(new URL("../src/lib/phone.ts", import.meta.url).href);
check("the phone module loads and runs", typeof phone.readPhone === "function");

for (const [number, carrier] of [
  ["08031234567", "MTN"],
  ["07031234567", "MTN"],
  ["09161234567", "MTN"],
  ["08051234567", "Glo"],
  ["09151234567", "Glo"],
  ["08021234567", "Airtel"],
  ["09121234567", "Airtel"],
  ["08091234567", "9mobile"],
  ["08181234567", "9mobile"],
  ["07021234567", "Smile"],
  ["08041234567", "ntel"],
]) {
  check(`${number} is ${carrier}`, phone.carrierOf(number) === carrier, [
    String(phone.carrierOf(number)),
  ]);
}

/* Structure is the only thing that refuses. */
for (const bad of ["01234567890", "0603 123 4567", "080312345", "080312345678", "hello"]) {
  check(`${bad} is refused`, phone.normalisePhone(bad) === null, [String(phone.normalisePhone(bad))]);
}

/* Every shape a person writes their own number in reaches the same value. */
for (const good of [
  "0803 123 4567",
  "08031234567",
  "+234 803 123 4567",
  "+2348031234567",
  "234 803 123 4567",
  "(0803) 123-4567",
]) {
  check(`"${good}" normalises to +2348031234567`, phone.normalisePhone(good) === "+2348031234567", [
    String(phone.normalisePhone(good)),
  ]);
}

/*
 * THE DECISION THIS SPEC EXISTS TO PIN DOWN. An unallocated prefix is a valid
 * number on a range we do not know yet, not an invalid number. The NCC issues
 * new ranges, and hard-refusing would reject the first customer on one of them
 * at a booking form with no way to argue.
 */
const unknownRange = phone.readPhone("07091234567");
check(
  "a number on an unrecognised range is still accepted",
  unknownRange.state === "valid" && unknownRange.carrier === null,
  [JSON.stringify(unknownRange)],
);

check("the mask groups the way the number is spoken", phone.maskNational("8031234567") === "803 123 4567");
check("and it never grows past ten digits", phone.maskNational("80312345678999") === "803 123 4567");

/* ----------------------------------------------------------------- surface */

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

try {
  console.log("\nThe booking form's phone field, 390px");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem("nf_theme", "dark");
    } catch {
      /* storage can be unavailable */
    }
  });
  const page = await ctx.newPage();
  await page.goto(BASE_URL + "/listing/seed-1", { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(SETTLE);

  const panel = page.locator('#reserve [data-testid="reserve-panel"]');
  /* The phone field only exists once somebody says the guest is another
     person, which is the only place a third party's number is collected. */
  const toggle = panel.locator('button[role="switch"]');
  check("the third-party toggle is on the form", (await toggle.count()) === 1);
  await toggle.click();
  await page.waitForTimeout(500);

  const visible = panel.locator('input[name="guestPhone"]');
  check("a phone input appeared", (await visible.count()) === 1);
  check(
    "the input you can see is the input that posts",
    (await visible.getAttribute("type")) === "tel" &&
      (await visible.getAttribute("inputmode")) === "tel",
  );

  check(
    "the country code is stated beside the field",
    (await panel.getByText("+234", { exact: true }).count()) > 0,
  );

  /* Typing bare digits must group as it goes. */
  await visible.fill("");
  await visible.type("8031234567", { delay: 12 });
  await page.waitForTimeout(300);
  check(
    "ten digits are grouped as they are typed",
    (await visible.inputValue()) === "803 123 4567",
    [await visible.inputValue()],
  );
  check(
    "and what it posts normalises to the canonical +234 form on the server",
    phone.normalisePhone(await visible.inputValue()) === "+2348031234567",
    [await visible.inputValue()],
  );
  check(
    "the network is named",
    /MTN/.test(await panel.innerText()),
    [(await panel.innerText()).slice(0, 200)],
  );

  /* A pasted number in any of the six shapes people write must be accepted,
     not refused. Refusing a correctly copied number is worse than never
     having mentioned a format. */
  for (const [typed, why] of [
    ["08031234567", "with its leading zero"],
    ["+234 803 123 4567", "in full international form"],
    ["234-803-123-4567", "with the country code and dashes"],
  ]) {
    await visible.fill("");
    await visible.type(typed, { delay: 5 });
    await page.waitForTimeout(250);
    check(
      `a number pasted ${why} normalises rather than being refused`,
      phone.normalisePhone(await visible.inputValue()) === "+2348031234567",
      [`typed ${typed}, box shows ${await visible.inputValue()}`],
    );
  }

  /* A different network must be recognised as that network. */
  await visible.fill("");
  await visible.type("8051234567", { delay: 8 });
  await page.waitForTimeout(300);
  check("a Glo range is named as Glo", /Glo/.test(await panel.innerText()));

  await visible.fill("");
  await visible.type("8091234567", { delay: 8 });
  await page.waitForTimeout(300);
  check("a 9mobile range is named as 9mobile", /9mobile/.test(await panel.innerText()));

  /* An incomplete number counts down rather than refusing. */
  await visible.fill("");
  await visible.type("80312", { delay: 8 });
  await page.waitForTimeout(300);
  const partial = await panel.innerText();
  check("an unfinished number says how many digits are left", /more digits to go/.test(partial));
  check(
    "and an unfinished number is refused by the server rule, not half accepted",
    phone.normalisePhone(await visible.inputValue()) === null,
    [await visible.inputValue()],
  );

  /* A structurally impossible number is refused, in words. */
  await visible.fill("");
  await visible.type("1234567890", { delay: 8 });
  await page.waitForTimeout(300);
  check(
    "a number that cannot be Nigerian says so and says what to type",
    /starts 070, 080, 081, 090 or 091/.test(await panel.innerText()),
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  check("the field does not push the page sideways at 390px", overflow);

  await ctx.close();
} finally {
  await browser.close();
}

console.log("");
if (failures > 0) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All phone checks passed.");
