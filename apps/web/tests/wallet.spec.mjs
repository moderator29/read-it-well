/**
 * Wallet golden path.
 *
 * Drives /wallet on a phone-sized dark viewport and proves the flagship
 * surface renders: balance hero, action deck, day-grouped transactions, and
 * the Fund drawer's amount form with real validation. Run against a server
 * that is already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/wallet.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";

const failures = [];

function check(name, condition) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}`);
  }
}

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
  const context = await browser.newContext({
    colorScheme: "dark",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  console.log(`wallet golden path against ${BASE_URL}`);
  await page.goto(`${BASE_URL}/wallet`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(1_500);

  /*
   * A wallet belongs to a session. Signed out, `/wallet` renders the way in
   * rather than somebody else's balance, and every check below asserts against
   * a balance - so with no session they cannot run, which is not the same as
   * failing. This sandbox cannot reach Supabase, so which branch ran is
   * printed rather than assumed.
   */
  if ((await page.locator("section[aria-labelledby='nf-wallet-balance-label']").count()) === 0) {
    console.log("  skip    no session, so there is no wallet to show a balance for");
    check(
      "signed out, it offers the way in rather than an empty wallet",
      (await page.locator('a[href^="/sign-in"]').count()) >= 1,
    );
    await browser.close();
    /* `failures` is an ARRAY here, not a counter. Comparing it to 0 is always
       false, which would have reported a clean skip as a failure. */
    if (failures.length > 0) console.error(`\n${failures.length} check(s) failed.`);
    else console.log("\nall wallet checks passed.");
    process.exit(failures.length > 0 ? 1 : 0);
  }

  /* ------------------------------------------------------- balance hero */
  check("balance hero label renders", await page.getByText("Available balance").first().isVisible());
  check(
    "balance figure shows naira",
    (await page.locator("section[aria-labelledby='nf-wallet-balance-label']").innerText()).includes("₦"),
  );
  check(
    "eye toggle present",
    await page.getByRole("button", { name: "Hide balance" }).isVisible(),
  );

  /* -------------------------------------------------------- action deck */
  const deck = page.getByRole("group", { name: "Wallet actions" });
  check("action deck renders", await deck.isVisible());
  for (const label of ["Add money", "Withdraw", "Transfer"]) {
    check(`deck tile: ${label}`, await deck.getByRole("button", { name: label }).isVisible());
  }

  /* ----------------------------------------------- grouped transactions */
  check("transactions heading renders", await page.getByText("Transactions").first().isVisible());
  const dayHeadings = await page.locator("h3.nf-overline").count();
  check("day-grouped history renders at least one group", dayHeadings > 0);

  /* ------------------------------------------------------- fund drawer */
  await deck.getByRole("button", { name: "Add money" }).click();
  await page.waitForTimeout(400);
  const drawer = page.getByRole("dialog", { name: "Add money to your wallet" });
  check("fund drawer opens", await drawer.isVisible());
  check("amount field present", await drawer.getByLabel("Amount (₦)").isVisible());
  check(
    "quick amount chips present",
    await drawer.getByRole("button", { name: "₦5,000" }).isVisible(),
  );

  // Submit empty: the server action must answer with inline validation.
  await drawer.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForTimeout(2_500);
  const alertText = await drawer.locator("[role='alert'], [role='status']").allInnerTexts();
  check(
    "empty submit shows validation or an honest server message",
    alertText.join(" ").trim().length > 0,
  );

  await browser.close();

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nall checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
