import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requestSignal, roundWatchdog } from "./upstream-deadline";

/**
 * OPS-18: a streamed model call that stalls with its socket open is cut, by
 * the request's total budget or by a round going quiet, instead of holding
 * the function to the platform limit.
 */
let server: Server;
let url = "";
beforeAll(async () => {
  // Answers with headers and one event, then says nothing more: a stalled upstream.
  server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write('data: {"type":"ping"}\n\n');
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

/**
 * A clock advanced by hand. The deadlines take it in place of the real one,
 * so each cut is proved at an exact tick: nothing at the tick before, the
 * abort at the tick itself. There is no wall-clock bound to lose on a busy
 * machine, and a deadline that ignored its clock would never fire here.
 */
function handClock() {
  let now = 0;
  let next = 0;
  const pending = new Map<number, { at: number; run: () => void }>();
  return {
    timers: {
      setTimeout: (run: () => void, ms: number) => {
        next += 1;
        pending.set(next, { at: now + ms, run });
        return next;
      },
      clearTimeout: (handle: unknown) => {
        pending.delete(handle as number);
      },
    },
    advance(ms: number) {
      now += ms;
      for (const [handle, timer] of [...pending]) {
        if (timer.at <= now) {
          pending.delete(handle);
          timer.run();
        }
      }
    },
    get pending() {
      return pending.size;
    },
  };
}

/**
 * Read the stalled response until it stops. `firstEvent` settles once the
 * one event the server sends has been read, so the test acts only after the
 * stream is open and waiting.
 */
function readUntilStopped(signal: AbortSignal, onEvent?: () => void) {
  let seen: () => void = () => undefined;
  const firstEvent = new Promise<void>((resolve) => {
    seen = resolve;
  });
  const outcome = (async () => {
    const res = await fetch(url, { signal });
    const reader = res.body!.getReader();
    try {
      for (;;) {
        const { done } = await reader.read();
        if (done) return "ended";
        onEvent?.();
        seen();
      }
    } catch (error) {
      return (error as Error).name;
    }
  })();
  return { firstEvent, outcome };
}

describe("upstream deadlines", () => {
  it("cuts a round that goes quiet, at the idle limit and not before", async () => {
    const clock = handClock();
    const watchdog = roundWatchdog(new AbortController().signal, 15_000, clock.timers);
    const read = readUntilStopped(watchdog.signal, () => watchdog.touch());
    await read.firstEvent;
    clock.advance(14_999);
    expect(watchdog.signal.aborted).toBe(false);
    clock.advance(1);
    expect(watchdog.signal.aborted).toBe(true);
    expect((watchdog.signal.reason as Error).message).toBe("upstream went quiet");
    expect(await read.outcome).not.toBe("ended");
    watchdog.done();
    expect(clock.pending).toBe(0);
  }, 10_000);

  it("re-arms on every event, so a slow but live stream is not cut", async () => {
    const clock = handClock();
    const watchdog = roundWatchdog(new AbortController().signal, 15_000, clock.timers);
    clock.advance(10_000);
    watchdog.touch();
    clock.advance(10_000);
    expect(watchdog.signal.aborted).toBe(false);
    expect(clock.pending).toBe(1);
    watchdog.done();
    expect(clock.pending).toBe(0);
  });

  it("cuts a request that runs past its total budget, at the budget and not before", async () => {
    const clock = handClock();
    const signal = requestSignal(new AbortController().signal, 50_000, clock.timers);
    const read = readUntilStopped(signal);
    await read.firstEvent;
    clock.advance(49_999);
    expect(signal.aborted).toBe(false);
    clock.advance(1);
    expect(signal.aborted).toBe(true);
    expect(await read.outcome).not.toBe("ended");
  }, 10_000);

  it("still ends when the visitor leaves", async () => {
    const client = new AbortController();
    const signal = requestSignal(client.signal, 50_000, handClock().timers);
    const read = readUntilStopped(signal);
    await read.firstEvent;
    client.abort();
    expect(await read.outcome).not.toBe("ended");
  }, 10_000);

  it("is what both model routes use", () => {
    for (const route of ["assistant", "support"]) {
      const src = readFileSync(join(__dirname, "..", "..", "app", "api", route, "route.ts"), "utf8");
      expect(src, route).toContain("export const maxDuration = 60;");
      expect(src, route).toContain("const upstream = requestSignal(req.signal);");
      expect(src, route).toContain("signal: watchdog.signal,");
      expect(src, route).toContain("watchdog.touch();");
      expect(src, route).not.toMatch(/streamOneRound\([^)]*req\.signal/);
    }
  });
});
