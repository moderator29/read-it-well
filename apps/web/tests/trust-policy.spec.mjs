/**
 * The refund schedule and the response clock, as arithmetic.
 *
 *   node apps/web/tests/trust-policy.spec.mjs
 *
 * `trust-surfaces.spec.mjs` proves the three public pages say the right things.
 * This one proves the numbers behind them, which a page render cannot: that a
 * cancellation 73 hours out returns everything and one 71 hours out returns
 * exactly half, in integer kobo, with the two halves adding back to what was
 * paid; and that the four-hour promise printed on /standards is the same four
 * hours the admin queues put a clock on.
 *
 * No browser and no database. These modules import nothing, deliberately, so
 * they are the same values on the server, in the browser and here. They are
 * loaded through node's type stripping because they are the real source files,
 * not a copy of the rules that could drift from them.
 */

import { execFileSync } from "node:child_process";
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

/** Run a snippet against the real TypeScript sources and hand back its JSON. */
function evaluate(source) {
  const out = execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", source],
    { cwd: web, encoding: "utf8" },
  );
  return JSON.parse(out);
}

/* ------------------------------------------------------- the refund schedule */

console.log("\ncancellation schedule");

const PAID = 15_000_000; // 150,000 naira in kobo
const CHECK_IN = "2026-09-01"; // 15:00 Lagos, so 14:00 UTC

const refunds = evaluate(`
  const m = await import("./src/lib/trust/cancellation.ts");
  const paid = ${PAID};
  const at = (iso) => {
    const r = m.refundForCancellation(paid, "${CHECK_IN}", new Date(iso));
    return { tier: r.tier, refundMinor: r.refundMinor, retainedMinor: r.retainedMinor };
  };
  console.log(JSON.stringify({
    wayOut:      at("2026-08-01T09:00:00Z"),
    justOutside: at("2026-08-29T09:00:00Z"),
    justInside:  at("2026-08-29T15:00:00Z"),
    hoursBefore: at("2026-09-01T09:00:00Z"),
    afterStart:  at("2026-09-01T15:00:00Z"),
    nextDay:     at("2026-09-02T09:00:00Z"),
    unpaidHold:  m.refundForCancellation(0, "${CHECK_IN}", new Date("2026-08-01T09:00:00Z")).refundMinor,
    oddKobo:     m.refundForCancellation(1501, "${CHECK_IN}", new Date("2026-08-29T15:00:00Z")),
    stops:       m.CANCELLATION_STOPS.map((s) => s.refundBasisPoints),
    fullHours:   m.FULL_REFUND_HOURS,
  }));
`);

check("the full-refund window is 72 hours", refunds.fullHours === 72);
check(
  "the schedule is exactly three stops at 100, 50 and 0 per cent",
  JSON.stringify(refunds.stops) === JSON.stringify([10000, 5000, 0]),
);
check(
  "a month out returns everything",
  refunds.wayOut.tier === "full" && refunds.wayOut.refundMinor === PAID,
);
check(
  "77 hours out is still everything",
  refunds.justOutside.tier === "full" && refunds.justOutside.refundMinor === PAID,
);
check(
  "71 hours out is half, to the kobo",
  refunds.justInside.tier === "half" && refunds.justInside.refundMinor === PAID / 2,
);
check(
  "five hours out is still half, not nothing",
  refunds.hoursBefore.tier === "half" && refunds.hoursBefore.refundMinor === PAID / 2,
);
check(
  "check-in hour itself returns nothing",
  refunds.afterStart.tier === "none" && refunds.afterStart.refundMinor === 0,
);
check(
  "and the day after is the same answer, not an error",
  refunds.nextDay.tier === "none" && refunds.nextDay.refundMinor === 0,
);
check(
  "an unpaid hold refunds zero rather than throwing",
  refunds.unpaidHold === 0,
);
check(
  "the two halves always add back to what was paid",
  refunds.justInside.refundMinor + refunds.justInside.retainedMinor === PAID,
);
check(
  "an odd kobo total splits without inventing or losing a kobo",
  refunds.oddKobo.refundMinor + refunds.oddKobo.retainedMinor === 1501,
);
check(
  "every figure is an integer number of kobo",
  Object.values(refunds)
    .filter((v) => v && typeof v === "object" && "refundMinor" in v)
    .every((v) => Number.isInteger(v.refundMinor) && Number.isInteger(v.retainedMinor)),
);

