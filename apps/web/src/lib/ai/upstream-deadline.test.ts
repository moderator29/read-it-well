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

async function readUntilStopped(signal: AbortSignal, onEvent?: () => void): Promise<string> {
  const res = await fetch(url, { signal });
  const reader = res.body!.getReader();
  try {
    for (;;) {
      const { done } = await reader.read();
      if (done) return "ended";
      onEvent?.();
    }
  } catch (error) {
    return (error as Error).name;
  }
}

describe("upstream deadlines", () => {
  it("cuts a round that goes quiet", async () => {
    const watchdog = roundWatchdog(new AbortController().signal, 80);
    const started = Date.now();
    const outcome = await readUntilStopped(watchdog.signal, () => watchdog.touch());
    watchdog.done();
    expect(outcome).not.toBe("ended");
    // The stalled server never ends the stream; only the cut can. The bound
    // is far above the 80 ms cut so a loaded runner cannot flake it.
    expect(Date.now() - started).toBeLessThan(20_000);
  });

  it("cuts a request that runs past its total budget", async () => {
    const started = Date.now();
    const outcome = await readUntilStopped(requestSignal(new AbortController().signal, 100));
    expect(outcome).not.toBe("ended");
    expect(Date.now() - started).toBeLessThan(20_000);
  });

  it("still ends when the visitor leaves", async () => {
    const client = new AbortController();
    setTimeout(() => client.abort(), 50);
    expect(await readUntilStopped(requestSignal(client.signal, 60_000))).not.toBe("ended");
  });

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
