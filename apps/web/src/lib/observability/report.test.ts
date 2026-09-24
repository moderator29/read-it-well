/**
 * Error reporting activates when SENTRY_DSN is present and is a silent no-op
 * when it is not (it is not set in production today). This pins both halves,
 * and the transport's shape, so the day the founder pastes the DSN into
 * Vercel is the day reports start arriving, with nothing else to change.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function load() {
  return import("./report");
}

describe("reportError", () => {
  it("is a silent no-op without SENTRY_DSN: nothing is sent and nothing printed", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { reportError, isReportingConfigured } = await load();
    expect(isReportingConfigured()).toBe(false);
    expect(await reportError({ error: new Error("boom") })).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("posts one envelope to the project's ingest endpoint when SENTRY_DSN is set", async () => {
    vi.stubEnv("SENTRY_DSN", "https://publickey123@o42.ingest.sentry.io/4507");
    vi.stubEnv("VERCEL_ENV", "production");
    const { reportError, isReportingConfigured } = await load();
    expect(isReportingConfigured()).toBe(true);
    expect(await reportError({ error: new Error("the listing page fell over"), context: { kind: "server.request", routePath: "/listing/[id]" } })).toEqual({ sent: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://o42.ingest.sentry.io/api/4507/envelope/?sentry_key=publickey123&sentry_version=7");
    expect(init?.method).toBe("POST");
    const [, itemHeader, event] = String(init?.body).split("\n");
    expect(JSON.parse(itemHeader ?? "{}")).toEqual({ type: "event" });
    const parsed = JSON.parse(event ?? "{}") as { environment: string; tags: Record<string, unknown> };
    expect(parsed.environment).toBe("production");
    expect(parsed.tags.routePath).toBe("/listing/[id]");
  });

  it("does not repeat the same error inside a minute", async () => {
    vi.stubEnv("SENTRY_DSN", "https://k@o1.ingest.sentry.io/1");
    const { reportError } = await load();
    await reportError({ error: new Error("same") });
    expect(await reportError({ error: new Error("same") })).toEqual({ sent: false, reason: "throttled" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never throws when Sentry is unreachable, and never prints the DSN", async () => {
    vi.stubEnv("SENTRY_DSN", "https://secretkey@o1.ingest.sentry.io/1");
    fetchMock.mockImplementationOnce(async () => {
      throw new TypeError("fetch failed");
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { reportError } = await load();
    expect(await reportError({ error: new Error("x") })).toEqual({ sent: false, reason: "transport_failed" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secretkey");
  });

  it("says unparseable, without sending, for a malformed DSN", async () => {
    vi.stubEnv("SENTRY_DSN", "not a dsn");
    const { reportError } = await load();
    expect(await reportError({ error: new Error("x") })).toEqual({ sent: false, reason: "sentry_dsn_unparseable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
