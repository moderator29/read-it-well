import { describe, expect, it } from "vitest";
import {
  REOPEN_DAYS,
  canMemberReply,
  canRate,
  expectedResponse,
  hasUnread,
  isTicketId,
  memberStateCopy,
  memberTicketState,
  reopenWindow,
  staffByline,
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
    expect(summariseThread([])).toEqual({ last: null, supportReplies: 0, supportSpokeLast: false, lastSupportAt: null });
  });

  it("remembers when support last wrote, even when the member spoke after", () => {
    const rows = [
      msg("a", "admin", "2026-09-01T10:00:00Z"),
      msg("b", "admin", "2026-09-02T10:00:00Z"),
      msg("c", "user", "2026-09-03T10:00:00Z"),
    ];
    const summary = summariseThread(rows);
    expect(summary.lastSupportAt).toBe("2026-09-02T10:00:00Z");
    expect(summary.supportSpokeLast).toBe(false);
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

  it("says whose move it is in the four member states", () => {
    expect(memberTicketState("open", false)).toBe("open");
    expect(memberTicketState("pending", false)).toBe("progress");
    expect(memberTicketState("pending", true)).toBe("waiting");
    expect(memberTicketState("open", true)).toBe("waiting");
    expect(memberTicketState("resolved", true)).toBe("resolved");
    expect(memberTicketState("closed", false)).toBe("resolved");
    expect(memberStateCopy("pending", true).label).toBe("Waiting on you");
    expect(memberStateCopy("closed", false).label).toBe("Resolved");
    expect(memberStateCopy("closed", false).meaning).toMatch(/Closed by the team/);
  });

  it("counts a staff reply as unread until the member opens the thread after it", () => {
    expect(hasUnread(null, null)).toBe(false);
    expect(hasUnread("2026-09-02T10:00:00Z", null)).toBe(true);
    expect(hasUnread("2026-09-02T10:00:00Z", "2026-09-02T09:00:00Z")).toBe(true);
    expect(hasUnread("2026-09-02T10:00:00Z", "2026-09-02T11:00:00Z")).toBe(false);
  });

  it("reopens only a resolved ticket, and only for fourteen days", () => {
    const resolved = "2026-09-01T10:00:00Z";
    const at = (days: number) => Date.parse(resolved) + days * 86_400_000;
    expect(REOPEN_DAYS).toBe(14);
    expect(reopenWindow("resolved", resolved, at(13)).open).toBe(true);
    expect(reopenWindow("resolved", resolved, at(15)).open).toBe(false);
    expect(reopenWindow("closed", resolved, at(1)).open).toBe(false);
    expect(reopenWindow("resolved", null, at(1)).open).toBe(false);
    const window = reopenWindow("resolved", resolved, at(1));
    expect(window.open && window.until).toBe("2026-09-15T10:00:00.000Z");
  });

  it("rates only a finished ticket", () => {
    expect(canRate("resolved")).toBe(true);
    expect(canRate("closed")).toBe(true);
    expect(canRate("open")).toBe(false);
    expect(canRate("pending")).toBe(false);
  });

  it("names staff by first name only", () => {
    expect(staffByline("Amaka Obi")).toBe("Amaka, Vallo support");
    expect(staffByline(" Tunde ")).toBe("Tunde, Vallo support");
    expect(staffByline(null)).toBe("Vallo support");
    expect(staffByline("")).toBe("Vallo support");
  });

  it("promises the clock /standards publishes for the topic", () => {
    expect(expectedResponse("safety")).toBe("A person replies within 4 hours.");
    expect(expectedResponse("payment")).toBe("A person replies within 1 day.");
    expect(expectedResponse("verification")).toBe("A person replies within 3 days.");
    expect(expectedResponse(null)).toBe("A person replies within 1 day.");
  });

  it("only lets a uuid through as a ticket id", () => {
    expect(isTicketId("3f2b8c1e-9a4d-4c2e-8f1a-0b9c8d7e6f5a")).toBe(true);
    expect(isTicketId("VAL-SUP-00001")).toBe(false);
    expect(isTicketId("3f2b8c1e-9a4d-4c2e-8f1a-0b9c8d7e6f5a' or 1=1")).toBe(false);
  });
});
