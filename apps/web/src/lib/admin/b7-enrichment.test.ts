import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The B7 admin enrichment: the pure rules the four panels lean on, and the
 * two things the actions must never get wrong, which are refusing a
 * non-admin before any client exists and refusing a table taken away
 * without a reason.
 */

const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
const supabaseAdmin = vi.hoisted(() => ({ createAdminClient: vi.fn() }));

vi.mock("./guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./guard")>();
  return { ...actual, ...guard };
});

vi.mock("../supabase/admin", () => supabaseAdmin);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { decideReservationAsAdmin } from "./bookings-actions";
import {
  RESERVATION_ALREADY_ANSWERED,
  RESERVATION_ALREADY_CANCELLED,
  RESERVATION_OVER,
  reservationBucket,
  reservationTransition,
} from "./bookings-queries";
import { ADMIN_FORBIDDEN_MESSAGE } from "./guard";
import { refundState } from "./money-queries";
import { removeBankAccountAsAdmin, removePaymentMethodAsAdmin } from "./payments-actions";
import { maskAccountNumber } from "./payments-queries";
import { classifySubjectTerm, isInventoryDriftAlert } from "./queries";

const RESERVATION_ID = "22222222-2222-4222-8222-222222222222";
const ROW_ID = "33333333-3333-4333-8333-333333333333";

describe("reservationTransition", () => {
  it("lets a request be confirmed or declined, and tells the guest", () => {
    expect(reservationTransition("PENDING", "confirm")).toEqual({ next: "CONFIRMED", tells: true });
    expect(reservationTransition("PENDING", "decline")).toEqual({ next: "CANCELLED", tells: true });
  });

  it("lets a request or a confirmed table be cancelled by the platform", () => {
    expect(reservationTransition("PENDING", "cancel")).toEqual({ next: "CANCELLED", tells: true });
    expect(reservationTransition("CONFIRMED", "cancel")).toEqual({ next: "CANCELLED", tells: true });
  });

  it("refuses the host's answers on a table already answered", () => {
    expect(reservationTransition("CONFIRMED", "confirm")).toEqual({
      refusal: RESERVATION_ALREADY_ANSWERED,
    });
    expect(reservationTransition("CONFIRMED", "decline")).toEqual({
      refusal: RESERVATION_ALREADY_ANSWERED,
    });
  });

  it("refuses everything on a cancelled or finished table", () => {
    expect(reservationTransition("CANCELLED", "cancel")).toEqual({
      refusal: RESERVATION_ALREADY_CANCELLED,
    });
    expect(reservationTransition("COMPLETED", "cancel")).toEqual({ refusal: RESERVATION_OVER });
    expect(reservationTransition("NO_SHOW", "confirm")).toEqual({ refusal: RESERVATION_OVER });
  });
});

describe("reservationBucket", () => {
  const now = Date.parse("2026-09-18T12:00:00Z");
  const ahead = "2026-09-19T19:00:00Z";
  const gone = "2026-09-17T19:00:00Z";

  it("files by status while the table is ahead", () => {
    expect(reservationBucket("PENDING", ahead, now)).toBe("requests");
    expect(reservationBucket("CONFIRMED", ahead, now)).toBe("upcoming");
    expect(reservationBucket("CANCELLED", ahead, now)).toBe("past");
  });

  it("files everything whose hour has gone as past, whatever its status", () => {
    expect(reservationBucket("PENDING", gone, now)).toBe("past");
    expect(reservationBucket("CONFIRMED", gone, now)).toBe("past");
    expect(reservationBucket("PENDING", "not a date", now)).toBe("past");
  });
});

describe("refundState", () => {
  /* Track A: a refund goes back through the processor to the card or account
     that paid. There is no wallet entry; the state is the processor's. */
  it("names where the money is from the processor's own status", () => {
    expect(refundState(50_000, "submitted")).toBe("submitted");
    expect(refundState(50_000, "failed")).toBe("failed");
  });

  it("flags a refund owed that has not been submitted", () => {
    expect(refundState(50_000, null)).toBe("pending");
  });

  it("calls a zero refund nothing owed rather than failed", () => {
    expect(refundState(0, null)).toBe("nothing_owed");
    expect(refundState(0, "submitted")).toBe("nothing_owed");
  });
});

describe("maskAccountNumber", () => {
  it("shows only the last four", () => {
    expect(maskAccountNumber("0123456789")).toBe("••••••6789");
    expect(maskAccountNumber("0123 456 789")).toMatch(/6789$/);
  });

  it("never shows a short value at all", () => {
    expect(maskAccountNumber("123")).toBe("••••");
    expect(maskAccountNumber("")).toBe("••••");
  });

  it("keeps at least two dots so a masked tail never reads as the whole number", () => {
    expect(maskAccountNumber("1234")).toBe("••1234");
  });
});

