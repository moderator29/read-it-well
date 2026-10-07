import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * `/open` is the native cold-start path. A GoTrue round trip that never
 * answers must not leave the web view's first navigation hanging: the route
 * answers within OPEN_TIMEOUT_MS from the auth cookie alone.
 */
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
    resolveSession.mockResolvedValue({ state: "signed-in" });
    const res = await GET(request());
    expect(res.status).toBe(307);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(location(res)).toBe("/home");
  });

  it("sends a resolved signed-out caller to the signed-out start", async () => {
    resolveSession.mockResolvedValue({ state: "signed-out" });
    expect(location(await GET(request()))).toBe("/welcome");
  });

  it("answers at the deadline from the auth cookie when GoTrue never replies", async () => {
    vi.useFakeTimers();
    resolveSession.mockReturnValue(new Promise(() => {}));
    cookieNames = ["sb-abc-auth-token"];
    const pending = GET(request());
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS);
    expect(location(await pending)).toBe("/home");
  });

  it("guesses signed-out at the deadline with no auth cookie", async () => {
    vi.useFakeTimers();
    resolveSession.mockReturnValue(new Promise(() => {}));
    cookieNames = ["vallo-first-run"];
    const pending = GET(request());
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS);
    expect(location(await pending)).toBe("/welcome");
  });

  it("does not answer before the deadline", async () => {
    vi.useFakeTimers();
    resolveSession.mockReturnValue(new Promise(() => {}));
    let settled = false;
    void GET(request()).then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(OPEN_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
  });
});
