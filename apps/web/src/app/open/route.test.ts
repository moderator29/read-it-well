import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * `/open` is the native cold-start path. A GoTrue round trip that never
 * answers must not leave the web view's first navigation hanging: the route
 * answers within OPEN_TIMEOUT_MS from the auth cookie alone. And a request
 * with no auth cookie has nothing for GoTrue to confirm, so it goes to the
 * signed-out start at once, without the round trip.
 */
const AUTH = "sb-abc-auth-token";
const resolveSession = vi.fn();
let cookieNames: string[] = [];

vi.mock("@/lib/actions/session", () => ({ resolveSession: () => resolveSession() }));
vi.mock("@/lib/catalogue/public-access", () => ({ signedOutStart: () => "/welcome" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => cookieNames.map((name) => ({ name, value: "x" })) }),
}));

/* Mirrors the private constant in route.ts; Next allows no extra route exports. */
const OPEN_TIMEOUT_MS = 3000;
const { GET } = await import("./route");

const request = () => new Request("https://vallo.test/open");
const location = (res: Response) => new URL(res.headers.get("location")!).pathname;

describe("/open", () => {
  beforeEach(() => {
    resolveSession.mockReset();
    cookieNames = [];
  });
  afterEach(() => vi.useRealTimers());

  it("sends a resolved session to /home, uncached", async () => {
    cookieNames = [AUTH];
    resolveSession.mockResolvedValue({ state: "signed-in" });
    const res = await GET(request());
    expect(res.status).toBe(307);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(location(res)).toBe("/home");
  });

  it("sends a resolved signed-out caller to the signed-out start", async () => {
    /* A cookie GoTrue no longer honours: the round trip decides. */
    cookieNames = [AUTH];
    resolveSession.mockResolvedValue({ state: "signed-out" });
    expect(location(await GET(request()))).toBe("/welcome");
  });

  it("answers at the deadline from the auth cookie when GoTrue never replies", async () => {
    vi.useFakeTimers();
    resolveSession.mockReturnValue(new Promise(() => {}));
    cookieNames = [AUTH];
    const pending = GET(request());
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS);
    expect(location(await pending)).toBe("/home");
  });

  it("sends a request with no auth cookie to the signed-out start at once, without asking GoTrue", async () => {
    vi.useFakeTimers();
    resolveSession.mockReturnValue(new Promise(() => {}));
    cookieNames = ["vallo-first-run"];
    let settled = false;
    const pending = GET(request()).then((res) => ((settled = true), res));
    /* No timer is advanced: the answer does not wait on the deadline. */
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(true);
    expect(location(await pending)).toBe("/welcome");
    expect(resolveSession).not.toHaveBeenCalled();
  });

  it("also reads a chunked auth cookie as a session to confirm", async () => {
    cookieNames = [`${AUTH}.0`, `${AUTH}.1`];
    resolveSession.mockResolvedValue({ state: "signed-in" });
    expect(location(await GET(request()))).toBe("/home");
    expect(resolveSession).toHaveBeenCalledTimes(1);
  });

  it("with an auth cookie, does not answer before the deadline", async () => {
    vi.useFakeTimers();
    cookieNames = [AUTH];
    resolveSession.mockReturnValue(new Promise(() => {}));
    let settled = false;
    void GET(request()).then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
  });
});
