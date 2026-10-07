import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * D49.3: SERVER READS THAT FAIL SAY SO TO US, NOT ONLY TO THE SCREEN.
 *
 * Each of these reads catches a throw and returns its "could not be read"
 * answer, which is right for the person in front of it. They used to do it
 * silently, so schema drift or a row level security policy refusing the read
 * looked like an empty state in production forever. Each catch now reports
 * through `reportError` with a machine token naming the read, and still
 * returns the same answer. A client whose every query throws stands in for
 * the failure.
 */

const reported = vi.hoisted(() => [] as { kind: unknown; error: unknown }[]);

vi.mock("@/lib/observability/report", () => ({
  reportError: vi.fn(async (input: { error: unknown; context?: { kind?: unknown } }) => {
    reported.push({ kind: input.context?.kind, error: input.error });
    return { sent: false, reason: "not_configured" };
  }),
}));

const BROKEN = new Error("relation does not exist");
const throwing = {
  from: () => {
    throw BROKEN;
  },
  rpc: () => {
    throw BROKEN;
  },
} as unknown as SupabaseClient<Database>;

vi.mock("@/lib/actions/session", () => ({
  resolveSession: async () => ({ state: "signed-in", supabase: throwing, user: { id: "u" } }),
}));

const ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  reported.length = 0;
});

describe("a server read that throws is reported, and still answers", () => {
  it("the notification view", async () => {
    const { loadNotificationView } = await import("@/app/(app)/notifications/[id]/load");
    expect(await loadNotificationView(throwing, ID)).toEqual({ state: "error" });
    expect(reported).toEqual([{ kind: "read.notification_view", error: BROKEN }]);
  });

  it("the profile badges", async () => {
    const { readProfileBadges } = await import("@/components/social/profile/badges-read");
    expect(await readProfileBadges(throwing, ID, "en")).toBeNull();
    expect(reported).toEqual([{ kind: "read.profile_badges", error: BROKEN }]);
  });

  it("the agreement record and the kept versions", async () => {
    const { readAgreementRecord, readKeptVersions } = await import("@/components/app/agreements/record-read");
    expect(await readAgreementRecord(ID)).toBeNull();
    expect(await readKeptVersions([ID])).toBeNull();
    expect(reported).toEqual([
      { kind: "read.agreement_record", error: BROKEN },
      { kind: "read.agreement_versions", error: BROKEN },
    ]);
  });

  it("the Pro entitlement", async () => {
    const { presentEntitlement } = await import("@/components/app/pro/pro-entitlement");
    const failing = async () => {
      throw BROKEN;
    };
    expect(await presentEntitlement("host", failing)).toBeNull();
    expect(reported).toEqual([{ kind: "read.pro_entitlement", error: BROKEN }]);
  });

  it("an answer that is genuinely empty is not reported", async () => {
    const { presentEntitlement } = await import("@/components/app/pro/pro-entitlement");
    expect(await presentEntitlement("host", async () => null)).toBeNull();
    expect(reported).toEqual([]);
  });
});
