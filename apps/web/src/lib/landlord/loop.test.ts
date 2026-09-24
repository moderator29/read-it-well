import { describe, expect, it } from "vitest";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { StubChannel, selectPrincipalChannel, transportConfigured } from "./channel";
import { mayMessagePrincipal, type ConsentState } from "./consent";
import { drainLandlordLine, readIssuedAsk } from "./drain";
import { handleInboundReply } from "./inbound";
import type { RpcResult } from "./rpc";

/**
 * THE WHOLE LOOP, END TO END, WITH THE STUB TRANSPORT.
 *
 * The SQL half of this loop is proven against the live schema by the rolled
 * back probe recorded in the build report (PROBE_OK). This is the other half:
 * the drain, the stub, the link inside the body, the reply page's answer and a
 * simulated inbound SMS, driven against an in-memory stand-in for the database
 * functions that keeps their contract (the same names, the same arguments, the
 * same answers) and the same consent rule.
 */

const copy = getDictionary("en").landlord.sms;
const TODAY = "2026-09-24";

type Mandate = { id: string; phone: string; consent: ConsentState };
type Listing = { id: string; propertyId: string | null; closed: string | null; confirmedAt: string | null };
type Ask = {
  id: string;
  mandateId: string;
  listingId: string;
  purpose: "vacancy" | "rent";
  token: string | null;
  code: string | null;
  sent: boolean;
  answer: string | null;
  totalMinor: number | null;
};

const approvedWithConsent: ConsentState = {
  reviewStatus: "approved",
  hasNumber: true,
  consentedAt: "2026-09-20T10:00:00Z",
  withdrawnAt: null,
  expiresOn: null,
  isDemo: false,
};

