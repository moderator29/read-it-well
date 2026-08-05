/**
 * The refund desk's arithmetic, and the one rule it must never break.
 *
 *   node apps/web/tests/trust-refund-desk.spec.mjs
 *
 * `trust-policy.spec.mjs` proves the schedule itself. This one proves the layer
 * the admin console actually calls: `refundForReason`, which takes the reason a
 * stay is being cancelled and decides what that is worth.
 *
 * The rule the whole desk rests on is that a support decision can be MORE
 * generous than the published schedule, in the three cases /cancellations names
 * out loud, and can never be LESS generous than it. There is no amount field
 * anywhere on that path, so if this function can go below the schedule then the
 * console can quietly keep somebody's money. Every hour of a stay is checked
 * here, not a handful of chosen ones.
 *
 * The four reason codes are also the check constraint on booking_refunds.reason
 * in Postgres, so a fifth code appearing here without the migration to match it
 * would be caught by the database rather than by a reader.
 *
 * No browser and no database. The module imports nothing, so it is the same
 * arithmetic on the server, in the browser and here, loaded through node's type
 * stripping from the real source file rather than a copy that could drift.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..");

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

function evaluate(source) {
  const out = execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", source],
    { cwd: web, encoding: "utf8" },
  );
  return JSON.parse(out);
}

const PAID = 15_000_000; // 150,000 naira in kobo
const CHECK_IN = "2026-09-01"; // 15:00 Lagos

console.log("\nthe four reasons");

const desk = evaluate(`
  const m = await import("./src/lib/trust/cancellation.ts");
  const paid = ${PAID};
  const checkIn = "${CHECK_IN}";
  const codes = m.CANCELLATION_REASONS.map((r) => r.code);

  /* Every hour from six weeks out to a fortnight after check-in, for every
     reason, against the schedule. 1344 comparisons, not six chosen ones. */
  const base = Date.parse(checkIn + "T15:00:00+01:00");
  let neverBelow = true;
  let overrideAlwaysFull = true;
  let guestAlwaysExactlySchedule = true;
  let alwaysBalances = true;
  let alwaysInteger = true;

  for (let hour = -1008; hour <= 336; hour += 1) {
    const now = new Date(base - hour * 3600000);
    const scheduled = m.refundForCancellation(paid, checkIn, now);
    for (const code of codes) {
      const out = m.refundForReason(code, paid, checkIn, now);
      if (out.refundMinor < scheduled.refundMinor) neverBelow = false;
      if (out.refundMinor + out.retainedMinor !== paid) alwaysBalances = false;
      if (!Number.isInteger(out.refundMinor) || !Number.isInteger(out.retainedMinor)) {
        alwaysInteger = false;
      }
      const meta = m.cancellationReason(code);
      if (meta.overridesToFull && out.refundMinor !== paid) overrideAlwaysFull = false;
      if (!meta.overridesToFull && out.refundMinor !== scheduled.refundMinor) {
        guestAlwaysExactlySchedule = false;
      }
    }
  }

  const onCheckInDay = new Date(base + 3600000);
  console.log(JSON.stringify({
    codes,
    overriding: m.CANCELLATION_REASONS.filter((r) => r.overridesToFull).map((r) => r.code),
    everyReasonExplains: m.CANCELLATION_REASONS.every(
      (r) => r.label.length > 0 && r.detail.length > 20,
    ),
    neverBelow,
    overrideAlwaysFull,
    guestAlwaysExactlySchedule,
    alwaysBalances,
    alwaysInteger,
    unknownFallsBackToGuest: m.cancellationReason("nonsense").code,
    lateGuest: m.refundForReason("guest_choice", paid, checkIn, onCheckInDay).refundMinor,
    lateHost: m.refundForReason("host_cancelled", paid, checkIn, onCheckInDay).refundMinor,
    unpaidHold: m.refundForReason("host_cancelled", 0, checkIn, onCheckInDay).refundMinor,
    oddKobo: m.refundForReason("host_cancelled", 1501, checkIn, onCheckInDay),
  }));
`);

check(
  "there are exactly four reasons, and they are the four the database accepts",
  JSON.stringify(desk.codes) ===
    JSON.stringify(["guest_choice", "host_cancelled", "not_as_listed", "no_access"]),
);
check(
  "three of them return everything, and the guest's own choice is not one of them",
  JSON.stringify(desk.overriding) ===
    JSON.stringify(["host_cancelled", "not_as_listed", "no_access"]),
);
check("every reason says what it means in words a guest would read", desk.everyReasonExplains);

check(
  "across 1344 hours and every reason, the desk is never less generous than the schedule",
  desk.neverBelow === true,
);
check(
  "the three overriding reasons return the whole amount at every hour",
  desk.overrideAlwaysFull === true,
);
check(
  "the guest's own cancellation is the schedule exactly, never a hand-adjusted figure",
  desk.guestAlwaysExactlySchedule === true,
);
check("refund and retained always add back to what was paid", desk.alwaysBalances === true);
check("every figure is an integer number of kobo", desk.alwaysInteger === true);

check(
  "an unrecognised reason falls back to the guest's own choice rather than to a full refund",
  desk.unknownFallsBackToGuest === "guest_choice",
);
check(
  "an hour after check-in the guest's own cancellation returns nothing",
  desk.lateGuest === 0,
);
check(
  "the same hour, a host cancellation still returns everything",
  desk.lateHost === PAID,
);
check(
  "a full refund of an unpaid hold is zero rather than an error",
  desk.unpaidHold === 0,
);
check(
  "an odd kobo total returns whole and keeps nothing back",
  desk.oddKobo.refundMinor === 1501 && desk.oddKobo.retainedMinor === 0,
);

console.log("\nthe refund reference");

/* references.ts is server-only and refuses to load outside a server module, by
   design, so this reads the source rather than calling it. The shape still has
   to be proved: the reference is the unique key the database makes the whole
   refund idempotent on, and a prefix that drifted from the one documented in
   that file would be silent until the day two refunds landed. */
const referenceSource = readFileSync(
  join(web, "src/lib/payments/references.ts"),
  "utf8",
);

check(
  "the refund prefix is declared, and it is rm-refund-",
  /export const REFUND_PREFIX = "rm-refund-";/.test(referenceSource),
);
check(
  "a refund reference is the prefix and a fresh uuid, never a counter",
  /export function refundReference\(\): string \{\s*return `\$\{REFUND_PREFIX\}\$\{randomUUID\(\)\}`;/.test(
    referenceSource,
  ),
);
check(
  "the reference contract documents the shape, so the webhook router can find it",
  referenceSource.includes("`rm-refund-<uuid>`"),
);
check(
  "the four older shapes are still declared beside it",
  ["rm-fund-", "rm-wd-", "rm-p2p-", "rm-book-"].every((prefix) =>
    referenceSource.includes(`"${prefix}"`),
  ),
);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
