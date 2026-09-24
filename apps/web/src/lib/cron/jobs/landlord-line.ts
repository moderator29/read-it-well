import "server-only";

import { formatMoney, getDictionary } from "@vallo/i18n";
import type { JobVerdict } from "../../bookings/lifecycle";
import { selectPrincipalChannel } from "../../landlord/channel";
import { drainLandlordLine, type DrainResult } from "../../landlord/drain";
import { lagosToday } from "../../rent/schema";
import { siteUrl } from "../../site";
import type { AdminClient } from "../rpc";

/**
 * THE LANDLORD LINE'S SCHEDULED RUN. V-31 and V-32.
 *
 * Every fifteen minutes: queue what is due (the fortnightly vacancy question,
 * the question on the day an inspection is confirmed, the rent figures the day
 * a charge is paid), issue it, send it through the selected channel, record it.
 * The 21 day "Not reconfirmed" sweep is pure SQL and runs on pg_cron as
 * `vallo_landlord_not_reconfirmed`, beside the badge sweep.
 *
 * WHILE THE FLAG IS OFF THIS IS A NO-OP THAT SAYS SO. `landlord_line_enqueue`
 * answers `open: false` and nothing else happens, which is a clean run.
 *
 * THE ONE THING THAT PUTS IT ON THE DESK: the line is open in production and
 * the transport is still the stub. Every question is then recorded and none
 * is delivered. The sweep will not punish anybody for that (it counts only
 * questions delivered on a real channel), but nobody is being asked either,
 * and the founder switched the line on expecting landlords to be.
 */

export function landlordLineVerdict(result: DrainResult, production: boolean): JobVerdict {
  const counts = {
    fortnightly: result.queued.fortnightly,
    inspection_confirmed: result.queued.inspectionConfirmed,
    rent_paid: result.queued.rentPaid,
    issued: result.issued,
    sent: result.sent,
    failed: result.failed,
    refused: result.refused,
    unlogged: result.unlogged,
  };
  const detail = { open: result.open, transport: result.transport };

  if (result.error) {
    return {
      outcome: "attention",
      counts,
      detail: { ...detail, error: result.error },
      alert: { kind: "landlord_line.failed", severity: "warning", detail: { ...detail, error: result.error } },
    };
  }
  if (result.unlogged > 0) {
    return {
      outcome: "attention",
      counts,
      detail,
      alert: {
        kind: "landlord_line.unlogged",
        severity: "critical",
        detail: { ...detail, unlogged: result.unlogged, note: "A landlord was messaged and the message log write failed." },
      },
    };
  }
  if (result.open && production && result.transport === "stub") {
    return {
      outcome: "attention",
      counts,
      detail,
      alert: {
        kind: "landlord_line.stub_transport",
        severity: "warning",
        detail: { ...detail, note: "The landlord line is on and no SMS or WhatsApp transport is wired, so nothing is delivered." },
      },
    };
  }
  if (result.failed > 0) {
    return {
      outcome: "attention",
      counts,
      detail,
      alert: { kind: "landlord_line.send_failed", severity: "warning", detail: { ...detail, failed: result.failed } },
    };
  }
  return { outcome: "ok", counts, detail, alert: null };
}

export async function landlordLine(admin: AdminClient): Promise<JobVerdict> {
  const channel = selectPrincipalChannel();
  const result = await drainLandlordLine({
    db: admin,
    channel,
    copy: getDictionary("en").landlord.sms,
    origin: siteUrl(),
    today: lagosToday(),
    formatTotal: (minor) => formatMoney(minor, "en"),
  });
  return landlordLineVerdict(result, process.env.VERCEL_ENV === "production");
}