/** A stand-in for the migration's functions, keeping their contract. */
function fakeDatabase(opts: { open: boolean }) {
  const mandates = new Map<string, Mandate>();
  const listings = new Map<string, Listing>();
  const asks: Ask[] = [];
  const recorded: { ask: string; channel: string; body: string; delivered: boolean }[] = [];
  let seq = 0;
  let open = opts.open;

  const may = (mandateId: string) => {
    const m = mandates.get(mandateId);
    return Boolean(m && mayMessagePrincipal(m.consent, TODAY));
  };

  function apply(ask: Ask, answer: string) {
    ask.answer = answer;
    const listing = listings.get(ask.listingId)!;
    if (answer === "available") listing.confirmedAt = "now";
    if (answer === "let") {
      for (const other of listings.values()) {
        if (other.id === listing.id || (listing.propertyId && other.propertyId === listing.propertyId)) {
          other.closed = other.id === listing.id ? "let_owner_confirmed" : "let_same_property";
        }
      }
    }
    if (answer === "not_instructed") listing.closed = "owner_denied_mandate";
    return { state: "answered", purpose: ask.purpose, answer };
  }

  const functions: Record<string, (args: Record<string, unknown>) => unknown> = {
    landlord_line_enqueue: () => {
      if (!open) return { open: false };
      let fortnightly = 0;
      for (const listing of listings.values()) {
        const mandate = [...mandates.values()].find((m) => m.id === `m-${listing.id}`);
        if (!mandate || listing.closed || !may(mandate.id)) continue;
        if (asks.some((a) => a.listingId === listing.id && a.purpose === "vacancy")) continue;
        asks.push({ id: `a${++seq}`, mandateId: mandate.id, listingId: listing.id, purpose: "vacancy", token: null, code: null, sent: false, answer: null, totalMinor: null });
        fortnightly += 1;
      }
      return { open: true, fortnightly, inspection_confirmed: 0, rent_paid: 0 };
    },
    landlord_line_issue: () =>
      asks
        .filter((a) => !a.sent)
        .map((a) => {
          a.sent = true;
          a.token = `tok${a.id}-${"x".repeat(28)}`;
          a.code = ["K7RX", "ACDE", "FHJK", "MNPR"][Number(a.id.slice(1)) % 4]!;
          const m = mandates.get(a.mandateId)!;
          return {
            ask_id: a.id,
            token: a.token,
            reply_code: a.code,
            principal_phone: m.phone,
            purpose: a.purpose,
            reason: a.purpose === "rent" ? "rent_paid" : "fortnightly",
            place: "2 bedroom apartment in Ikeja GRA",
            lister_name: "Chidi Okeke",
            total_minor: a.totalMinor,
            review_status: m.consent.reviewStatus,
            consented_at: m.consent.consentedAt,
            withdrawn_at: m.consent.withdrawnAt,
            expires_on: m.consent.expiresOn,
            is_demo: m.consent.isDemo,
          };
        }),
    landlord_line_record: (args) => {
      if (/\/landlord\/[A-Za-z0-9_-]{16,}/.test(String(args.p_body))) throw new Error("check_violation: token in body");
      recorded.push({ ask: String(args.p_ask), channel: String(args.p_channel), body: String(args.p_body), delivered: args.p_delivered === true });
      if (args.p_delivered !== true) {
        const ask = asks.find((a) => a.id === args.p_ask)!;
        ask.sent = false;
        ask.token = null;
      }
      return null;
    },
    landlord_line_answer: (args) => {
      const ask = asks.find((a) => a.token === args.p_token);
      if (!ask) return { state: "unknown" };
      if (!open) return { state: "closed" };
      if (ask.answer) return { state: "used" };
      return apply(ask, String(args.p_answer));
    },
    landlord_line_inbound: (args) => {
      if (!open) return { state: "closed" };
      const hits = asks.filter(
        (a) => a.sent && !a.answer && mandates.get(a.mandateId)!.phone === args.p_phone && (args.p_code === null || a.code === args.p_code),
      );
      if (hits.length === 0) return { state: "unknown" };
      if (hits.length > 1) return { state: "ambiguous" };
      const ask = hits[0]!;
      const digit = Number(args.p_digit);
      const answer = ask.purpose === "vacancy" ? ["available", "let", "not_instructed"][digit - 1] : ["confirmed", "disputed"][digit - 1];
      return answer ? apply(ask, answer) : { state: "invalid" };
    },
    landlord_line_requeue: () => 0,
    landlord_line_claim: (args) => {
      if (!open) return false;
      const ask = asks.find((a) => a.id === args.p_ask);
      return Boolean(ask && ask.sent && !ask.answer && may(ask.mandateId));
    },
    landlord_line_stop_number: (args) => {
      let n = 0;
      for (const m of mandates.values()) {
        if (m.phone === args.p_phone) {
          m.consent = { ...m.consent, withdrawnAt: "2026-09-24T12:00:00Z" };
          n += 1;
        }
      }
      return { state: "stopped", mandates: n };
    },
  };

  const db = {
    async rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult> {
      const handler = functions[fn];
      if (!handler) return { data: null, error: { message: `no function ${fn}` } };
      try {
        return { data: handler(args), error: null };
      } catch (error) {
        return { data: null, error: { message: (error as Error).message } };
      }
    },
  };

  return {
    db,
    mandates,
    listings,
    asks,
    recorded,
    setOpen: (value: boolean) => {
      open = value;
    },
    addListing(id: string, phone: string, consent: ConsentState, propertyId: string | null = null) {
      listings.set(id, { id, propertyId, closed: null, confirmedAt: null });
      mandates.set(`m-${id}`, { id: `m-${id}`, phone, consent });
    },
  };
}

function deps(db: unknown, channel = new StubChannel()) {
  return {
    db,
    channel,
    copy,
    origin: "https://www.vallospaces.com",
    today: TODAY,
    formatTotal: (minor: number) => formatMoney(minor, "en"),
  };
}

