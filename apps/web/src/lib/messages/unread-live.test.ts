import { describe, expect, it } from "vitest";
import { unreadConversationCount } from "./unread-live";

describe("the dock's unread-conversations figure", () => {
  it("counts conversations, not messages", () => {
    expect(
      unreadConversationCount([
        { conversation_id: "a", unread: 5 },
        { conversation_id: "b", unread: 1 },
      ]),
    ).toBe(2);
  });

  it("skips zero, malformed and missing rows", () => {
    expect(
      unreadConversationCount([
        { conversation_id: "a", unread: 0 },
        { conversation_id: null, unread: 3 },
        { conversation_id: "c", unread: "x" },
      ]),
    ).toBe(0);
    expect(unreadConversationCount(null)).toBe(0);
  });
});
