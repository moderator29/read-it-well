import { describe, expect, it } from "vitest";
import { SUPPORT_TOPICS } from "../trust/support-topics";
import {
  DESCRIPTION_MAX,
  EMPTY_DRAFT,
  TOPIC_CHOICES,
  chatTranscript,
  draftErrors,
  parseDraft,
  recordsForTopic,
  type RelatedRecord,
} from "./new-query";

const RECORDS: RelatedRecord[] = [
  { kind: "booking", id: "b1", label: "Booking one" },
  { kind: "payment", id: "p1", label: "Payment one" },
  { kind: "listing", id: "l1", label: "Listing one" },
  { kind: "agreement", id: "g1", label: "Agreement one" },
];

describe("the new query's topics", () => {
  it("offers every stored topic code exactly once, and nothing the queue does not know", () => {
    const codes = TOPIC_CHOICES.map((t) => t.code);
    expect([...codes].sort()).toEqual([...SUPPORT_TOPICS].sort());
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("covers the nine topics the product asks for", () => {
    for (const code of ["account", "verification", "listing", "payment", "inspection", "agreement", "booking", "safety", "other"]) {
      expect(TOPIC_CHOICES.some((t) => t.code === code)).toBe(true);
    }
  });

  it("offers only the records a topic can be about, in the topic's order", () => {
    expect(recordsForTopic("payment", RECORDS).map((r) => r.kind)).toEqual(["payment", "booking", "agreement"]);
    expect(recordsForTopic("listing", RECORDS).map((r) => r.id)).toEqual(["l1"]);
    expect(recordsForTopic("account", RECORDS)).toEqual([]);
    expect(recordsForTopic(null, RECORDS)).toEqual([]);
  });
});

describe("a draft", () => {
  it("needs a topic and at least a sentence", () => {
    expect(draftErrors(EMPTY_DRAFT)).toEqual({
      topic: "Choose what it is about.",
      body: "Tell us a little more, at least a sentence.",
    });
    expect(draftErrors({ ...EMPTY_DRAFT, topic: "payment", body: "My refund has not arrived yet." })).toEqual({});
    expect(draftErrors({ ...EMPTY_DRAFT, topic: "payment", body: "x".repeat(DESCRIPTION_MAX + 1) }).body).toMatch(/4,000/);
  });

  it("refuses a topic code nobody offered", () => {
    expect(draftErrors({ ...EMPTY_DRAFT, topic: "wallet" as never, body: "A whole sentence here." }).topic).toBeDefined();
  });

  it("reads back only what it trusts from this device", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft('"a string"')).toBeNull();
    const back = parseDraft(
      JSON.stringify({
        kind: "problem",
        topic: "payment",
        body: "Kept",
        related: { kind: "payment", id: "p1", label: "Payment one" },
      }),
    );
    expect(back).toEqual({ kind: "problem", topic: "payment", body: "Kept", related: { kind: "payment", id: "p1", label: "Payment one" } });
    const bad = parseDraft(JSON.stringify({ kind: "shout", topic: "wallet", body: 7, related: { kind: "wallet", id: 1 } }));
    expect(bad).toEqual({ kind: "question", topic: null, body: "", related: null });
  });
});

describe("the hand-over transcript", () => {
  it("carries every turn, oldest first, labelled", () => {
    const text = chatTranscript([
      { role: "user", text: "Where is my refund?" },
      { role: "assistant", text: "Refunds take 3 to 5 working days." },
      { role: "user", text: "  " },
      { role: "user", text: "I would like to talk to a person." },
    ]);
    expect(text).toBe(
      [
        "Conversation with the AI helper before this ticket:",
        "Member: Where is my refund?",
        "AI helper: Refunds take 3 to 5 working days.",
        "Member: I would like to talk to a person.",
      ].join("\n"),
    );
  });

  it("drops the oldest turns first when it is too long, and says so", () => {
    const turns = Array.from({ length: 50 }, (_, i) => ({ role: "user" as const, text: `Turn ${i} ${"x".repeat(100)}` }));
    const text = chatTranscript(turns, 1000);
    expect(text.length).toBeLessThanOrEqual(1000);
    expect(text).toContain("Earlier messages left out for length.");
    expect(text).toContain("Turn 49");
    expect(text).not.toContain("Turn 0 ");
  });

  it("says plainly when nothing was typed", () => {
    expect(chatTranscript([])).toMatch(/before writing anything/);
  });
});
