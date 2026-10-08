import { describe, expect, it } from "vitest";
import { callsSweepVerdict } from "../cron/jobs/calls-sweep";
import { CALL_GENERIC_ERROR, callErrorToken, callErrorWords } from "./errors";
import { callMediaOrigins } from "./media-origins";
import { REVIEW_SCOPE_BY_CASE, reviewActions, staffReviewFromRow, subjectReviewFromRow } from "./reviews";
import {
  addReviewEntrySchema,
  completeReviewCallSchema,
  requestReviewCallSchema,
  respondReviewCallSchema,
  startCallSchema,
} from "./schema";
import { vc1Migration } from "./testing/vc1-migration";
import { REVIEW_CASE_KINDS } from "./types";

const ID = "44444444-4444-4444-8444-444444444444";

describe("errors", () => {
  it("turns every token the migration raises into a sentence of its own", () => {
    const raised = new Set([...vc1Migration().matchAll(/raise exception '((?:call|review):[a-z_]+)'/g)].map((m) => m[1]!));
    expect(raised.size).toBeGreaterThan(20);
    for (const token of raised) {
      const words = callErrorWords({ message: token });
      expect(words, token).not.toBe("");
      expect(words, token).not.toContain(token);
      expect(words, token).not.toContain("—");
    }
    expect(callErrorWords({ message: "call:blocked" })).toMatch(/blocked/);
  });

  it("never shows a database message", () => {
    const pg = { message: 'duplicate key value violates unique constraint "calls_pkey"' };
    expect(callErrorToken(pg)).toBeNull();
    expect(callErrorWords(pg)).toBe(CALL_GENERIC_ERROR);
    expect(callErrorWords(null)).toBe(CALL_GENERIC_ERROR);
  });
});

describe("rate limits live where the write happens", () => {
  it("the migration limits starts, pairs, tokens and review requests at the agreed numbers", () => {
    const sql = vc1Migration();
    const limits = Object.fromEntries(
      [...sql.matchAll(/consume_rate_limit\('([a-z:]+)', [^,]+(?:\|\|[^,]+)*, (\d+), (\d+)\)/g)].map((m) => [m[1], [Number(m[2]), Number(m[3])]]),
    );
    expect(limits).toEqual({
      "call:start": [10, 600],
      "call:start:day": [60, 86400],
      "call:pair": [4, 600],
      "call:token": [30, 300],
      "call:review:request": [30, 3600],
      "call:review:start": [20, 600],
    });
    expect(sql).toContain("errcode = '54000'");
  });
});

describe("review scopes", () => {
  it("are the database's map, one least-privilege scope per case kind", () => {
    const sql = vc1Migration();
    const block = sql.slice(sql.indexOf("-- REVIEW SCOPES BEGIN"), sql.indexOf("-- REVIEW SCOPES END"));
    const fromSql = Object.fromEntries([...block.matchAll(/when '([a-z_]+)' then '([a-z_]+)'/g)].map((m) => [m[1], m[2]]));
    expect(fromSql).toEqual(REVIEW_SCOPE_BY_CASE);
    expect(Object.keys(REVIEW_SCOPE_BY_CASE).sort()).toEqual([...REVIEW_CASE_KINDS].sort());
  });

  it("offers start only to an accepted review or inside a scheduled window", () => {
    const at = "2026-10-08T15:00:00Z";
    expect(reviewActions("REQUESTED", null, new Date("2026-10-08T12:00:00Z")).canStart).toBe(false);
    expect(reviewActions("ACCEPTED", null, new Date("2026-10-08T12:00:00Z")).canStart).toBe(true);
    expect(reviewActions("SCHEDULED", at, new Date("2026-10-08T14:49:00Z")).canStart).toBe(false);
    expect(reviewActions("SCHEDULED", at, new Date("2026-10-08T14:51:00Z")).canStart).toBe(true);
    expect(reviewActions("SCHEDULED", at, new Date("2026-10-08T15:31:00Z")).canStart).toBe(false);
    expect(reviewActions("COMPLETED", null, new Date()).canComplete).toBe(false);
  });

  it("never carries a staff field into the subject's view", () => {
    const row = {
      id: ID,
      kind: "VIDEO",
      case_kind: "listing",
      case_words: "listing",
      purpose: "Walk us through the flat",
      status: "REQUESTED",
      respond_by: "2026-10-10T00:00:00Z",
      created_at: "2026-10-08T00:00:00Z",
      requester_label: "Vallo review team",
      required_scope: "listing_approval",
      requested_by: ID,
    };
    const subject = subjectReviewFromRow(row)!;
    expect(Object.keys(subject)).not.toContain("requiredScope");
    expect(Object.keys(subject)).not.toContain("requestedBy");
    expect(staffReviewFromRow(row)!.requiredScope).toBe("listing_approval");
    expect(staffReviewFromRow({ ...row, required_scope: "finance" })).toBeNull();
  });
});

