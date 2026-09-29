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
import { expectSignInWall, qaContext, signInAsQa, SKIP_EXIT } from "./_gate.mjs";

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
  console.log(`wallet golden path against ${BASE_URL}`);

  /*
   * THE WALLET WAS RETIRED WITH CUSTODY. `/wallet` is a redirect to
   * `/agreements` (next.config.ts), and since 23 September that answers a
   * signed-out visitor with the sign-in wall. Both are asserted. The balance
   * checks below need a member whose account still draws the balance section:
   * they run signed in as the QA member, and are reported as SKIP (exit 77)
   * without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD, or when the balance section
   * is not on the page.
   */
  const res = await fetch(`${BASE_URL}/wallet`, { redirect: "manual" });
  const to = new URL(res.headers.get("location") ?? "/", BASE_URL).pathname;
  check(`/wallet forwards to /agreements (${res.status} ${to})`, [307, 308].includes(res.status) && to === "/agreements");
  await expectSignInWall(check, "/agreements", BASE_URL);

  const state = await signInAsQa(browser, { base: BASE_URL });
  if (!state) {
    await browser.close();
    if (failures.length > 0) {
      console.error(`\n${failures.length} check(s) failed.`);
      process.exit(1);
    }
    process.exit(SKIP_EXIT);
  }
  const context = await qaContext(browser, state, {
    colorScheme: "dark",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/wallet`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(1_500);

  if ((await page.locator("section[aria-labelledby='nf-wallet-balance-label']").count()) === 0) {
    console.log("  SKIP    no balance section on the page this member lands on, so there is no balance to check");
    await browser.close();
    if (failures.length > 0) {
      console.error(`\n${failures.length} check(s) failed.`);
      process.exit(1);
    }
    process.exit(SKIP_EXIT);
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
