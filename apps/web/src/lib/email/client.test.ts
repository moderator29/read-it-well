import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bestEffortEmail, emailFrom, isEmailConfigured, sendEmail, sendMessage } from "./client";

/**
 * The send guards, checked as behaviour.
 *
 * These rules used to be asserted by a script that read `client.ts` as text and
 * matched regular expressions against it. That check passes on a comment and
 * fails on a rename, which is the wrong way round, so it is done here by
 * calling the thing.
 *
 * Every rule below exists because the alternative is a specific incident:
 *
 *   an email attempted with no API key, so a local run tries to reach Resend
 *   on every save and a preview environment mails real people;
 *   a message sent with no text/plain part, which is a bulk-mail signature to
 *   every major spam filter and lands a wallet receipt in spam;
 *   a mail failure thrown out of a server action, rolling back a booking that
 *   had already been paid for;
 *   a recipient address or a message body written to the logs, which is a
 *   privacy incident on a platform holding people's home addresses.
 *
 * `fetch` is stubbed throughout. Nothing here reaches the network, and the one
 * test that proves nothing is attempted asserts exactly that.
 */

const KEY = "RESEND_API_KEY";
const FROM = "EMAIL_FROM";

let fetchMock: ReturnType<typeof vi.fn>;

/** A Resend success, the shape the real API returns. */
function ok(id = "re_123") {
  return {
    ok: true,
    status: 200,
    json: async () => ({ id }),
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock = vi.fn(async () => ok());
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv(KEY, "re_test_key");
  vi.stubEnv(FROM, "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const MESSAGE = {
  subject: "Your stay is confirmed",
  html: "<p>Hello</p>",
  text: "Hello",
};

describe("nothing leaves the process without a key", () => {
  it("attempts no request at all when RESEND_API_KEY is absent", async () => {
    vi.stubEnv(KEY, "");
    const result = await sendEmail({ to: "ada@example.com", ...MESSAGE });
    expect(result).toEqual({ sent: false, reason: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the key on every call, so adding one needs no rebuild", async () => {
    vi.stubEnv(KEY, "");
    expect(isEmailConfigured()).toBe(false);
    vi.stubEnv(KEY, "re_added_later");
    expect(isEmailConfigured()).toBe(true);
  });

  it("bestEffortEmail does not even run its work when unconfigured", async () => {
    vi.stubEnv(KEY, "");
    const work = vi.fn(async () => undefined);
    await bestEffortEmail(work);
    expect(work).not.toHaveBeenCalled();
  });
});

describe("an address is checked before it is used", () => {
  it.each(["", "   ", "ada", "ada@localhost", "ada @example.com", "@example.com"])(
    "refuses %j without attempting a send",
    async (address) => {
      const result = await sendEmail({ to: address, ...MESSAGE });
      expect(result).toEqual({ sent: false, reason: "invalid-recipient" });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("accepts an ordinary address and reports the id", async () => {
    const result = await sendEmail({ to: " ada.obi@example.com ", ...MESSAGE });
    expect(result).toEqual({ sent: true, id: "re_123" });
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    // Trimmed, and a single recipient. One email, one person.
    expect(body.to).toEqual(["ada.obi@example.com"]);
  });
});

describe("the text alternative reaches the wire", () => {
  it("sendMessage carries the whole message, text included", async () => {
    await sendMessage("ada@example.com", MESSAGE);
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    /*
     * This is the reason sendMessage exists. Spreading a message into sendEmail
     * by hand compiles perfectly while silently dropping `text`, and a message
     * with no text/plain part scores worse with every major spam filter.
     */
    expect(body.text).toBe(MESSAGE.text);
    expect(body.html).toBe(MESSAGE.html);
    expect(body.subject).toBe(MESSAGE.subject);
  });

  it("omits the field rather than sending an empty text part", async () => {
    await sendEmail({ to: "ada@example.com", subject: "s", html: "<p>h</p>" });
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect("text" in body).toBe(false);
  });

  it("speaks the REST API's snake_case for a reply address", async () => {
    // The SDK takes replyTo; the REST endpoint takes reply_to and silently
    // ignores anything else, so a wrong key here loses replies with no error.
    await sendMessage("ada@example.com", MESSAGE, { replyTo: "support@rentme.ng" });
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body.reply_to).toBe("support@rentme.ng");
  });
});

describe("a failure is a value, never an exception", () => {
  it("reports a rejection by result", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ name: "validation_error" }),
    } as unknown as Response);
    const result = await sendEmail({ to: "ada@example.com", ...MESSAGE });
    expect(result).toEqual({ sent: false, reason: "rejected", status: 422 });
  });

  it("reports an unreachable service by result", async () => {
    fetchMock.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND"));
    const result = await sendEmail({ to: "ada@example.com", ...MESSAGE });
    expect(result).toEqual({ sent: false, reason: "unreachable" });
  });

  it("names a timeout as a timeout, not as an outage", async () => {
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    fetchMock.mockRejectedValueOnce(timeout);
    const result = await sendEmail({ to: "ada@example.com", ...MESSAGE });
    expect(result).toEqual({ sent: false, reason: "timeout" });
  });

  it("survives a body that is not JSON", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);
    const result = await sendEmail({ to: "ada@example.com", ...MESSAGE });
    expect(result).toEqual({ sent: true, id: null });
  });

  it("bestEffortEmail swallows anything the work throws", async () => {
    /*
     * The guarantee every send site relies on. A booking that saved is a
     * booking that succeeded, whatever happens to its email, so a failure
     * inside rendering or a recipient lookup must not propagate into a server
     * action that has already committed to the database.
     */
    await expect(
      bestEffortEmail(async () => {
        throw new Error("recipient lookup exploded");
      }),
    ).resolves.toBeUndefined();
  });
});

describe("nothing private is written to the logs", () => {
  it("logs the reason and the status, never the recipient or the message", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ name: "restricted_api_key" }),
    } as unknown as Response);

    await sendEmail({
      to: "ada.obi@example.com",
      subject: "Your gate code is 4471",
      html: "<p>12 Herbert Macaulay Way</p>",
      text: "12 Herbert Macaulay Way",
    });

    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).toContain("403");
    expect(logged).toContain("restricted_api_key");
    for (const secret of ["ada.obi@example.com", "4471", "Herbert Macaulay"]) {
      expect(logged).not.toContain(secret);
    }
  });
});

describe("the sender", () => {
  it("defaults to the Vallo address when EMAIL_FROM is unset", () => {
    expect(emailFrom()).toBe("Vallo <hello@rentme.ng>");
  });

  it("honours EMAIL_FROM when it is set", () => {
    vi.stubEnv(FROM, "Vallo <no-reply@rentme.ng>");
    expect(emailFrom()).toBe("Vallo <no-reply@rentme.ng>");
  });
});
