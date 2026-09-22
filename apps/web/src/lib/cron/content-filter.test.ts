import { describe, expect, it } from "vitest";
import { contentFilterAlert, readContentFilter, type ContentFilterState } from "./content-filter";
import type { AdminClient } from "./rpc";

/* A stand-in for the one call this module makes. It returns what a PostgREST
   head-count returns, which is `{ count, error }` and no rows. */
function clientReturning(result: { count: number | null; error: unknown }): AdminClient {
  return {
    from: () => ({ select: () => Promise.resolve(result) }),
  } as unknown as AdminClient;
}

describe("the objectionable content filter reports whether it is filtering", () => {
  /*
   * THE FAULT THIS EXISTS FOR, STATED AS A TEST.
   *
   * `private.objectionable_pattern()` is `case when count(*) = 0 then null`,
   * and both scanners skip the abuse branch on null. So an empty table is a
   * filter that accepts everything, silently, while every surface reporting on
   * it says what it would say if the filter were perfect.
   */
  it("calls an empty term list what it is: not filtering", async () => {
    const state = await readContentFilter(clientReturning({ count: 0, error: null }));
    expect(state).toEqual<ContentFilterState>({ terms: 0, reason: "empty" });

    const alert = contentFilterAlert(state);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("critical");
    expect(alert?.kind).toBe("content.filter.empty");
    expect(alert?.detail.filtering).toBe(false);
    // The desk is told it is a submission blocker, not a setting.
    expect(String(alert?.detail.store_risk)).toMatch(/1\.2/);
    // And it is told the fraud half still runs, so nobody over-reads it.
    expect(String(alert?.detail.why)).toMatch(/fraud checks/i);
  });

  it("goes quiet once the list holds terms, because a working filter need not shout", async () => {
    const state = await readContentFilter(clientReturning({ count: 12, error: null }));
    expect(state).toEqual<ContentFilterState>({ terms: 12, reason: null });
    expect(contentFilterAlert(state)).toBeNull();
  });

  /*
   * A READ FAILURE IS NOT AN EMPTY LIST, and collapsing them is how a broken
   * connection starts reading as a policy decision. They get different kinds
   * and the count is null rather than zero.
   */
  it("never reports an unreadable table as an empty one", async () => {
    const state = await readContentFilter(
      clientReturning({ count: null, error: { message: "permission denied" } }),
    );
    expect(state).toEqual<ContentFilterState>({ terms: null, reason: "unreadable" });

    const alert = contentFilterAlert(state);
    expect(alert?.kind).toBe("content.filter.unreadable");
    expect(alert?.detail.terms).toBeNull();
    expect(String(alert?.detail.why)).toMatch(/not the same as the list being empty/i);
  });

  /* A null count with no error is PostgREST saying "no rows", which is zero. */
  it("reads a null count with no error as zero rather than as a failure", async () => {
    const state = await readContentFilter(clientReturning({ count: null, error: null }));
    expect(state.terms).toBe(0);
    expect(state.reason).toBe("empty");
  });
});
