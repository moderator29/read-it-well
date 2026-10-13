import { describe, expect, it, vi } from "vitest";
import { createVisitSubmitter, type VisitChoice, type VisitSubmitDeps } from "./visit-submit";

/**
 * ONE TAP, ONE VISIT, ON THE PHONE'S SIDE: a second call in flight is refused
 * without sending, and a retry of the same choice carries the same tap key,
 * so the server's replay guard answers it with the first result.
 */

const choice: VisitChoice = { listingId: "l-1", mode: "video", kind: "ask", at: "2026-10-14T09:00:00.000Z", note: "  Parking?  " };

function deps(over: Partial<VisitSubmitDeps> = {}) {
  let n = 0;
  const base: VisitSubmitDeps = {
    book: vi.fn(async () => ({ ok: true as const, data: { id: "ix-slot" } })),
    request: vi.fn(async () => ({ ok: true as const, data: { id: "ix-ask" } })),
    sendOrKeep: vi.fn(async (_payload, send) => ({ state: "sent" as const, result: await send() })),
    newKey: () => `key-${++n}`,
  };
  return { ...base, ...over };
}

describe("sending a visit", () => {
  it("files a suggested time through the request action with the mode and a trimmed note", async () => {
    const d = deps();
    const outcome = await createVisitSubmitter(d)(choice);
    expect(outcome).toEqual({ state: "done", id: "ix-ask" });
    expect(d.request).toHaveBeenCalledWith({ listingId: "l-1", when: choice.at, mode: "video", note: "Parking?", tapKey: "key-1" });
    expect(d.book).not.toHaveBeenCalled();
  });

  it("books an open time through the slot action", async () => {
    const d = deps();
    const outcome = await createVisitSubmitter(d)({ ...choice, kind: "slot", note: "" });
    expect(outcome).toEqual({ state: "done", id: "ix-slot" });
    expect(d.book).toHaveBeenCalledWith({ listingId: "l-1", slotAt: choice.at, mode: "video", tapKey: "key-1" });
  });

  it("refuses a second call while the first is in flight", async () => {
    let release: () => void = () => undefined;
    const d = deps({
      request: vi.fn(
        () =>
          new Promise<{ ok: true; data: { id: string } }>((resolve) => {
            release = () => resolve({ ok: true, data: { id: "ix-ask" } });
          }),
      ),
    });
    const submit = createVisitSubmitter(d);
    const first = submit(choice);
    expect(await submit(choice)).toEqual({ state: "busy" });
    release();
    expect(await first).toEqual({ state: "done", id: "ix-ask" });
    expect(d.request).toHaveBeenCalledTimes(1);
  });

  it("retries the same choice with the same tap key, and a new choice with a new one", async () => {
    const keys: string[] = [];
    const answers = [
      { ok: false as const, error: "The connection dropped." },
      { ok: true as const, data: { id: "ix-ask" } },
      { ok: true as const, data: { id: "ix-other" } },
    ];
    const d = deps({
      request: vi.fn(async (input) => {
        keys.push(input.tapKey);
        return answers.shift()!;
      }),
    });
    const submit = createVisitSubmitter(d);
    expect((await submit(choice)).state).toBe("failed");
    expect((await submit(choice)).state).toBe("done");
    await submit({ ...choice, at: "2026-10-14T10:00:00.000Z" });
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it("says a request kept offline, and one the phone could not keep", async () => {
    expect(await createVisitSubmitter(deps({ sendOrKeep: vi.fn(async () => ({ state: "kept" as const, key: "k" })) }))(choice)).toEqual({
      state: "kept",
    });
    expect(await createVisitSubmitter(deps({ sendOrKeep: vi.fn(async () => ({ state: "not_kept" as const })) }))(choice)).toEqual({
      state: "notKept",
    });
  });
});
