import { afterEach, describe, expect, it, vi } from "vitest";
import { deadlineFetch, isDeadlinedCall, PROXY_CUT_PATHS } from "./deadline-fetch";

/**
 * PERF-SWEEP 6: a stalled Supabase read fails after its deadline instead of
 * holding a page on its skeleton, and uploads are never cut.
 */
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** A fetch that never answers until its signal aborts. */
function stalledFetch() {
  return vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason ?? new Error("aborted")));
      }),
  );
}

describe("which calls carry a deadline", () => {
  it("cuts table, RPC, auth and graphql calls on the server client", () => {
    expect(isDeadlinedCall("https://p.supabase.co/rest/v1/listings?select=id")).toBe(true);
    expect(isDeadlinedCall("https://p.supabase.co/rest/v1/rpc/shell_context")).toBe(true);
    expect(isDeadlinedCall("https://p.supabase.co/auth/v1/user")).toBe(true);
    expect(isDeadlinedCall("https://p.supabase.co/graphql/v1")).toBe(true);
  });

  it("never cuts storage uploads or edge functions", () => {
    expect(isDeadlinedCall("https://p.supabase.co/storage/v1/object/photos/a.jpg")).toBe(false);
    expect(isDeadlinedCall("https://p.supabase.co/functions/v1/thing")).toBe(false);
  });

  it("cuts only table reads in the proxy, never auth", () => {
    expect(isDeadlinedCall("https://p.supabase.co/rest/v1/terms_acceptances", PROXY_CUT_PATHS)).toBe(true);
    expect(isDeadlinedCall("https://p.supabase.co/auth/v1/token?grant_type=refresh_token", PROXY_CUT_PATHS)).toBe(false);
  });

  it("does not throw on a URL it cannot parse", () => {
    expect(isDeadlinedCall("not a url")).toBe(false);
  });
});

describe("the deadline", () => {
  it("rejects a stalled read once the deadline passes", async () => {
    const stalled = stalledFetch();
    vi.stubGlobal("fetch", stalled);
    const call = deadlineFetch({ ms: 20 })("https://p.supabase.co/rest/v1/listings", {});
    await expect(call).rejects.toBeTruthy();
    expect(stalled).toHaveBeenCalledTimes(1);
  });

  it("keeps the caller's own signal", async () => {
    const stalled = stalledFetch();
    vi.stubGlobal("fetch", stalled);
    const caller = new AbortController();
    const call = deadlineFetch({ ms: 60_000 })("https://p.supabase.co/rest/v1/listings", { signal: caller.signal });
    caller.abort(new Error("caller gave up"));
    await expect(call).rejects.toThrow("caller gave up");
  });

  it("passes an upload through untouched", async () => {
    const seen: (RequestInit | undefined)[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        seen.push(init);
        return new Response("{}");
      }),
    );
    const init = { method: "POST" };
    await deadlineFetch({ ms: 20 })("https://p.supabase.co/storage/v1/object/a.jpg", init);
    expect(seen[0]).toBe(init);
  });

  it("reads the global fetch at call time, so a later stub still sees the call", async () => {
    const wrapped = deadlineFetch();
    const late = vi.fn(async () => new Response("[]"));
    vi.stubGlobal("fetch", late);
    await wrapped("https://p.supabase.co/rest/v1/listings");
    expect(late).toHaveBeenCalledTimes(1);
  });
});
