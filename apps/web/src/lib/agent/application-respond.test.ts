import { beforeEach, describe, expect, it, vi } from "vitest";
import { pathsBelongTo, reviewResponseSchema } from "./application-respond-schema";

/*
 * SUP-05: "Needs more information" had no way forward. These drive the action
 * that answers it against a fake client that records every write.
 */

const USER = "957b3bd2-cce3-425d-bba9-5cd876ca3d62";
type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };
let calls: Call[] = [];
let applicationStatus = "MORE_INFO_REQUIRED";

function fakeClient() {
  return {
    from(table: string) {
      const call: Call = { table, op: "select", filters: [] };
      calls.push(call);
      const chain: Record<string, unknown> = {};
      const self = new Proxy(chain, {
        get(_t, prop: string) {
          if (prop === "then") {
            return (resolve: (v: unknown) => unknown) => {
              if (table === "agent_applications" && call.op === "select") {
                return resolve({ data: { id: "app-1", reference: "VL-AGT-10016", status: applicationStatus }, error: null });
              }
              if (table === "agent_applications" && call.op === "update") {
                return resolve({ data: [{ id: "app-1" }], error: null });
              }
              return resolve({ data: null, error: null });
            };
          }
          return (...args: unknown[]) => {
            if (prop === "insert" || prop === "update") {
              call.op = prop;
              call.payload = args[0];
            } else if (prop === "eq") {
              call.filters.push([String(args[0]), args[1]]);
            }
            return self;
          };
        },
      });
      return self;
    },
  };
}

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("../locale", () => ({ getLocale: () => Promise.resolve("en") }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: () => Promise.resolve({ state: "signed-in", supabase: fakeClient(), user: { id: USER } }),
}));

const { respondToReview } = await import("./application-respond");

describe("answering a reviewer who asked for more (SUP-05)", () => {
  beforeEach(() => {
    calls = [];
    applicationStatus = "MORE_INFO_REQUIRED";
  });

  it("sends the answer and the documents back, guarded on the sent-back state", async () => {
    const result = await respondToReview({
      answer: "My BVN is on the identity document attached.",
      documents: [{ kind: "identity", path: `${USER}/batch/response-identity.jpg` }],
    });
    expect(result.ok).toBe(true);
    const doc = calls.find((c) => c.table === "agent_documents");
    expect(doc?.op).toBe("insert");
    expect(doc?.payload).toEqual([
      { application_id: "app-1", uploader_id: USER, kind: "identity", storage_path: `${USER}/batch/response-identity.jpg` },
    ]);
    const update = calls.find((c) => c.table === "agent_applications" && c.op === "update");
    expect(update?.payload).toEqual({ status: "SUBMITTED", applicant_response: "My BVN is on the identity document attached." });
    expect(update?.filters).toContainEqual(["status", "MORE_INFO_REQUIRED"]);
    // Never writes a reviewer column or a decided status.
    expect(JSON.stringify(update?.payload)).not.toMatch(/APPROVED|reviewer_id|reviewed_at|review_notes/);
  });

  it("refuses an empty send-back", async () => {
    const result = await respondToReview({ answer: "   ", documents: [] });
    expect(result.ok).toBe(false);
    expect(calls.filter((c) => c.op !== "select")).toEqual([]);
  });

  it("refuses a document from somebody else's folder", async () => {
    const result = await respondToReview({
      answer: "here",
      documents: [{ kind: "identity", path: "someone-else/batch/id.jpg" }],
    });
    expect(result.ok).toBe(false);
    expect(calls.filter((c) => c.op !== "select")).toEqual([]);
  });

  it("does nothing when the application is not waiting on the applicant", async () => {
    applicationStatus = "SUBMITTED";
    const result = await respondToReview({ answer: "again" });
    expect(result.ok).toBe(false);
    expect(calls.filter((c) => c.op !== "select")).toEqual([]);
  });
});

describe("the response schema", () => {
  it("caps the answer and the document kinds", () => {
    expect(reviewResponseSchema.safeParse({ answer: "x".repeat(2001) }).success).toBe(false);
    expect(reviewResponseSchema.safeParse({ documents: [{ kind: "ownership", path: "a/b" }] }).success).toBe(false);
    expect(pathsBelongTo("u", [{ kind: "identity", path: "u/../v/x" }])).toBe(false);
  });
});
