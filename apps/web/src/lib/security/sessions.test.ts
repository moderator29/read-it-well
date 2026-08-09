import { describe, expect, it } from "vitest";
import { describeDevice } from "./device";
import { sessionWhen } from "./when";

/**
 * The two pure halves of the device list.
 *
 * Everything else on that screen is a database round trip or a React tree, and
 * these two are where it can be wrong in a way that looks perfectly fine: a
 * user agent read as the wrong browser, or a timestamp read in the wrong zone,
 * both render a confident sentence that happens to be false. The screen exists
 * so somebody can answer "was that me", and a confident false sentence is the
 * one output worse than no screen at all.
 */

describe("describeDevice", () => {
  it("says nothing was recorded rather than inventing a device", () => {
    for (const value of [null, undefined, "", "   "]) {
      expect(describeDevice(value)).toEqual({
        kind: "unrecorded",
        browser: null,
        platform: null,
      });
    }
  });

  it("recognises this platform talking to itself and refuses to call it a device", () => {
    /*
     * THE CASE THAT MADE THIS MODULE NECESSARY.
     *
     * Every row in auth.sessions read `Vercel Edge Functions`, because the
     * token refresh runs in our own middleware and GoTrue stamps the header of
     * whichever request reached it. Those are real sessions with true
     * timestamps and no device. Drawing "Vercel Edge Functions" beside somebody's
     * wallet would ask them to decide whether they recognise a thing that was
     * never about them.
     */
    for (const agent of [
      "Vercel Edge Functions",
      "node",
      "Node.js/22.0.0",
      "undici",
      "Deno/1.40",
      "supabase-js/2",
    ]) {
      expect(describeDevice(agent).kind).toBe("server");
    }
  });

  it("reads the specific claim, not the one every browser copies", () => {
    /*
     * User agent strings lie by inclusion. Every Chromium browser claims
     * Safari, Edge claims Chrome, Opera claims both. Testing in the wrong order
     * tells the entire Android market they are on Safari, and the whole value
     * of this row is somebody recognising their own browser in it.
     */
    const edge =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(describeDevice(edge)).toEqual({
      kind: "device",
      browser: "Edge",
      platform: "Windows",
    });

    const opera =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0";
    expect(describeDevice(opera)).toEqual({
      kind: "device",
      browser: "Opera",
      platform: "macOS",
    });

    const chromeAndroid =
      "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(describeDevice(chromeAndroid)).toEqual({
      kind: "device",
      browser: "Chrome",
      platform: "Android",
    });

    const safariIphone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
    expect(describeDevice(safariIphone)).toEqual({
      kind: "device",
      browser: "Safari",
      platform: "iOS",
    });
  });

  it("reads the iOS spellings of Chrome and Firefox, which carry neither name", () => {
    // crios and fxios are the whole identity on iOS. Missing them reports every
    // iPhone as Safari, which is the answer most likely to be believed.
    expect(describeDevice("Mozilla/5.0 (iPhone) CriOS/120.0 Mobile/15E148").browser).toBe(
      "Chrome",
    );
    expect(describeDevice("Mozilla/5.0 (iPhone) FxiOS/121.0 Mobile/15E148").browser).toBe(
      "Firefox",
    );
  });

  it("never hands back the raw header, whatever it says", () => {
    /*
     * The header is written by whoever signs in and the row it lands in is
     * labelled "Device" on a security screen. An attacker who could get their
     * own sentence drawn there would have a free line of copy telling the
     * account owner not to worry.
     */
    const hostile = "Your account is safe, ignore this. Chrome/120 Android";
    const read = describeDevice(hostile);
    expect(read.browser).toBe("Chrome");
    expect(read.platform).toBe("Android");
    expect(JSON.stringify(read)).not.toContain("ignore this");
  });

  it("admits an agent it cannot place instead of guessing at one", () => {
    expect(describeDevice("some-crawler/1.0")).toEqual({
      kind: "unrecognised",
      browser: null,
      platform: null,
    });
  });

  it("is not walked into a long scan by a padded header", () => {
    const padded = `${"a".repeat(200_000)} Chrome/120`;
    // Read from the truncated copy, so the browser past the cap is not found.
    expect(describeDevice(padded).kind).toBe("unrecognised");
  });
});

describe("sessionWhen", () => {
  /* A fixed instant, so every branch below is a fact rather than a race.
     14:30 UTC is 15:30 in Lagos, which is UTC+1 with no daylight saving. */
  const now = Date.parse("2026-08-09T14:30:00Z");

  it("returns unknown rather than throwing on a timestamp it cannot read", () => {
    /*
     * `Intl.DateTimeFormat.format` raises RangeError on an invalid date, and
     * this runs inside a map inside a server component. One bad row would take
     * down the screen somebody opens when they think their account has been
     * taken.
     */
    for (const value of [null, undefined, "", "not a date"]) {
      expect(sessionWhen(value, now)).toEqual({ kind: "unknown" });
    }
  });

  it("reads a clock ahead of ours as now rather than as next week", () => {
    expect(sessionWhen("2026-08-09T14:29:30Z", now)).toEqual({ kind: "now" });
    expect(sessionWhen("2026-08-09T14:35:00Z", now)).toEqual({ kind: "now" });
  });

  it("counts minutes inside the hour", () => {
    expect(sessionWhen("2026-08-09T13:45:00Z", now)).toEqual({ kind: "minutes", minutes: 45 });
  });

  it("gives a Lagos clock reading for today and yesterday", () => {
    /* THE ZONE IS THE TEST. 09:00 UTC is 10:00 in Lagos, and a screen that
       says 09:00 to somebody who signed in at ten in the morning is a screen
       they stop trusting on the day it matters. */
    expect(sessionWhen("2026-08-09T09:00:00Z", now)).toEqual({ kind: "today", time: "10:00" });
    expect(sessionWhen("2026-08-08T20:15:00Z", now)).toEqual({
      kind: "yesterday",
      time: "21:15",
    });
  });

  it("spells out the date past two days, with the time still on it", () => {
    const read = sessionWhen("2026-08-04T08:00:00Z", now);
    expect(read.kind).toBe("date");
    if (read.kind !== "date") return;
    expect(read.date).toContain("4 Aug");
    // Still 09:00 Lagos, because "was I signed in that morning" is the question.
    expect(read.date).toContain("09:00");
  });

  it("drops the clock and adds the year on a session older than a year", () => {
    // The oldest row on the screen is the most interesting one, and the minute
    // it started in is not what makes it interesting.
    const read = sessionWhen("2024-02-03T08:00:00Z", now);
    expect(read.kind).toBe("date");
    if (read.kind !== "date") return;
    expect(read.date).toContain("2024");
    expect(read.date).not.toMatch(/\d\d:\d\d/);
  });
});