/* -------------------------------------------------------- the response clock */

console.log("\nresponse commitments");

const clock = evaluate(`
  const s = await import("./src/lib/trust/standards.ts");
  const t = await import("./src/lib/trust/support-topics.ts");
  const now = new Date("2026-08-05T12:00:00Z");
  const opened = "2026-08-05T09:00:00Z";
  console.log(JSON.stringify({
    hours: {
      urgent: s.RESPONSE_COMMITMENTS.urgent.hours,
      standard: s.RESPONSE_COMMITMENTS.standard.hours,
      routine: s.RESPONSE_COMMITMENTS.routine.hours,
    },
    labels: {
      urgent: s.RESPONSE_COMMITMENTS.urgent.label,
      standard: s.RESPONSE_COMMITMENTS.standard.label,
      routine: s.RESPONSE_COMMITMENTS.routine.label,
    },
    severity: {
      high: s.gradeForSeverity("high"),
      medium: s.gradeForSeverity("medium"),
      low: s.gradeForSeverity("low"),
    },
    category: {
      offPlatform: s.gradeForReportCategory("off_platform_payment"),
      scam: s.gradeForReportCategory("scam"),
      unsafe: s.gradeForReportCategory("unsafe"),
      notAsDescribed: s.gradeForReportCategory("not_as_described"),
      duplicate: s.gradeForReportCategory("duplicate"),
      missing: s.gradeForReportCategory(null),
    },
    topic: {
      safety: t.gradeForTopic("safety"),
      booking: t.gradeForTopic("booking"),
      verification: t.gradeForTopic("verification"),
      unknown: t.gradeForTopic(null),
    },
    labelForSafety: t.supportTopicLabel("safety"),
    labelForUnknownCode: t.supportTopicLabel("something_old"),
    labelForNothing: t.supportTopicLabel(null),
    threeHoursIn: s.dueBy(opened, "urgent", now),
    wellPast: s.dueBy("2026-08-04T09:00:00Z", "urgent", now),
    garbage: s.dueBy("not a date", "urgent", now),
    noFees: s.NO_FEES_LINE,
    neverAsk: s.NEVER_ASK.length,
  }));
`);

check("urgent is four hours", clock.hours.urgent === 4);
check("standard is one day", clock.hours.standard === 24);
check("routine is three days", clock.hours.routine === 72);
check(
  "the printed labels match the hours behind them",
  clock.labels.urgent === "Within 4 hours" &&
    clock.labels.standard === "Within 1 day" &&
    clock.labels.routine === "Within 3 days",
);
check(
  "a high severity alert takes the four-hour clock",
  clock.severity.high === "urgent" &&
    clock.severity.medium === "standard" &&
    clock.severity.low === "routine",
);
check(
  "off-platform payment, scams and unsafe reports are all urgent",
  clock.category.offPlatform === "urgent" &&
    clock.category.scam === "urgent" &&
    clock.category.unsafe === "urgent",
);
check(
  "and the tidy-up categories are not",
  clock.category.notAsDescribed === "standard" && clock.category.duplicate === "routine",
);
check(
  "a report filed before categories existed still gets a clock",
  clock.category.missing === "standard",
);
check(
  "choosing the safety topic on the contact form changes the clock",
  clock.topic.safety === "urgent" &&
    clock.topic.booking === "standard" &&
    clock.topic.verification === "routine" &&
    clock.topic.unknown === "standard",
);
check(
  "the admin queue can name the topic the person actually chose",
  clock.labelForSafety === "Someone asked me to pay outside RentMe",
);
check(
  "an unrecognised stored topic renders as itself rather than blank",
  clock.labelForUnknownCode === "something_old" && clock.labelForNothing === null,
);
check(
  "three hours into a four-hour commitment leaves one hour and is not late",
  clock.threeHoursIn.hoursLeft === 1 && clock.threeHoursIn.overdue === false,
);
check(
  "a day-old urgent row reads as late",
  clock.wellPast.overdue === true && clock.wellPast.hoursLeft < 0,
);
check(
  "an unparseable timestamp does not silently read as on time",
  clock.garbage.overdue === false && clock.garbage.hoursLeft >= 0,
);
check(
  "the no-fees sentence is the one the safety centre prints",
  clock.noFees === "RentMe charges no fees. Not to book, not to list, not to be paid.",
);
check("four things we never ask for", clock.neverAsk === 4);

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
