import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { ICON_3D_NAMES, icon3dSrc } from "@/components/ui/icon-3d";
import {
  DONE_FLAGS,
  GLOBAL_DONE_FLAGS,
  SUCCESS_EVENT,
  SUCCESS_OBJECT,
  SUCCESS_VARIANT,
  readDone,
  showSuccess,
  successCopy,
  withDone,
  withoutDone,
  type SuccessMomentId,
} from "./success-moments";

const copy = getDictionary("en").success;
const IDS = Object.keys(copy.moments) as SuccessMomentId[];

describe("the success moments registry", () => {
  it("gives every moment in the dictionary a variant, and names none the dictionary lacks", () => {
    expect(Object.keys(SUCCESS_VARIANT).sort()).toEqual([...IDS].sort());
  });

  it("gives every moment a 3D object whose files exist", () => {
    expect(Object.keys(SUCCESS_OBJECT).sort()).toEqual([...IDS].sort());
    for (const id of IDS) {
      const name = SUCCESS_OBJECT[id];
      expect(ICON_3D_NAMES).toContain(name);
      expect(existsSync(join(__dirname, "../../../public", icon3dSrc(name)))).toBe(true);
      expect(successCopy(copy, id).object).toBe(name);
    }
  });

  it("never draws the seal for a submission: it waits on a person", () => {
    for (const id of IDS) {
      if (SUCCESS_VARIANT[id] === "submitted") expect(SUCCESS_OBJECT[id]).not.toBe("verified");
    }
  });

  it.each(IDS)("%s: has a title and one line, with no exclamation mark", (id) => {
    const words = successCopy(copy, id, { when: "Tue 30 Sep, 10:00", reference: "SUP-123", promise: "We reply today.", name: "The Harbour Kitchen", n: "3", place: "Flat 2, Yaba" });
    expect(words.title.length).toBeGreaterThan(0);
    expect(words.body.length).toBeGreaterThan(0);
    expect(`${words.title} ${words.body}`).not.toMatch(/!|\{[a-z]+\}/);
  });

  it("never claims a request is booked, or a review decided", () => {
    for (const id of IDS.filter((i) => SUCCESS_VARIANT[i] === "submitted")) {
      const { title, body } = successCopy(copy, id);
      /* The headline never claims the decision; the line may name what
         happens next ("payment opens once it is approved") but never that a
         booking or a refund has happened. */
      expect(title, id).not.toMatch(/\b(booked|approved|confirmed|refunded|paid)\b/i);
      expect(body, id).not.toMatch(/\b(booked|refunded)\b/i);
    }
  });

  it("has no moment for a pending or unknown payment: those keep the confirming sheet", () => {
    for (const id of IDS) expect(id).not.toMatch(/pending|processing|confirming|unknown/i);
  });

  it("points every flag at a moment that exists", () => {
    for (const moment of Object.values(DONE_FLAGS)) expect(IDS).toContain(moment);
  });
});

describe("the one-shot flag", () => {
  it("adds the flag and its companions, keeping the query and the hash", () => {
    expect(withDone("/agent/listings", "listing-live", { listing: "abc" })).toBe("/agent/listings?done=listing-live&listing=abc");
    expect(withDone("/bookings?side=stays#ix-1", "agreement-drawn")).toBe("/bookings?side=stays&done=agreement-drawn#ix-1");
  });

  it("never writes an account flag into an address: those ride on the server's cookie", () => {
    expect(withDone("/home", "password-changed")).toBe("/home");
    expect(withDone("/listing/1?x=1", "account-created")).toBe("/listing/1?x=1");
  });

  it("strips the flag and the companions it names, and nothing else", () => {
    expect(withoutDone("/agent/listings?q=yaba&done=listing-live&listing=abc", ["listing"])).toBe("/agent/listings?q=yaba");
    expect(withoutDone("/checkout/b1?paid=1&reference=rm-book-x", ["paid", "reference"])).toBe("/checkout/b1");
    expect(withoutDone("/home?done=password-changed#top")).toBe("/home#top");
  });

  it("reads only flags it knows", () => {
    expect(readDone("agreement-drawn")).toBe("agreement-drawn");
    expect(readDone(["listing-live", "x"])).toBe("listing-live");
    expect(readDone("paid")).toBeNull();
    expect(readDone("__proto__")).toBeNull();
    expect(readDone(undefined)).toBeNull();
  });
});

describe("showSuccess, the account moments' doorway", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("dispatches a global moment and refuses a record's moment", () => {
    const seen: unknown[] = [];
    const target = new EventTarget();
    target.addEventListener(SUCCESS_EVENT, (event) => seen.push((event as CustomEvent).detail));
    vi.stubGlobal("window", target);
    showSuccess("passcode-set");
    /* The type refuses it too; the runtime guard is what is under test. */
    showSuccess("agreement-drawn" as never);
    expect(seen).toEqual([{ flag: "passcode-set" }]);
    expect(GLOBAL_DONE_FLAGS as readonly string[]).not.toContain("agreement-drawn");
  });
});
