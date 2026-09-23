import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { drainEmailOutbox, type OutboxRow } from "./outbox";

/**
 * THE PROOF THAT SOMEBODY RECEIVES SOMETHING.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE IS SEPARATE FROM `outbox.test.ts`.
 *
 * That file proves the queue behaves: claimed once, settled once, never lost,
 * never sent twice. It does it with a `SendPort` handed in, which is the right
 * fake for a question about the queue and the wrong one for a question about
 * delivery, because a recorded call to a function that a test supplied proves
 * only that the test's own function was called.
 *
 * THAT IS EXACTLY HOW NINE BUILDERS STAYED UNREACHABLE UNDER A GREEN SUITE.
 * Every one of them had a test. Every test rendered it. Not one of them ran
 * the path a real event takes, so not one of them could notice that no event
 * ever took it.
 *
 * So this file substitutes NOTHING inside the application. The registry, the
 * builders, the recipient resolution, `sendMessage`, `sendEmail`, the From
 * line, the text alternative and the JSON body are all the production code.
 * The only thing replaced is `globalThis.fetch`, which is the socket itself,
 * and the assertions are on THE HTTP REQUEST THAT WOULD HAVE GONE TO RESEND:
 * its URL, its bearer, its recipient, its subject, and both parts of its body.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SOCKET AND NOT THE REAL ONE.
 *
 * `api.resend.com` is refused by this environment's egress proxy, so no test
 * running here can complete a real POST, and this deployment has no Resend key
 * in any case. Stopping at the socket is therefore the furthest an automated
 * test can honestly go. What it buys is the part that was actually broken: a
 * message that is built, addressed and formatted for the wire, from a row a
 * database trigger wrote, with a real 200 and a real 422 coming back and the
 * row settling differently for each.
 */

const RECIPIENT = "11111111-1111-4111-8111-111111111111";

/* The address lookup is a GoTrue admin call, the one hop a unit test cannot
   make. Everything downstream of it is real. */
const contactForUser = vi.hoisted(() => vi.fn());
vi.mock("../email/recipients", () => ({ contactForUser }));

type StoredRow = OutboxRow & { status: string; error: string | null };

/** A password-change row, exactly as `users_enqueue_password_changed_email` writes one. */
function passwordChangedRow(): StoredRow {
  return {
    id: "row-security",
    template: "security.password_changed",
    user_id: RECIPIENT,
    payload: { at: "2026-09-23T13:05:00.000Z" },
    attempts: 0,
    status: "PENDING",
    error: null,
  };
}

function fakeDatabase(rows: StoredRow[]) {
  const settled: { id: string; result: string }[] = [];
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    if (fn === "email_outbox_claim") {
      const taken = rows.filter((row) => row.status === "PENDING");
      for (const row of taken) {
        row.status = "SENDING";
        row.attempts += 1;
      }
      return { data: taken.map((row) => ({ ...row })), error: null };
    }
    if (fn === "email_outbox_settle") {
      const id = String(args["p_id"]);
      const result = String(args["p_result"]);
      settled.push({ id, result });
      const row = rows.find((r) => r.id === id);
      if (row) row.status = result === "sent" ? "SENT" : result === "drop" ? "DROPPED" : "PENDING";
      return { data: row?.status ?? null, error: null };
    }
    return { data: {}, error: null };
  };
  const from = () => ({
    select: () => ({ in: async () => ({ data: [], error: null }) }),
  });
  return { admin: { rpc, from } as never, settled, rows };
}

/** Everything one intercepted POST tells us. */
type Captured = {
  url: string;
  method: string;
  authorization: string;
  body: {
    from?: string;
    to?: string[];
    subject?: string;
    html?: string;
    text?: string;
    reply_to?: string;
  };
};

function captureFetch(reply: { status: number; body: unknown }): {
  calls: Captured[];
  restore: () => void;
} {
  const calls: Captured[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      method: String(init?.method ?? "GET"),
      authorization: headers.get("authorization") ?? "",
      body: JSON.parse(String(init?.body ?? "{}")),
    });
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

