import { describe, expect, it, vi, beforeEach } from "vitest";

import type { Contact } from "@/lib/email/recipients";

/**
 * The junction, tested for the two properties that make it worth having.
 *
 * WHAT THIS SPEC IS FOR. The defect it guards against is not a crash, it is a
 * silence: for weeks every listing and registration decision wrote an in-app
 * row and sent no email, with three complete builders sitting in the catalogue
 * unreferenced, and nothing anywhere could tell. A test that asserts a send
 * was ATTEMPTED is the only thing that keeps this wired once the person who
 * wired it has gone.
 *
 * The email client and the recipient lookup are the two seams. Both are
 * replaced here so nothing reaches a network and no address is invented.
 */

const sent: { to: string; subject: string }[] = [];
let contact: Contact | null = { email: "lister@example.com", name: "Chidi" };
let insertFails = false;
let sendFails = false;

vi.mock("@/lib/email/client", () => ({
  isEmailConfigured: () => true,
  bestEffortEmail: async (work: () => Promise<unknown>) => {
    try {
      await work();
    } catch {
      /* the real one swallows too */
    }
  },
  sendMessage: async (to: string, message: { subject: string }) => {
    if (sendFails) return { sent: false, reason: "rejected" as const };
    sent.push({ to, subject: message.subject });
    return { sent: true, id: "test" };
  },
}));

vi.mock("@/lib/email/recipients", () => ({
  contactForUser: async () => contact,
  contactForAgent: async () => contact,
}));

const { announce } = await import("./junction");

/** Just enough Supabase to satisfy the two calls the junction makes. */
function fakeAdmin() {
  const inserted: Record<string, unknown>[] = [];
  const client = {
    inserted,
    from(table: string) {
      return {
        insert: async (row: Record<string, unknown>) => {
          if (insertFails) return { error: new Error("no") };
          inserted.push({ table, ...row });
          return { error: null };
        },
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { user_id: "user-from-agent" } }),
          }),
        }),
      };
    },
  };
  return client;
}

beforeEach(() => {
  sent.length = 0;
  contact = { email: "lister@example.com", name: "Chidi" };
  insertFails = false;
  sendFails = false;
});

const notice = {
  kind: "listing" as const,
  title: "Listing is live",
  body: "It is in search now.",
  href: "/agent/listings",
};

describe("announcing a decision", () => {
  it("writes the in-app row and sends the email from one call", async () => {
    const admin = fakeAdmin();
    const result = await announce(admin as never, {
      recipient: { kind: "user", userId: "user-1" },
      notice,
      email: (to) => ({
        subject: `Hello ${to.name}`,
        html: "<p>hi</p>",
        text: "hi",
      }),
    });

    expect(result).toEqual({ notified: true, emailed: "sent" });
    expect(admin.inserted).toHaveLength(1);
    expect(admin.inserted[0]).toMatchObject({
      table: "notifications",
      user_id: "user-1",
      kind: "listing",
      href: "/agent/listings",
    });
    expect(sent).toEqual([{ to: "lister@example.com", subject: "Hello Chidi" }]);
  });

  /* The half that is free and in our own database goes first and goes anyway. */
  it("still writes the row when the send fails", async () => {
    sendFails = true;
    const admin = fakeAdmin();
    const result = await announce(admin as never, {
      recipient: { kind: "user", userId: "user-1" },
      notice,
      email: () => ({ subject: "s", html: "h", text: "t" }),
    });
    expect(result).toEqual({ notified: true, emailed: "failed" });
    expect(admin.inserted).toHaveLength(1);
  });

  /* And the half that reaches somebody who is not looking at the app goes even
     when our own insert failed. Neither may take the other down. */
  it("still sends the email when the row cannot be written", async () => {
    insertFails = true;
    const admin = fakeAdmin();
    const result = await announce(admin as never, {
      recipient: { kind: "user", userId: "user-1" },
      notice,
      email: () => ({ subject: "s", html: "h", text: "t" }),
    });
    expect(result).toEqual({ notified: false, emailed: "sent" });
    expect(sent).toHaveLength(1);
  });

  it("sends nothing when nobody can be resolved to send it to", async () => {
    contact = null;
    const admin = fakeAdmin();
    const result = await announce(admin as never, {
      recipient: { kind: "user", userId: "user-1" },
      notice,
      email: () => ({ subject: "s", html: "h", text: "t" }),
    });
    expect(result).toEqual({ notified: true, emailed: "skipped" });
    expect(sent).toHaveLength(0);
  });

  it("writes the row and no email for an event that has none", async () => {
    const admin = fakeAdmin();
    const result = await announce(admin as never, {
      recipient: { kind: "user", userId: "user-1" },
      notice,
      email: null,
    });
    expect(result).toEqual({ notified: true, emailed: "skipped" });
    expect(sent).toHaveLength(0);
  });

  /* A listing's owner is one hop further than it looks: listings.agent_id
     points at public.agents, whose user_id is the auth user. */
  it("resolves an agent to the auth user behind it", async () => {
    const admin = fakeAdmin();
    await announce(admin as never, {
      recipient: { kind: "agent", agentId: "agent-1" },
      notice,
      email: null,
    });
    expect(admin.inserted[0]).toMatchObject({ user_id: "user-from-agent" });
  });
});

/**
 * THE GUARD AGAINST THE DEFECT ITSELF, which is not a bug in any function.
 *
 * `listingApproved`, `listingRejected` and `welcome` were each complete,
 * correct, covered by their own unit tests and IN THE FIXTURES, and not one of
 * them had a caller. Every test passed. The only thing that could have caught
 * it is a test that asks whether the modules where decisions are taken have
 * ever heard of the modules that send mail, so that is what this asks, the
 * same way `shell.test.ts` reads the auth generator as text.
 */
describe("the decision paths are actually wired to the junction", () => {
  const read = async (path: string) => {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const here = fileURLToPath(new URL(".", import.meta.url));
    return readFile(`${here}../../${path}`, "utf8");
  };

  it("the admin console announces every listing and registration decision", async () => {
    const source = await read("lib/admin/actions.ts");
    expect(source).toContain('from "../notify/junction"');
    for (const builder of [
      "listingApproved",
      "listingPassedReview",
      "listingRejected",
      "listingChangesRequested",
      "agentApplicationApproved",
      "agentApplicationRejected",
      "agentApplicationNeedsMore",
    ]) {
      expect(source).toContain(builder);
    }
  });

  it("confirming an address sends the welcome", async () => {
    const source = await read("lib/auth/actions.ts");
    expect(source).toContain("welcomeOnce");
    /* Both paths: the six digit code and the emailed link. */
    expect(source.match(/await welcomeOnce\(/g) ?? []).toHaveLength(2);
  });

  /* The sentence that sent listers hunting for a control only an admin has. */
  it("no longer tells a lister to publish their own listing", async () => {
    const source = await read("lib/admin/actions.ts");
    expect(source).not.toContain("Publish it to put it in front of guests");
  });
});