describe("classifySubjectTerm", () => {
  it("reads an address, a handle and an id apart", () => {
    expect(classifySubjectTerm("Ada@Example.com")).toEqual({ by: "email", value: "ada@example.com" });
    expect(classifySubjectTerm("@Ada_Obi")).toEqual({ by: "handle", value: "ada_obi" });
    expect(classifySubjectTerm("ada.obi")).toEqual({ by: "handle", value: "ada.obi" });
    expect(classifySubjectTerm(RESERVATION_ID)).toEqual({ by: "id", value: RESERVATION_ID });
  });

  it("refuses nothing and nonsense", () => {
    expect(classifySubjectTerm("   ")).toBeNull();
    expect(classifySubjectTerm("a")).toBeNull();
    expect(classifySubjectTerm("two words")).toBeNull();
  });
});

describe("isInventoryDriftAlert", () => {
  it("matches the writer's kind on entity_type, and the title as a fallback", () => {
    expect(isInventoryDriftAlert({ entityType: "inventory_drift", title: "x" })).toBe(true);
    expect(isInventoryDriftAlert({ entityType: "room_type", title: "Inventory drift on 3 nights" })).toBe(
      true,
    );
    expect(isInventoryDriftAlert({ entityType: "message_flag", title: "Off-platform payment" })).toBe(
      false,
    );
    expect(isInventoryDriftAlert({ entityType: null, title: "Inventory" })).toBe(false);
  });
});

/* ------------------------------------------------------------- the actions */

function notAdmin() {
  guard.requireAdmin.mockResolvedValue({ state: "not-admin" });
}

function admin() {
  guard.requireAdmin.mockResolvedValue({
    state: "admin",
    supabase: {},
    user: { id: "11111111-1111-4111-8111-111111111111" },
    isAdmin: true,
    isSuperAdmin: false,
  });
}

/** A service-role client whose reads answer `row` and whose writes count. */
function adminClientAnswering(row: Record<string, unknown> | null, moved = true) {
  const calls: { table: string; op: string; payload?: unknown }[] = [];
  const builder = (table: string) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    Object.assign(chain, {
      select: vi.fn((cols?: string) => {
        calls.push({ table, op: "select", payload: cols });
        return chain;
      }),
      update: vi.fn((payload: unknown) => {
        calls.push({ table, op: "update", payload });
        return chain;
      }),
      insert: vi.fn(async (payload: unknown) => {
        calls.push({ table, op: "insert", payload });
        return { data: null, error: null };
      }),
      eq: self,
      is: self,
      gt: self,
      maybeSingle: vi.fn(async () => {
        const last = calls[calls.length - 1];
        if (last?.op === "update") {
          return { data: moved ? { id: ROW_ID } : null, error: null };
        }
        return { data: row, error: null };
      }),
      then: undefined,
    });
    return chain;
  };
  const client = { from: vi.fn((table: string) => builder(table)) };
  supabaseAdmin.createAdminClient.mockReturnValue(client);
  return { client, calls };
}

