import { describe, expect, it } from "vitest";
import { asSentence, canForward, forwardTargetsFrom, matchTargets, type ForwardSource } from "./forward";

const row = (id: string, name: string, extra: Partial<ForwardSource> = {}): ForwardSource => ({
  id,
  counterpartName: name,
  listingTitle: null,
  counterpartTier: "none",
  counterpartKind: "member",
  viewerFollows: true,
  ...extra,
});

describe("where a message can be forwarded", () => {
  it("offers only conversations whose other side the reader follows", () => {
    const targets = forwardTargetsFrom(
      [row("a", "Ada"), row("b", "Bola", { viewerFollows: false }), row("c", "Chidi", { viewerFollows: undefined })],
      null,
    );
    expect(targets.map((t) => t.id)).toEqual(["a"]);
  });

  it("never offers the conversation the message came from", () => {
    expect(forwardTargetsFrom([row("a", "Ada"), row("b", "Bola")], "a").map((t) => t.id)).toEqual(["b"]);
  });

  it("carries the name, the subject, the photo and the badge for the row", () => {
    const [t] = forwardTargetsFrom(
      [row("a", "Ada", { listingTitle: "Lekki flat", counterpartAvatarUrl: "https://x.test/a.jpg", counterpartTier: "gold", counterpartKind: "agent" })],
      null,
    );
    expect(t).toEqual({ id: "a", name: "Ada", title: "Lekki flat", avatarUrl: "https://x.test/a.jpg", tier: "gold", kind: "agent" });
  });

  it("searches names and subjects, in any case", () => {
    const targets = forwardTargetsFrom([row("a", "Ada Eze", { listingTitle: "Lekki flat" }), row("b", "Bola")], null);
    expect(matchTargets(targets, "  ada ").map((t) => t.id)).toEqual(["a"]);
    expect(matchTargets(targets, "LEKKI").map((t) => t.id)).toEqual(["a"]);
    expect(matchTargets(targets, "").map((t) => t.id)).toEqual(["a", "b"]);
    expect(matchTargets(targets, "zzz")).toEqual([]);
  });
});

describe("what can be forwarded", () => {
  const text = { id: "m1", body: "See you at ten", imageUrl: null };

  it("is a sent message with words", () => {
    expect(canForward(text)).toBe(true);
  });

  it("is never a photo, a voice note, a file, a card, a call, a deleted or an unsent message", () => {
    expect(canForward({ ...text, imageUrl: "https://x.test/p.jpg" })).toBe(false);
    expect(canForward({ ...text, audio: { url: "a" } })).toBe(false);
    expect(canForward({ ...text, file: { url: "f" } })).toBe(false);
    expect(canForward({ ...text, card: { kind: "listing" } })).toBe(false);
    expect(canForward({ ...text, call: { callId: "c" } })).toBe(false);
    expect(canForward({ ...text, deleted: true })).toBe(false);
    expect(canForward({ ...text, id: "local-1" })).toBe(false);
    expect(canForward({ ...text, state: "failed" })).toBe(false);
    expect(canForward({ ...text, body: "   " })).toBe(false);
  });
});

describe("a refusal", () => {
  it("is the database's sentence, with a capital and a full stop", () => {
    expect(asSentence("you can forward only to people you follow")).toBe("You can forward only to people you follow.");
    expect(asSentence("Already a sentence.")).toBe("Already a sentence.");
  });
});
