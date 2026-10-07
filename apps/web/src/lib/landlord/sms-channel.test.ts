import { describe, expect, it, vi } from "vitest";
import { selectPrincipalChannel, transportConfigured } from "./channel";
import { SmsChannel } from "./sms-channel";

/*
 * WHAT THESE TESTS ARE, AND ARE NOT. The fetcher is a fake that answers with
 * recorded shapes of Termii's `POST /api/sms/send` response (the shape the
 * phone-code transport already reads). None of this has met Termii itself: no
 * real message has been sent, the sender ID "Vallo" is not yet approved, and
 * whether Termii's live answer matches these shapes is checked only by the
 * first real send.
 */

const ENV = { TERMII_API_KEY: "test-key", TERMII_SENDER_ID: "Vallo" };
const MESSAGE = { askId: "ask-1", to: "+2348031234567", body: "Is the 2 bedroom apartment in Ikeja GRA still available? 1 K7RX" };

/* Fixture shapes, not captured from a live call: Termii's success answer as
   the phone-code transport reads it (`code` and `message_id`), and an error. */
const ACCEPTED = { code: "ok", message_id: "9122821270554876574", message: "Successfully Sent", balance: 9, user: "Vallo" };
const REFUSED = { message: "ApplicationSenderId not found" };

function fake(response: () => Response | Promise<Response>) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> });
    return response();
  });
  return { fetcher, calls };
}

describe("the Termii landlord channel", () => {
  it("sends on the DND route only and returns Termii's message id as the reference", async () => {
    const { fetcher, calls } = fake(() => new Response(JSON.stringify(ACCEPTED), { status: 200 }));
    const outcome = await new SmsChannel(ENV, fetcher).send(MESSAGE);
    expect(outcome).toEqual({ ok: true, ref: "9122821270554876574" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.ng.termii.com/api/sms/send");
    expect(calls[0]!.body).toEqual({
      api_key: "test-key",
      to: "2348031234567",
      from: "Vallo",
      sms: MESSAGE.body,
      type: "plain",
      channel: "dnd",
    });
  });

  it("a provider refusal is a failure, and the generic route is never tried", async () => {
    const { fetcher, calls } = fake(() => new Response(JSON.stringify(REFUSED), { status: 400 }));
    expect(await new SmsChannel(ENV, fetcher).send(MESSAGE)).toEqual({ ok: false, reason: "provider_refused" });
    expect(calls.map((call) => call.body.channel)).toEqual(["dnd"]);
  });

  it("a 200 without an acceptance is still a refusal", async () => {
    const { fetcher } = fake(() => new Response(JSON.stringify({ code: "error" }), { status: 200 }));
    expect(await new SmsChannel(ENV, fetcher).send(MESSAGE)).toEqual({ ok: false, reason: "provider_refused" });
  });

  it("a network error is a failure, not a throw", async () => {
    const { fetcher } = fake(() => {
      throw new TypeError("fetch failed");
    });
    expect(await new SmsChannel(ENV, fetcher).send(MESSAGE)).toEqual({ ok: false, reason: "network_error" });
  });

  it("without the key or the sender ID it says not_configured and never calls out", async () => {
    for (const env of [{}, { TERMII_API_KEY: "test-key" }, { TERMII_SENDER_ID: "Vallo" }]) {
      const { fetcher } = fake(() => new Response(JSON.stringify(ACCEPTED), { status: 200 }));
      expect(await new SmsChannel(env, fetcher).send(MESSAGE)).toEqual({ ok: false, reason: "not_configured" });
      expect(fetcher).not.toHaveBeenCalled();
    }
  });

  it("refuses a number Termii cannot reach without calling out", async () => {
    const { fetcher } = fake(() => new Response(JSON.stringify(ACCEPTED), { status: 200 }));
    const outcome = await new SmsChannel(ENV, fetcher).send({ ...MESSAGE, to: "+14155550100" });
    expect(outcome).toEqual({ ok: false, reason: "unsupported_number" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("never logs the number or the body", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    for (const response of [ACCEPTED, REFUSED]) {
      const { fetcher } = fake(() => new Response(JSON.stringify(response), { status: response === ACCEPTED ? 200 : 400 }));
      await new SmsChannel(ENV, fetcher).send(MESSAGE);
    }
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });
});

describe("selecting the landlord channel", () => {
  it("LANDLORD_LINE_TRANSPORT=sms is Termii, and counts as a real transport", () => {
    const channel = selectPrincipalChannel({ LANDLORD_LINE_TRANSPORT: " SMS ", ...ENV });
    expect(channel.name).toBe("sms");
    expect(channel).toBeInstanceOf(SmsChannel);
    expect(transportConfigured(channel)).toBe(true);
  });

  it("a vendor with no implementation is still the stub", () => {
    expect(selectPrincipalChannel({ LANDLORD_LINE_TRANSPORT: "whatsapp" }).name).toBe("stub");
  });
});
