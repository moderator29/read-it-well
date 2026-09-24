/**
 * OPS-03: the pager. Off until the founder sets a route; each route is
 * independent; nothing throws.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn(async (_m: unknown) => ({ sent: true, id: "e1" }));
vi.mock("../email/client", () => ({ sendEmail: (m: unknown) => sendEmail(m) }));

const { pageHuman } = await import("./page");

const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("ok", { status: 200 }));

beforeEach(() => {
  sendEmail.mockClear();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const INPUT = { kind: "canary.catalogue", title: "Canary: catalogue", body: "anon read 0 of 64" };

describe("pageHuman", () => {
  it("does nothing, and says so, with no route configured", async () => {
    vi.stubEnv("OPS_ALERT_EMAIL", "");
    vi.stubEnv("OPS_ALERT_WEBHOOK_URL", "");
    expect(await pageHuman(INPUT)).toEqual({ paged: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("posts the alert to the webhook as JSON", async () => {
    vi.stubEnv("OPS_ALERT_WEBHOOK_URL", "https://ntfy.sh/vallo-ops-example");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(await pageHuman(INPUT)).toEqual({ paged: true, via: ["webhook"] });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://ntfy.sh/vallo-ops-example");
    const body = JSON.parse(String(init?.body)) as { text: string; title: string };
    expect(body.title).toBe("[Vallo production] Canary: catalogue");
    expect(body.text).toContain("anon read 0 of 64");
  });

  it("emails the ops address through Resend, not the outbox", async () => {
    vi.stubEnv("OPS_ALERT_EMAIL", "ops@example.com");
    expect(await pageHuman(INPUT)).toEqual({ paged: true, via: ["email"] });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "ops@example.com" }));
  });

  it("refuses a plain-http webhook rather than posting to it", async () => {
    vi.stubEnv("OPS_ALERT_WEBHOOK_URL", "http://example.com/hook");
    vi.stubEnv("OPS_ALERT_EMAIL", "");
    expect(await pageHuman(INPUT)).toEqual({ paged: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports failure, without throwing, when no route delivers", async () => {
    vi.stubEnv("OPS_ALERT_WEBHOOK_URL", "https://ntfy.sh/x");
    fetchMock.mockImplementationOnce(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await pageHuman(INPUT)).toEqual({ paged: false, reason: "failed" });
  });
});