function tokenIn(body: string): string {
  const match = body.match(/\/landlord\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("no link in the body");
  return match[1]!;
}

describe("the landlord line, end to end with the stub", () => {
  it("does nothing at all while the flag is off", async () => {
    const fake = fakeDatabase({ open: false });
    fake.addListing("l1", "+2348031234567", approvedWithConsent);
    const channel = new StubChannel();
    const result = await drainLandlordLine(deps(fake.db, channel));
    expect(result.open).toBe(false);
    expect(channel.sent).toHaveLength(0);
    expect(fake.asks).toHaveLength(0);
  });

  it("asks, the landlord answers 1 on the page, and the listing carries the owner's confirmation", async () => {
    const fake = fakeDatabase({ open: true });
    fake.addListing("l1", "+2348031234567", approvedWithConsent);
    const channel = new StubChannel();

    const result = await drainLandlordLine(deps(fake.db, channel));
    expect(result).toMatchObject({ open: true, issued: 1, sent: 1, failed: 0, refused: 0, transport: "stub" });
    expect(channel.sent).toHaveLength(1);
    expect(channel.sent[0]!.to).toBe("+2348031234567");

    // What was stored carries no token and names the stub, so it never counts as delivered.
    expect(fake.recorded[0]).toMatchObject({ channel: "stub", delivered: true });
    expect(fake.recorded[0]!.body).toContain("/landlord/[link]");

    const token = tokenIn(channel.sent[0]!.body);
    const answered = await fake.db.rpc("landlord_line_answer", { p_token: token, p_answer: "available", p_note: null });
    expect(answered.data).toMatchObject({ state: "answered" });
    expect(fake.listings.get("l1")!.confirmedAt).not.toBeNull();

    const again = await fake.db.rpc("landlord_line_answer", { p_token: token, p_answer: "let", p_note: null });
    expect(again.data).toEqual({ state: "used" });
  });

  it("a simulated inbound '2 CODE' lets the flat and takes every copy on the property down", async () => {
    const fake = fakeDatabase({ open: true });
    fake.addListing("l1", "+2348031234567", approvedWithConsent, "p1");
    fake.addListing("l2", "+2348031234567", approvedWithConsent, "p1");
    const channel = new StubChannel();
    await drainLandlordLine(deps(fake.db, channel));
    expect(channel.sent).toHaveLength(2);

    const code = fake.asks.find((a) => a.listingId === "l2")!.code!;
    const outcome = await handleInboundReply(fake.db, { from: "08031234567", text: `2 ${code.toLowerCase()}`, channel: "sms" });
    expect(outcome).toBe("answered");
    expect(fake.listings.get("l2")!.closed).toBe("let_owner_confirmed");
    expect(fake.listings.get("l1")!.closed).toBe("let_same_property");
  });

  it("a bare digit from a number with two open questions is not guessed at", async () => {
    const fake = fakeDatabase({ open: true });
    fake.addListing("l1", "+2348031234567", approvedWithConsent);
    fake.addListing("l2", "+2348031234567", approvedWithConsent);
    await drainLandlordLine(deps(fake.db));
    expect(await handleInboundReply(fake.db, { from: "+2348031234567", text: "2", channel: "sms" })).toBe("ambiguous");
    expect([...fake.listings.values()].every((l) => l.closed === null)).toBe(true);
  });

  it("STOP withdraws consent for the number, and the next drain sends nothing to it", async () => {
    const fake = fakeDatabase({ open: true });
    fake.addListing("l1", "+2348031234567", approvedWithConsent);
    expect(await handleInboundReply(fake.db, { from: "+2348031234567", text: "stop", channel: "sms" })).toBe("stopped");
    const channel = new StubChannel();
    const result = await drainLandlordLine(deps(fake.db, channel));
    expect(result.sent).toBe(0);
    expect(channel.sent).toHaveLength(0);
  });

  it("the rent question states the frozen total to the kobo", async () => {
    const fake = fakeDatabase({ open: true });
    fake.addListing("l1", "+2348031234567", approvedWithConsent);
    fake.asks.push({ id: "a9", mandateId: "m-l1", listingId: "l1", purpose: "rent", token: null, code: null, sent: false, answer: null, totalMinor: 280_000_050 });
    const channel = new StubChannel();
    await drainLandlordLine(deps(fake.db, channel));
    const rentBody = channel.sent.find((m) => m.askId === "a9")!.body;
    expect(rentBody).toContain(formatMoney(280_000_050, "en"));
    expect(rentBody).toContain("2,800,000.50");
  });
});

describe("the server refuses to message a principal without consent (NDPA)", () => {
  /*
   * The database refuses first (proven by the probe). This proves the second
   * gate: even if a question came back from issue for a principal who has not
   * consented, or whose consent was withdrawn, the drain does not call the
   * transport, and it returns the question to unsent.
   */
  it.each([
    ["no consent", { ...approvedWithConsent, consentedAt: null }],
    ["consent withdrawn", { ...approvedWithConsent, withdrawnAt: "2026-09-21T00:00:00Z" }],
    ["mandate not approved", { ...approvedWithConsent, reviewStatus: "pending" as const }],
    ["mandate expired", { ...approvedWithConsent, expiresOn: "2026-09-01" }],
    ["an example listing", { ...approvedWithConsent, isDemo: true }],
  ])("%s: nothing reaches the transport", async (_label, consent) => {
    const fake = fakeDatabase({ open: true });
    fake.addListing("l1", "+2348031234567", approvedWithConsent);
    await fake.db.rpc("landlord_line_enqueue", {});
    fake.mandates.get("m-l1")!.consent = consent;
    const channel = new StubChannel();
    const result = await drainLandlordLine(deps(fake.db, channel));
    expect(result.refused).toBe(1);
    expect(result.sent).toBe(0);
    expect(channel.sent).toHaveLength(0);
    expect(fake.recorded.every((r) => r.delivered === false)).toBe(true);
    expect(fake.asks[0]!.sent).toBe(false);
  });

  it("the consent rule itself", () => {
    expect(mayMessagePrincipal(approvedWithConsent, TODAY)).toBe(true);
    expect(mayMessagePrincipal({ ...approvedWithConsent, hasNumber: false }, TODAY)).toBe(false);
    expect(
      mayMessagePrincipal({ ...approvedWithConsent, withdrawnAt: "2026-09-10T00:00:00Z", consentedAt: "2026-09-20T00:00:00Z" }, TODAY),
    ).toBe(true);
    expect(mayMessagePrincipal({ ...approvedWithConsent, expiresOn: TODAY }, TODAY)).toBe(true);
  });
});

describe("a STOP between issue and send is honoured", () => {
  it("claims immediately before the send, and a withdrawn number is not messaged", async () => {
    const fake = fakeDatabase({ open: true });
    fake.addListing("l1", "+2348031234567", approvedWithConsent);
    await fake.db.rpc("landlord_line_enqueue", {});
    // Issue reports consent as it was; the claim reads it as it is now.
    const realIssue = fake.db.rpc.bind(fake.db);
    const db = {
      async rpc(fn: string, args: Record<string, unknown>) {
        const out = await realIssue(fn, args);
        if (fn === "landlord_line_issue") {
          fake.mandates.get("m-l1")!.consent = { ...approvedWithConsent, withdrawnAt: "2026-09-24T09:00:00Z" };
          const rows = out.data as Record<string, unknown>[];
          return { data: rows.map((r) => ({ ...r, withdrawn_at: null })), error: null };
        }
        return out;
      },
    };
    const channel = new StubChannel();
    const result = await drainLandlordLine(deps(db, channel));
    expect(channel.sent).toHaveLength(0);
    expect(result.refused).toBe(1);
  });

  it("counts a delivered message the log refused, for the job to raise", async () => {
    const fake = fakeDatabase({ open: true });
    fake.addListing("l1", "+2348031234567", approvedWithConsent);
    const base = fake.db.rpc.bind(fake.db);
    const db = {
      async rpc(fn: string, args: Record<string, unknown>) {
        if (fn === "landlord_line_record" && args.p_delivered === true) return { data: null, error: { message: "boom" } };
        return base(fn, args);
      },
    };
    const result = await drainLandlordLine(deps(db));
    expect(result.sent).toBe(1);
    expect(result.unlogged).toBe(1);
  });
});

describe("the transport", () => {
  it("is the stub until a vendor is wired, whatever the environment says", () => {
    expect(selectPrincipalChannel({}).name).toBe("stub");
    expect(selectPrincipalChannel({ LANDLORD_LINE_TRANSPORT: "sms" }).name).toBe("stub");
    expect(transportConfigured(new StubChannel())).toBe(false);
  });

  it("a transport failure returns the question to unsent and counts it", async () => {
    const fake = fakeDatabase({ open: true });
    fake.addListing("l1", "+2348031234567", approvedWithConsent);
    const failing = { name: "sms" as const, send: async () => ({ ok: false as const, reason: "down" }) };
    const result = await drainLandlordLine({ ...deps(fake.db), channel: failing });
    expect(result).toMatchObject({ sent: 0, failed: 1 });
    expect(fake.asks[0]!.sent).toBe(false);
  });

  it("drops a malformed issue row rather than sending it", () => {
    expect(readIssuedAsk({ ask_id: "a", token: "t" })).toBeNull();
    expect(readIssuedAsk(null)).toBeNull();
  });
});
