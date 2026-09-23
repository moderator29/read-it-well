import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE SEND EMAIL HOOK, AND THE ONE THING IT MUST REFUSE.
 *
 * An email address is permanent on this platform (founder's ruling, 23
 * September). Our own code makes a change impossible from inside the product:
 * nothing calls `updateUser({ email })` and the confirm screen no longer takes
 * an `email_change` token, both held by `lib/auth/email-immutable.test.ts`.
 *
 * This file covers the case those two cannot: a change started OUTSIDE the
 * product, from the Supabase dashboard or the admin API. GoTrue would then ask
 * this hook to post a code to the new address, and without the refusal it
 * would do it, because the hook renders one generic code email for every
 * action type.
 *
 * The signature is computed the way Supabase computes it rather than stubbed,
 * so an unsigned or mis-signed request is still proved to fail here too. A
 * test that bypassed the signature would be testing a different endpoint.
 */

const SECRET_BASE64 = Buffer.from("a-test-signing-key-32-bytes-long").toString("base64");

const sent: { to: string }[] = [];
vi.mock("@/lib/email/client", () => ({
  sendMessage: vi.fn(async (to: string) => {
    sent.push({ to });
    return { sent: true as const, id: "test-message-id" };
  }),
}));

async function post(payload: unknown) {
  const { POST } = await import("./route");
  const body = JSON.stringify(payload);
  const id = "msg_test";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", Buffer.from(SECRET_BASE64, "base64"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return POST(
    new Request("https://www.vallospaces.com/api/auth/email-hook", {
      method: "POST",
      body,
      headers: {
        "webhook-id": id,
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${signature}`,
      },
    }),
  );
}

function payloadFor(action: string) {
  return {
    user: { email: "person@example.com", user_metadata: { first_name: "Ada" } },
    email_data: { token: "123456", email_action_type: action },
  };
}

describe("the auth email hook", () => {
  beforeEach(() => {
    sent.length = 0;
    process.env["SUPABASE_AUTH_HOOK_SECRET"] = `v1,whsec_${SECRET_BASE64}`;
  });
  afterEach(() => {
    delete process.env["SUPABASE_AUTH_HOOK_SECRET"];
  });

  it("sends the code for a signup, which is the control", async () => {
    const response = await post(payloadFor("signup"));
    expect(response.status).toBe(200);
    expect(sent).toHaveLength(1);
  });

  it("refuses all three email-change actions and sends nothing", async () => {
    for (const action of ["email_change", "email_change_current", "email_change_new"]) {
      const response = await post(payloadFor(action));
      /* 200, not an error: the change is refused by not delivering the code,
         and GoTrue must not be left retrying a message we will never send. */
      expect(response.status, action).toBe(200);
      expect(await response.json()).toEqual({
        ok: true,
        reason: "email_change_is_not_permitted",
      });
    }
    expect(sent, "not one code reached an address").toEqual([]);
  });

  it("still refuses an unsigned request, so the refusal above is not the only gate", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://www.vallospaces.com/api/auth/email-hook", {
        method: "POST",
        body: JSON.stringify(payloadFor("signup")),
      }),
    );
    expect(response.status).toBe(401);
    expect(sent).toEqual([]);
  });
});