describe("decideReservationAsAdmin", () => {
  beforeEach(() => {
    guard.requireAdmin.mockReset();
    supabaseAdmin.createAdminClient.mockReset();
  });

  it("refuses a non-admin before any client exists", async () => {
    notAdmin();
    const result = await decideReservationAsAdmin({
      reservationId: RESERVATION_ID,
      decision: "confirm",
    });
    expect(result).toEqual({ ok: false, error: ADMIN_FORBIDDEN_MESSAGE });
    expect(supabaseAdmin.createAdminClient).not.toHaveBeenCalled();
  });

  it("refuses to take a table away without a reason, before reading anything", async () => {
    admin();
    const result = await decideReservationAsAdmin({
      reservationId: RESERVATION_ID,
      decision: "cancel",
      reason: "too short",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refusal");
    expect(result.fieldErrors?.["reason"]).toBeDefined();
    expect(supabaseAdmin.createAdminClient).not.toHaveBeenCalled();
  });

  it("refuses a malformed id", async () => {
    admin();
    const result = await decideReservationAsAdmin({ reservationId: "nope", decision: "confirm" });
    expect(result.ok).toBe(false);
  });

  it("confirms a request, writes the audit line and tells the guest", async () => {
    admin();
    const { calls } = adminClientAnswering({
      id: ROW_ID,
      status: "PENDING",
      guest_id: "44444444-4444-4444-8444-444444444444",
      listing_id: null,
      business_id: null,
      reserved_for: "2026-09-20T19:00:00Z",
    });
    const result = await decideReservationAsAdmin({
      reservationId: RESERVATION_ID,
      decision: "confirm",
    });
    expect(result).toEqual({ ok: true, data: { status: "CONFIRMED" } });

    const update = calls.find((c) => c.table === "reservations" && c.op === "update");
    expect(update?.payload).toMatchObject({ status: "CONFIRMED" });
    const audit = calls.find((c) => c.table === "audit_log" && c.op === "insert");
    expect(audit?.payload).toMatchObject({ action: "reservation.confirm", entity_id: ROW_ID });
    const notice = calls.find((c) => c.table === "notifications" && c.op === "insert");
    expect(notice?.payload).toMatchObject({ kind: "booking", href: "/bookings?side=stays&from=stays" });
  });

  it("refuses to confirm a table already answered, and writes nothing", async () => {
    admin();
    const { calls } = adminClientAnswering({
      id: ROW_ID,
      status: "CONFIRMED",
      guest_id: "44444444-4444-4444-8444-444444444444",
      listing_id: null,
      business_id: null,
      reserved_for: "2026-09-20T19:00:00Z",
    });
    const result = await decideReservationAsAdmin({
      reservationId: RESERVATION_ID,
      decision: "confirm",
    });
    expect(result).toEqual({ ok: false, error: RESERVATION_ALREADY_ANSWERED });
    expect(calls.some((c) => c.op === "update")).toBe(false);
  });

  it("cancels a confirmed table with the reason in the guest's notice", async () => {
    admin();
    const { calls } = adminClientAnswering({
      id: ROW_ID,
      status: "CONFIRMED",
      guest_id: "44444444-4444-4444-8444-444444444444",
      listing_id: null,
      business_id: null,
      reserved_for: "2026-09-20T19:00:00Z",
    });
    const result = await decideReservationAsAdmin({
      reservationId: RESERVATION_ID,
      decision: "cancel",
      reason: "The restaurant is closed that evening for a private event.",
    });
    expect(result).toEqual({ ok: true, data: { status: "CANCELLED" } });
    const notice = calls.find((c) => c.table === "notifications" && c.op === "insert");
    expect(String((notice?.payload as { body: string }).body)).toContain("private event");
  });
});

describe("removing a saved method for someone", () => {
  beforeEach(() => {
    guard.requireAdmin.mockReset();
    supabaseAdmin.createAdminClient.mockReset();
  });

  it("refuses a non-admin before any client exists", async () => {
    notAdmin();
    const result = await removePaymentMethodAsAdmin({ id: ROW_ID, reason: "owner asked by ticket 12" });
    expect(result).toEqual({ ok: false, error: ADMIN_FORBIDDEN_MESSAGE });
    expect(supabaseAdmin.createAdminClient).not.toHaveBeenCalled();
  });

  it("requires a reason that reads as a record", async () => {
    admin();
    const result = await removeBankAccountAsAdmin({ id: ROW_ID, reason: "asked" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected refusal");
    expect(result.fieldErrors?.["reason"]).toBeDefined();
    expect(supabaseAdmin.createAdminClient).not.toHaveBeenCalled();
  });

  it("soft-deletes, writes the audit line with ids only, and tells the owner", async () => {
    admin();
    const { calls } = adminClientAnswering({
      id: ROW_ID,
      user_id: "44444444-4444-4444-8444-444444444444",
      deleted_at: null,
    });
    /* The update's count comes from a `.is()` chain; the stub's maybeSingle is
       not reached, so give the update a count the way PostgREST would. */
    const result = await removeBankAccountAsAdmin({
      id: ROW_ID,
      reason: "Owner asked by support ticket 88 after losing their phone.",
    });
    expect(result.ok).toBe(true);

    const update = calls.find((c) => c.table === "bank_accounts" && c.op === "update");
    expect(update?.payload).toHaveProperty("deleted_at");
    const audit = calls.find((c) => c.table === "audit_log" && c.op === "insert");
    const metadata = (audit?.payload as { metadata: Record<string, unknown> }).metadata;
    expect(audit?.payload).toMatchObject({ action: "bank_account.removed_by_admin" });
    expect(Object.keys(metadata).sort()).toEqual(["owner_id", "reason"]);
    const notice = calls.find((c) => c.table === "notifications" && c.op === "insert");
    expect(notice?.payload).toMatchObject({ kind: "wallet", href: "/settings/payments" });
  });

  it("refuses to remove an entry already removed", async () => {
    admin();
    const { calls } = adminClientAnswering({
      id: ROW_ID,
      user_id: "44444444-4444-4444-8444-444444444444",
      deleted_at: "2026-09-01T00:00:00Z",
    });
    const result = await removePaymentMethodAsAdmin({
      id: ROW_ID,
      reason: "Owner asked by support ticket 88 after losing their phone.",
    });
    expect(result.ok).toBe(false);
    expect(calls.some((c) => c.op === "update")).toBe(false);
  });
});