let restoreFetch: (() => void) | null = null;

beforeEach(() => {
  contactForUser.mockReset();
  contactForUser.mockResolvedValue({ email: "ada@example.com", name: "Ada Balogun" });
  /* A key has to be present or `sendEmail` answers `unconfigured` and never
     builds a request at all, which is the branch `outbox.test.ts` covers. */
  vi.stubEnv("RESEND_API_KEY", "re_test_key_for_the_wire_format");
  vi.stubEnv("EMAIL_FROM", "Vallo <hello@vallospaces.com>");
});

afterEach(() => {
  restoreFetch?.();
  restoreFetch = null;
  vi.unstubAllEnvs();
});

describe("a row a database trigger wrote becomes a real HTTP request", () => {
  it("posts the built message to Resend, addressed to the resolved address", async () => {
    const { admin, settled, rows } = fakeDatabase([passwordChangedRow()]);
    const capture = captureFetch({ status: 200, body: { id: "resend-message-id" } });
    restoreFetch = capture.restore;

    const result = await drainEmailOutbox(admin);

    /* THE REQUEST. */
    expect(capture.calls).toHaveLength(1);
    const call = capture.calls[0];
    expect(call?.url).toBe("https://api.resend.com/emails");
    expect(call?.method).toBe("POST");
    expect(call?.authorization).toBe("Bearer re_test_key_for_the_wire_format");
    expect(call?.body.from).toBe("Vallo <hello@vallospaces.com>");
    expect(call?.body.to).toEqual(["ada@example.com"]);

    /* THE MESSAGE, built by the real `passwordChanged` builder from the real
       payload, with the clock resolved to Lagos by the real registry. */
    expect(call?.body.subject).toBe("Your Vallo password was changed");
    expect(call?.body.html).toContain("Your password was changed");
    /* `greetingName` shortens to the first name, so an email never opens
       with somebody's full legal name. */
    expect(call?.body.html).toContain("Hello Ada.");
    expect(call?.body.html).toContain("14:05");
    /* Both parts. A multipart message with no text alternative is a bulk-mail
       signature to every major filter and an empty body in a text client. */
    expect(call?.body.text).toBeTruthy();
    expect(call?.body.text).toContain("Your password was changed");

    /* EMAIL_REPLY_TO is not set on this deployment and nothing invents one, so
       no `reply_to` reaches the wire. */
    expect(call?.body.reply_to).toBeUndefined();

    /* AND THE ROW IS CLOSED. */
    expect(result.counts).toMatchObject({ claimed: 1, sent: 1 });
    expect(settled).toEqual([{ id: "row-security", result: "sent" }]);
    expect(rows[0]?.status).toBe("SENT");
  });

  it("puts the row back when Resend refuses it, and posts once, not twice", async () => {
    const { admin, settled, rows } = fakeDatabase([passwordChangedRow()]);
    const capture = captureFetch({
      status: 422,
      body: { name: "validation_error", message: "refused" },
    });
    restoreFetch = capture.restore;

    const result = await drainEmailOutbox(admin);

    expect(capture.calls).toHaveLength(1);
    expect(result.counts).toMatchObject({ claimed: 1, sent: 0, retried: 1 });
    expect(settled).toEqual([{ id: "row-security", result: "retry" }]);
    expect(rows[0]?.status).toBe("PENDING");
  });

  it("does not reach the socket at all when there is no key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { admin, settled } = fakeDatabase([passwordChangedRow()]);
    const capture = captureFetch({ status: 200, body: { id: "x" } });
    restoreFetch = capture.restore;

    const result = await drainEmailOutbox(admin);

    expect(capture.calls).toHaveLength(0);
    expect(settled).toHaveLength(0);
    expect(result.unconfigured).toBe(true);
  });
});
