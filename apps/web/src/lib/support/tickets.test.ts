import { describe, expect, it } from "vitest";
import {
  canMemberReply,
  isTicketId,
  orderThread,
  previewText,
  summariseThread,
  ticketStatusCopy,
  type TicketMessage,
} from "./tickets";

const msg = (id: string, senderRole: "user" | "admin", createdAt: string, body = id): TicketMessage => ({
  id,
  senderRole,
  body,
  createdAt,
});

describe("a member's ticket thread", () => {
  it("knows who spoke last whatever order the rows arrive in", () => {
    const rows = [
      msg("b", "admin", "2026-09-02T10:00:00Z"),
      msg("a", "user", "2026-09-01T10:00:00Z"),
      msg("c", "user", "2026-09-01T12:00:00Z"),
    ];
    const summary = summariseThread(rows);
    expect(summary.last?.id).toBe("b");
    expect(summary.supportReplies).toBe(1);
    expect(summary.supportSpokeLast).toBe(true);
    expect(orderThread(rows).map((m) => m.id)).toEqual(["a", "c", "b"]);
  });

  it("an empty thread has no last word and nothing from support", () => {
    expect(summariseThread([])).toEqual({ last: null, supportReplies: 0, supportSpokeLast: false });
  });

  it("takes a reply only while a person is still working the ticket", () => {
    expect(canMemberReply("open")).toBe(true);
    expect(canMemberReply("pending")).toBe(true);
    expect(canMemberReply("resolved")).toBe(false);
    expect(canMemberReply("closed")).toBe(false);
    expect(canMemberReply("anything")).toBe(false);
  });

  it("names every status in words, and an unknown one as itself", () => {
    expect(ticketStatusCopy("pending").label).toBe("In progress");
    expect(ticketStatusCopy("mystery")).toEqual({ label: "mystery", tone: "neutral", meaning: "" });
  });

  it("previews one line, cut at a word", () => {
    expect(previewText("  short\n\nline ")).toBe("short line");
    const long = "word ".repeat(40);
    const out = previewText(long, 30);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(31);
    expect(out).not.toMatch(/\s…$/);
  });

  it("only lets a uuid through as a ticket id", () => {
    expect(isTicketId("3f2b8c1e-9a4d-4c2e-8f1a-0b9c8d7e6f5a")).toBe(true);
    expect(isTicketId("VAL-SUP-00001")).toBe(false);
    expect(isTicketId("3f2b8c1e-9a4d-4c2e-8f1a-0b9c8d7e6f5a' or 1=1")).toBe(false);
  });
});
