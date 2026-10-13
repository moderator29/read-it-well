import type { DeskDeposits } from "@/lib/reservations/deposit-settings";
import type { DepositRule, DepositWindow } from "@/lib/reservations/deposit-rules";
import type { GuestDepositView } from "@/lib/reservations/guest-deposit";
import type { HostTableBoard } from "@/app/host/reservations/board";
import { deskFixture } from "../restaurant-desk/fixtures";

/**
 * Fixtures for the restaurant deposits preview (track/restaurant-deposits).
 * Made-up rows; nothing is written or seeded. Plain type imports only from
 * the server-only read modules, so the preview never pulls a read path in.
 */

const BIZ = "00000000-0000-4000-8000-0000000d9000";
const FRI = "00000000-0000-4000-8000-0000000e0005";
const SAT = "00000000-0000-4000-8000-0000000e0006";

export const PREVIEW_WINDOWS: (DepositWindow & { closes: string })[] = [
  { id: "00000000-0000-4000-8000-0000000e0002", weekday: 2, opens: "18:00:00", lastSeating: "22:00:00", closes: "23:00:00" },
  { id: FRI, weekday: 5, opens: "18:00:00", lastSeating: "22:30:00", closes: "23:30:00" },
  { id: SAT, weekday: 6, opens: "18:00:00", lastSeating: "22:30:00", closes: "23:30:00" },
];

const RULES: DepositRule[] = [FRI, SAT].map((id, i) => ({
  id: `00000000-0000-4000-8000-0000000f000${i}`,
  serviceWindowId: id,
  minPartySize: 4,
  amountMinor: 500_000,
  perGuest: true,
  refundUntilHours: 24,
  active: true,
  createdAt: "2026-10-13T09:00:00.000Z",
}));

/** A guest's preview: every party pays 5,000 naira a head at every time, so the default form shows it. */
export const GUEST_RULES: DepositRule[] = [
  { ...RULES[0]!, serviceWindowId: null, minPartySize: null, id: "00000000-0000-4000-8000-0000000f0009" },
];

export const DESK_DEPOSITS: DeskDeposits = {
  payoutReady: true,
  commissionBps: 200,
  venues: [
    {
      businessId: BIZ,
      name: "Yellow Chilli Ikoyi",
      windows: PREVIEW_WINDOWS,
      rules: RULES,
      settings: {
        on: true,
        amountMinor: 500_000,
        perGuest: true,
        minPartySize: 4,
        windowIds: [FRI, SAT],
        refundUntilHours: 24,
      },
    },
  ],
};

/** The desk board with deposit lines on three tables: due, paid, kept. */
export function deskWithDeposits(): HostTableBoard {
  const board = deskFixture();
  const lines = ["due", "paid", "forfeited"];
  let i = 0;
  const mark = <T extends { partySize: number; deposit?: unknown }>(row: T): T => {
    if (row.partySize < 4 || i >= lines.length) return row;
    const status = lines[i++]!;
    const amountMinor = 500_000 * row.partySize;
    return { ...row, deposit: { status, amountMinor, refundUntil: null, venueShareMinor: amountMinor * 0.98 } };
  };
  return {
    ...board,
    requests: board.requests.map(mark),
    upcoming: board.upcoming.map(mark),
    past: board.past.map(mark),
  };
}

const RES = "00000000-0000-4000-8000-0000000d0001";

export function guestDeposit(status: "due" | "paid" | "applied" | "refunded"): GuestDepositView {
  const paid = status !== "due";
  return {
    reservationId: RES,
    venueName: "Yellow Chilli Ikoyi",
    location: "Ikoyi, Lagos",
    reservedFor: "2026-10-16T19:30:00.000Z",
    partySize: 4,
    reservationStatus: status === "applied" ? "COMPLETED" : status === "refunded" ? "CANCELLED" : "CONFIRMED",
    deposit: {
      status,
      amountMinor: 2_000_000,
      refundUntil: "2026-10-15T19:30:00.000Z",
      refundUntilHours: 24,
      perGuest: paid ? null : true,
      paidAt: paid ? "2026-10-13T17:05:00.000Z" : null,
      decidedAt: null,
      reference: paid ? "rm-dep-0f8fad5b-d9cb-469f-a165-70867728950e" : null,
    },
    payable: status === "due",
  };
}