describe("input validation", () => {
  it("takes ids and choices from a client, never a state or a room", () => {
    const parsed = startCallSchema.safeParse({ conversationId: ID, kind: "VIDEO", state: "ACTIVE", room: "x" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(Object.keys(parsed.data).sort()).toEqual(["conversationId", "kind"]);
    expect(startCallSchema.safeParse({ conversationId: "not-a-uuid", kind: "VIDEO" }).success).toBe(false);
    expect(startCallSchema.safeParse({ conversationId: ID, kind: "SCREEN" }).success).toBe(false);
  });

  it("asks a reviewer for a real reason and a proposer for a time", () => {
    expect(requestReviewCallSchema.safeParse({ caseKind: "listing", caseId: ID, purpose: "short" }).success).toBe(false);
    expect(requestReviewCallSchema.safeParse({ caseKind: "wallet", caseId: ID, purpose: "A long enough reason" }).success).toBe(false);
    expect(requestReviewCallSchema.safeParse({ caseKind: "listing", caseId: ID, purpose: "A long enough reason" }).success).toBe(true);
    expect(respondReviewCallSchema.safeParse({ reviewId: ID, response: "PROPOSE" }).success).toBe(false);
    expect(respondReviewCallSchema.safeParse({ reviewId: ID, response: "PROPOSE", proposedFor: "2026-10-09T10:00:00Z" }).success).toBe(true);
  });

  it("holds evidence to a record reference and a follow-up to a date", () => {
    expect(addReviewEntrySchema.safeParse({ reviewId: ID, kind: "EVIDENCE", body: "Deed" }).success).toBe(false);
    expect(addReviewEntrySchema.safeParse({ reviewId: ID, kind: "EVIDENCE", body: "Deed", evidenceRef: "https://evil.example/x" }).success).toBe(false);
    expect(addReviewEntrySchema.safeParse({ reviewId: ID, kind: "EVIDENCE", body: "Deed", evidenceRef: `listing:${ID}` }).success).toBe(true);
    expect(completeReviewCallSchema.safeParse({ reviewId: ID, outcome: "FOLLOW_UP_REQUIRED", summary: "Needs a deed" }).success).toBe(false);
    expect(completeReviewCallSchema.safeParse({ reviewId: ID, outcome: "CANCELLED", summary: "No" }).success).toBe(false);
  });
});

describe("CSP origins for calls", () => {
  it("adds nothing without a URL, a cloud wildcard for LiveKit Cloud, the exact host otherwise", () => {
    expect(callMediaOrigins(undefined)).toEqual([]);
    expect(callMediaOrigins("not a url")).toEqual([]);
    expect(callMediaOrigins("wss://vallo-abc.livekit.cloud")).toEqual(["https://*.livekit.cloud", "wss://*.livekit.cloud"]);
    expect(callMediaOrigins("wss://calls.vallospaces.com")).toEqual(["https://calls.vallospaces.com", "wss://calls.vallospaces.com"]);
    expect(callMediaOrigins("ws://127.0.0.1:7880")).toEqual(["http://127.0.0.1:7880", "ws://127.0.0.1:7880"]);
    expect(callMediaOrigins("wss://livekit.cloud.evil.example")).toEqual(["https://livekit.cloud.evil.example", "wss://livekit.cloud.evil.example"]);
  });
});

describe("the calls sweep verdict", () => {
  it("is ok when every room closed and asks for attention when one did not", () => {
    expect(callsSweepVerdict({ looked: 3, closed: 1, reviewsExpired: 0, rooms: { looked: 2, closed: 2, failed: 0 } }).outcome).toBe("ok");
    const bad = callsSweepVerdict({ looked: 0, closed: 0, reviewsExpired: 0, rooms: { looked: 2, closed: 1, failed: 1 } });
    expect(bad.outcome).toBe("attention");
    expect(bad.alert?.kind).toBe("calls.room_close_failed");
  });
});
