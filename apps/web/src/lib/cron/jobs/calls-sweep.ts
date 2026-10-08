import "server-only";

import type { JobVerdict } from "../../bookings/lifecycle";
import { getCallProvider } from "../../calls/provider";
import { closeEndedRooms, type CloseReport } from "../../calls/rooms";
import { callServiceFunction, type AdminClient } from "../rpc";

/**
 * THE CALLS SWEEP, every five minutes from Vercel Cron, behind `video_calls`.
 *
 * The database already closes calls on its own clock: `vallo_calls_sweep`
 * (pg_cron, every minute) applies every deadline, and every heartbeat applies
 * them lazily. This job does the half the database cannot: it deletes the
 * provider room of every finished call, so a stale token cannot sit in it
 * and nothing keeps metering. It runs the database sweep first so the rooms
 * it closes include calls that ran out a moment ago.
 */

export type CallsSweepResult = { looked: number; closed: number; reviewsExpired: number; rooms: CloseReport | null };

export function callsSweepVerdict(result: CallsSweepResult): JobVerdict {
  const failed = result.rooms?.failed ?? 0;
  return {
    outcome: failed > 0 ? "attention" : "ok",
    counts: {
      calls_looked: result.looked,
      calls_closed: result.closed,
      reviews_expired: result.reviewsExpired,
      rooms_closed: result.rooms?.closed ?? 0,
      rooms_failed: failed,
    },
    detail: { provider: result.rooms ? "configured" : "not_configured" },
    alert:
      failed > 0
        ? { kind: "calls.room_close_failed", severity: "warning", detail: { rooms_failed: failed } }
        : null,
  };
}

function count(data: unknown, key: string): number {
  const v = data && typeof data === "object" ? (data as Record<string, unknown>)[key] : null;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export async function callsSweep(admin: AdminClient): Promise<JobVerdict> {
  const swept = await callServiceFunction(admin, "calls_sweep_service", {});
  const provider = getCallProvider();
  const rooms = provider ? await closeEndedRooms(admin, provider, 100) : null;
  return callsSweepVerdict({
    looked: count(swept, "looked"),
    closed: count(swept, "closed"),
    reviewsExpired: count(swept, "reviews_expired"),
    rooms,
  });
}
