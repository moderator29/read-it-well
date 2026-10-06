import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/* D60/D61: the front door's time to interactive, measured the way Lighthouse
   defines it, on Lighthouse's mobile device and link. */
const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
type Span = [number, number];
type Gate = {
  timeToInteractive: (s: { fcp: number; longTasks: Span[]; requests: Span[]; now: number }) => number | null;
  totalBlockingTime: (longTasks: Span[], from: number, to: number) => number;
  NETWORK: { latency: number; downloadThroughput: number; uploadThroughput: number };
  CPU_SLOWDOWN: number;
};
let gate: Gate;
beforeAll(async () => {
  gate = (await import(/* @vite-ignore */ pathToFileURL(join(WEB, "scripts", "check-tti.mjs")).href)) as Gate;
});

describe("time to interactive (D60/D61)", () => {
  it("is first contentful paint when nothing blocks and the network is quiet", () => {
    expect(gate.timeToInteractive({ fcp: 800, longTasks: [], requests: [[0, 700]], now: 6_000 })).toBe(800);
  });

  it("is the end of the last long task before the first five quiet seconds", () => {
    const longTasks: Span[] = [
      [900, 1_100],
      [2_000, 2_300],
      [9_000, 9_060],
    ];
    expect(gate.timeToInteractive({ fcp: 800, longTasks, requests: [], now: 20_000 })).toBe(2_300);
  });

  it("waits out more than two requests in flight", () => {
    const requests: Span[] = [
      [500, 4_000],
      [600, 4_000],
      [700, 4_000],
    ];
    expect(gate.timeToInteractive({ fcp: 800, longTasks: [[900, 1_000]], requests, now: 20_000 })).toBe(1_000);
    expect(gate.timeToInteractive({ fcp: 800, longTasks: [[900, 1_000], [3_000, 3_200]], requests, now: 20_000 })).toBe(3_200);
  });

  it("does not answer before a quiet window has fully passed", () => {
    expect(gate.timeToInteractive({ fcp: 800, longTasks: [[900, 1_000]], requests: [], now: 5_000 })).toBeNull();
  });

  it("counts only each long task's time beyond 50 ms, inside the window", () => {
    expect(gate.totalBlockingTime([[0, 120], [1_000, 1_040], [2_000, 2_200]], 50, 2_100)).toBe(20 + 50);
  });

  it("throttles to Lighthouse's mobile defaults: 4x CPU and Slow 4G at request level", () => {
    expect(gate.CPU_SLOWDOWN).toBe(4);
    expect(gate.NETWORK.latency).toBe(562.5);
    expect(gate.NETWORK.downloadThroughput).toBe(Math.floor((1.6 * 1024 * 1024 * 0.9) / 8));
    expect(gate.NETWORK.uploadThroughput).toBe(Math.floor((750 * 1024 * 0.9) / 8));
  });
});
